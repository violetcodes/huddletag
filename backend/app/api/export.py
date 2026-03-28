import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from ..core.database import get_db
from ..services.exporter import export_csv
from ..services.job_registry import get_job

router = APIRouter()


@router.get("/jobs/{job_id}/export")
def export_job(job_id: str) -> Response:
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    db = get_db()
    try:
        rows = db.execute(
            "SELECT item_id, values_json FROM annotations WHERE job_id = ?",
            (job_id,),
        ).fetchall()
    finally:
        db.close()

    annotations = {row["item_id"]: json.loads(row["values_json"]) for row in rows}
    csv_content = export_csv(job, annotations)

    filename = f"{job_id}-annotations.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
