import mimetypes
from pathlib import Path
from typing import AsyncIterator

import aiofiles
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, StreamingResponse

from ..services.job_registry import get_job
from ..services.s3_media import generate_presigned_url, is_s3_path, parse_s3_url

router = APIRouter()

CHUNK_SIZE = 1024 * 1024  # 1 MB


def _resolve_media_path(job_id: str, rel_path: str) -> Path:
    """Resolve and validate a media path under the job's data_dir."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    data_dir = Path(job.spec.data_dir).resolve()
    target = (data_dir / rel_path).resolve()

    # Reject path traversal attempts
    if not str(target).startswith(str(data_dir)):
        raise HTTPException(status_code=403, detail="Path traversal rejected")

    if not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return target


def _guess_mime(path: Path) -> str:
    mime, _ = mimetypes.guess_type(str(path))
    return mime or "application/octet-stream"


async def _iter_file(path: Path, start: int, length: int) -> AsyncIterator[bytes]:
    async with aiofiles.open(path, "rb") as f:
        await f.seek(start)
        remaining = length
        while remaining > 0:
            chunk = await f.read(min(CHUNK_SIZE, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk


@router.get("/media/{job_id}/{path:path}")
async def serve_media(job_id: str, path: str, request: Request):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # S3 jobs: generate a presigned URL and redirect — no proxying needed.
    # Each request gets a fresh short-lived URL (lazy, one file at a time).
    if is_s3_path(job.spec.data_dir):
        bucket, prefix = parse_s3_url(job.spec.data_dir)
        try:
            presigned = generate_presigned_url(bucket, prefix, path)
        except RuntimeError as exc:
            raise HTTPException(status_code=502, detail=str(exc))
        return RedirectResponse(url=presigned, status_code=307)

    file_path = _resolve_media_path(job_id, path)
    file_size = file_path.stat().st_size
    mime = _guess_mime(file_path)

    range_header = request.headers.get("range")

    if range_header:
        # Parse "bytes=<start>-<end>" — only single ranges are supported (sufficient for HTML5 video)
        try:
            range_val = range_header.strip().removeprefix("bytes=")
            start_str, _, end_str = range_val.partition("-")
            start = int(start_str) if start_str else 0
            end = int(end_str) if end_str else file_size - 1
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Range header")

        end = min(end, file_size - 1)

        if start < 0 or start > end:
            raise HTTPException(
                status_code=416,
                detail="Range not satisfiable",
                headers={"Content-Range": f"bytes */{file_size}"},
            )

        content_length = end - start + 1

        return StreamingResponse(
            _iter_file(file_path, start, content_length),
            status_code=206,
            media_type=mime,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
            },
        )

    # Full-file response
    return StreamingResponse(
        _iter_file(file_path, 0, file_size),
        media_type=mime,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
        },
    )
