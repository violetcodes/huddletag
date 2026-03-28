from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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
