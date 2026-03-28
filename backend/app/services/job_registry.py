import threading
from pathlib import Path

from .dataset import Item, parse_dataset
from .s3_media import is_s3_path, parse_s3_url, verify_s3_sample
from .spec_parser import AnnotSpec, parse_spec


class Job:
    def __init__(self, job_id: str, spec: AnnotSpec, items: list[Item]) -> None:
        self.job_id = job_id
        self.spec = spec
        self.items = items


_registry: dict[str, Job] = {}
_lock = threading.Lock()


def _scan_jobs_dir(jobs_dir: str) -> dict[str, Job]:
    """Return a fresh registry dict by scanning jobs_dir."""
    found: dict[str, Job] = {}
    base = Path(jobs_dir)
    if not base.exists():
        return found
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

                # S3 jobs: verify connectivity upfront so there is no cold-start
                # surprise the first time a user clicks on an item.
                if is_s3_path(spec.data_dir):
                    if not items:
                        print(f"[job_registry] Skipping '{job_id}': S3 job has empty dataset")
                        continue
                    bucket, prefix = parse_s3_url(spec.data_dir)
                    sample_path = items[0].content_paths[0]
                    try:
                        verify_s3_sample(bucket, prefix, sample_path)
                        print(f"[job_registry] S3 OK for '{job_id}' (s3://{bucket}/{prefix})")
                    except RuntimeError as exc:
                        print(f"[job_registry] Skipping '{job_id}': {exc}")
                        continue

                found[job_id] = Job(job_id=job_id, spec=spec, items=items)
            except Exception as exc:
                print(f"[job_registry] Skipping '{job_id}': {exc}")
    return found


def load_jobs(jobs_dir: str) -> None:
    """Perform initial scan and populate the registry."""
    with _lock:
        _registry.clear()
        _registry.update(_scan_jobs_dir(jobs_dir))


def reload_jobs(jobs_dir: str) -> tuple[set[str], set[str]]:
    """
    Rescan jobs_dir and update the registry in place.
    Returns (added_ids, removed_ids) for logging purposes.
    """
    fresh = _scan_jobs_dir(jobs_dir)
    with _lock:
        current_ids = set(_registry.keys())
        fresh_ids = set(fresh.keys())
        added = fresh_ids - current_ids
        removed = current_ids - fresh_ids
        if added or removed:
            _registry.clear()
            _registry.update(fresh)
    return added, removed


def get_job(job_id: str) -> Job | None:
    with _lock:
        return _registry.get(job_id)


def get_all_jobs() -> list[Job]:
    with _lock:
        return list(_registry.values())
