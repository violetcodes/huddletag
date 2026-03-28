import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..core.database import get_db
from ..services.job_registry import get_job

router = APIRouter()


class AnnotationRequest(BaseModel):
    values: dict


class AnnotationResponse(BaseModel):
    item_id: str
    values: dict
    updated_at: str


@router.get(
    "/jobs/{job_id}/annotations/{item_id}",
    response_model=AnnotationResponse,
)
def get_annotation(job_id: str, item_id: str) -> AnnotationResponse:
    if not get_job(job_id):
        raise HTTPException(status_code=404, detail="Job not found")

    db = get_db()
    try:
        row = db.execute(
            "SELECT values_json, updated_at FROM annotations WHERE job_id = ? AND item_id = ?",
            (job_id, item_id),
        ).fetchone()
    finally:
        db.close()

    if not row:
        raise HTTPException(status_code=404, detail="Annotation not found")

    return AnnotationResponse(
        item_id=item_id,
        values=json.loads(row["values_json"]),
        updated_at=row["updated_at"],
    )


@router.post(
    "/jobs/{job_id}/annotations/{item_id}",
    response_model=AnnotationResponse,
)
def upsert_annotation(
    job_id: str, item_id: str, body: AnnotationRequest
) -> AnnotationResponse:
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if item_id not in {item.item_id for item in job.items}:
        raise HTTPException(status_code=404, detail="Item not found")

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    values_json = json.dumps(body.values)

    db = get_db()
    try:
        db.execute(
            """
            INSERT INTO annotations (job_id, item_id, values_json, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(job_id, item_id) DO UPDATE SET
                values_json = excluded.values_json,
                updated_at  = excluded.updated_at
            """,
            (job_id, item_id, values_json, now),
        )
        db.commit()
    finally:
        db.close()

    return AnnotationResponse(item_id=item_id, values=body.values, updated_at=now)
