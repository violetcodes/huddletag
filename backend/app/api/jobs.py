import io
import os
import re
import shutil
import tempfile
import zipfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..core.config import settings
from ..core.database import get_db
from ..services.job_registry import get_all_jobs, get_job

router = APIRouter()

MAX_ZIP_BYTES = 10 * 1024 * 1024 * 1024  # 10 GiB
_SAFE_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_\-]*$")


class JobSummary(BaseModel):
    job_id: str
    item_count: int
    annotated_count: int


@router.get("/jobs", response_model=list[JobSummary])
def list_jobs() -> list[JobSummary]:
    jobs = get_all_jobs()
    result: list[JobSummary] = []
    db = get_db()
    try:
        for job in jobs:
            row = db.execute(
                "SELECT COUNT(*) FROM annotations WHERE job_id = ?",
                (job.job_id,),
            ).fetchone()
            annotated_count: int = row[0] if row else 0
            result.append(
                JobSummary(
                    job_id=job.job_id,
                    item_count=len(job.items),
                    annotated_count=annotated_count,
                )
            )
    finally:
        db.close()
    return result


# ---------------------------------------------------------------------------
# Job upload
# ---------------------------------------------------------------------------

class UploadResult(BaseModel):
    job_id: str
    item_count: int
    size_bytes: int


def _sanitize_job_name(raw: str) -> str:
    """Replace non-safe characters and strip leading/trailing hyphens."""
    name = re.sub(r"[^A-Za-z0-9_\-]", "-", raw).strip("-")
    # Collapse multiple consecutive hyphens
    name = re.sub(r"-{2,}", "-", name)
    return name


def _extract_zip(zf: zipfile.ZipFile, zip_prefix: str, dest_dir: Path) -> None:
    """Extract members of *zf* that live under *zip_prefix* into *dest_dir*.

    Performs a zip-slip guard: any entry whose resolved path escapes dest_dir
    raises HTTPException 400.
    """
    dest_resolved = str(dest_dir.resolve())
    for member in zf.infolist():
        if not member.filename.startswith(zip_prefix):
            continue
        rel = member.filename[len(zip_prefix):]
        if not rel:
            continue  # directory entry for the prefix itself
        target = (dest_dir / rel).resolve()
        if not str(target).startswith(dest_resolved + os.sep) and str(target) != dest_resolved:
            raise HTTPException(status_code=400, detail="Zip contains path traversal entries")
        if member.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(member) as src, open(target, "wb") as dst:
                shutil.copyfileobj(src, dst)


@router.post("/jobs/upload", response_model=UploadResult, status_code=201)
async def upload_job(request: Request, file: UploadFile = File(...)) -> UploadResult:
    """Accept a .zip file and install it as a new job under JOBS_DIR.

    Size limit: 10 GiB.  The zip must contain ``annot_spec.yml`` and
    ``dataset.csv`` either at the archive root (flat layout) or inside a
    single top-level directory (folder layout).  The job name is derived from
    that directory name (folder layout) or from the filename (flat layout).
    """
    # Fast-path: reject by Content-Length header when the client sends it
    raw_cl = request.headers.get("content-length")
    if raw_cl:
        try:
            if int(raw_cl) > MAX_ZIP_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail="File size exceeds the 10 GiB limit",
                )
        except ValueError:
            pass

    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are accepted")

    tmp_path: str | None = None
    dest_dir: Path | None = None
    try:
        # Stream upload to a temporary file, enforcing the size cap byte-by-byte
        total_bytes = 0
        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
            tmp_path = tmp.name
            while True:
                chunk = await file.read(1024 * 1024)  # 1 MiB chunks
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_ZIP_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail="File size exceeds the 10 GiB limit",
                    )
                tmp.write(chunk)

        if not zipfile.is_zipfile(tmp_path):
            raise HTTPException(status_code=400, detail="Uploaded file is not a valid zip archive")

        with zipfile.ZipFile(tmp_path, "r") as zf:
            names = set(zf.namelist())

            # Determine layout: flat or single-folder
            if "annot_spec.yml" in names and "dataset.csv" in names:
                # Flat layout — job name comes from the filename
                job_name = Path(file.filename).stem
                zip_prefix = ""
            else:
                top_dirs = {n.split("/")[0] for n in names if "/" in n}
                if len(top_dirs) == 1:
                    root = next(iter(top_dirs))
                    if f"{root}/annot_spec.yml" in names and f"{root}/dataset.csv" in names:
                        job_name = root
                        zip_prefix = f"{root}/"
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                "Zip must contain annot_spec.yml and dataset.csv "
                                "at its root or inside a single top-level folder"
                            ),
                        )
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Zip must contain annot_spec.yml and dataset.csv "
                            "at its root or inside a single top-level folder"
                        ),
                    )

            job_name = _sanitize_job_name(job_name)
            if not job_name or not _SAFE_NAME_RE.match(job_name):
                raise HTTPException(
                    status_code=400,
                    detail=f"Derived job name '{job_name}' is invalid. Rename your zip.",
                )

            dest_dir = Path(settings.JOBS_DIR) / job_name
            if dest_dir.exists():
                raise HTTPException(
                    status_code=409,
                    detail=f"A job named '{job_name}' already exists. Delete it first or rename your zip.",
                )

            dest_dir.mkdir(parents=True, exist_ok=True)
            _extract_zip(zf, zip_prefix, dest_dir)

        # Count items from the extracted dataset.csv so we can return item_count
        item_count = 0
        csv_path = dest_dir / "dataset.csv"
        if csv_path.exists():
            import csv as _csv
            with open(csv_path, newline="", encoding="utf-8") as f:
                item_count = sum(1 for _ in _csv.DictReader(f))

        return UploadResult(job_id=job_name, item_count=item_count, size_bytes=total_bytes)

    except HTTPException:
        # Clean up destination directory if we started extracting
        if dest_dir and dest_dir.exists():
            shutil.rmtree(dest_dir, ignore_errors=True)
        raise
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# Zip download (existing feature)
# ---------------------------------------------------------------------------

def _zip_job_dir(job_dir: Path) -> io.BytesIO:
    """Zip an entire job directory into an in-memory buffer."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for file_path in sorted(job_dir.rglob("*")):
            if not file_path.is_file():
                continue
            arcname = Path(job_dir.name) / file_path.relative_to(job_dir)
            zf.write(file_path, arcname=str(arcname))
    buf.seek(0)
    return buf


@router.get("/jobs/{job_id}/zip")
def download_job_zip(job_id: str):
    """Download a job folder as a zip archive (all files included)."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job_dir = Path(settings.JOBS_DIR) / job_id
    if not job_dir.is_dir():
        raise HTTPException(status_code=404, detail="Job directory not found on disk")

    buf = _zip_job_dir(job_dir)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{job_id}.zip"'},
    )


@router.get("/jobs/{job_id}/spec")
def get_spec(job_id: str) -> dict:
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "content_schema": [{"slot": s.slot} for s in job.spec.content_schema],
        "feedbacks": [
            {"name": f.name, "type": f.type, "options": f.options}
            for f in job.spec.feedbacks
        ],
    }
