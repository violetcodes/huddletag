import io
import zipfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..core.config import settings
from ..core.database import get_db
from ..services.job_registry import get_all_jobs, get_job

router = APIRouter()


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


_SAMPLE_JOB_PREFERENCE = ["imgen-eval", "compare-dsm-vids", "multimodal"]
# File extensions to include (skip large binary media by default)
_MEDIA_EXTS = {".yml", ".yaml", ".csv", ".txt", ".md", ".json"}


def _pick_sample_job() -> Path | None:
    """Return a jobs-dir subdirectory to use as the sample download."""
    base = Path(settings.JOBS_DIR)
    if not base.exists():
        return None
    # Try preferred names first
    for name in _SAMPLE_JOB_PREFERENCE:
        candidate = base / name
        if candidate.is_dir():
            return candidate
    # Fall back to first available job dir
    for subdir in sorted(base.iterdir()):
        if subdir.is_dir():
            return subdir
    return None


def _zip_job_dir(job_dir: Path) -> io.BytesIO:
    """
    Zip the job directory, including all config/data files.
    Binary media files (images/videos) are skipped to keep the download small.
    """
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for file_path in sorted(job_dir.rglob("*")):
            if not file_path.is_file():
                continue
            if file_path.suffix.lower() not in _MEDIA_EXTS:
                continue
            arcname = Path(job_dir.name) / file_path.relative_to(job_dir)
            zf.write(file_path, arcname=str(arcname))
    buf.seek(0)
    return buf


@router.get("/sample-job.zip")
def download_sample_job():
    """Download a minimal sample job folder as a zip file."""
    job_dir = _pick_sample_job()
    if not job_dir:
        raise HTTPException(status_code=404, detail="No jobs available to use as sample")

    buf = _zip_job_dir(job_dir)
    filename = f"{job_dir.name}.zip"

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
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
