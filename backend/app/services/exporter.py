import csv
import io

from .job_registry import Job


def export_csv(job: Job, annotations: dict[str, dict]) -> str:
    """Build a CSV string from job items joined with their annotations.

    annotations: mapping of item_id → {field_name: value}
    Checkbox values (lists) are joined with ';'.
    Unannotated items get empty strings for all feedback columns.
    """
    feedback_names = [f.name for f in job.spec.feedbacks]
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["item_id", "content_paths"] + feedback_names)

    for item in job.items:
        content_paths_str = "|".join(item.content_paths)
        annot = annotations.get(item.item_id, {})
        row: list[str] = [item.item_id, content_paths_str]
        for name in feedback_names:
            val = annot.get(name, "")
            if isinstance(val, list):
                val = ";".join(str(v) for v in val)
            row.append(str(val))
        writer.writerow(row)

    return output.getvalue()
