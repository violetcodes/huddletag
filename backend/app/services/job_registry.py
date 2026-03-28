from pathlib import Path

from .dataset import Item, parse_dataset
from .spec_parser import AnnotSpec, parse_spec


class Job:
    def __init__(self, job_id: str, spec: AnnotSpec, items: list[Item]) -> None:
        self.job_id = job_id
        self.spec = spec
        self.items = items


_registry: dict[str, Job] = {}


def load_jobs(jobs_dir: str) -> None:
    """Scan jobs_dir for subdirectories that contain both annot_spec.yml and dataset.csv."""
    _registry.clear()
    base = Path(jobs_dir)
    if not base.exists():
        return
    for subdir in sorted(base.iterdir()):
        if not subdir.is_dir():
            continue
        spec_path = subdir / "annot_spec.yml"
        csv_path = subdir / "dataset.csv"
        if spec_path.exists() and csv_path.exists():
            job_id = subdir.name
            try:
                spec = parse_spec(spec_path)
                items = parse_dataset(csv_path)
                _registry[job_id] = Job(job_id=job_id, spec=spec, items=items)
            except Exception as exc:
                # Log bad jobs but don't crash the server
                print(f"[job_registry] Skipping '{job_id}': {exc}")


def get_job(job_id: str) -> Job | None:
    return _registry.get(job_id)


def get_all_jobs() -> list[Job]:
    return list(_registry.values())
