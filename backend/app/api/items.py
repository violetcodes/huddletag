from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..core.database import get_db
from ..services.job_registry import get_job

router = APIRouter()


class ItemResponse(BaseModel):
    item_id: str
    content_paths: list[str]
    is_annotated: bool


@router.get("/jobs/{job_id}/items", response_model=list[ItemResponse])
def list_items(job_id: str) -> list[ItemResponse]:
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    db = get_db()
    try:
        rows = db.execute(
            "SELECT item_id FROM annotations WHERE job_id = ?",
            (job_id,),
        ).fetchall()
        annotated_ids: set[str] = {row["item_id"] for row in rows}
    finally:
        db.close()

    return [
        ItemResponse(
            item_id=item.item_id,
            content_paths=item.content_paths,
            is_annotated=item.item_id in annotated_ids,
        )
        for item in job.items
    ]
