"""
Shared fixtures for HuddleTag integration tests.

Each test gets:
  - A fresh temporary SQLite database (isolated per test function).
  - The real sample jobs from <repo-root>/jobs/ loaded into the job registry.
  - A starlette TestClient that triggers the FastAPI lifespan (init_db + load_jobs).
"""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Absolute path: backend/tests/ → backend/ → huddletag/ → jobs/
SAMPLE_JOBS_DIR = str(Path(__file__).parents[2] / "jobs")


@pytest.fixture()
def client(tmp_path):
    """
    Yields a TestClient wired to a temp DB and the sample jobs directory.

    Settings are patched on the shared singleton *before* the TestClient
    context manager fires the lifespan event, so init_db() and load_jobs()
    pick up the overridden values automatically.
    """
    from app.core import config
    from app.services import job_registry

    # Patch the settings singleton in-place (pydantic v2 models are mutable by default)
    config.settings.DB_PATH = str(tmp_path / "test.db")
    config.settings.JOBS_DIR = SAMPLE_JOBS_DIR

    # Ensure registry is empty before lifespan re-populates it
    job_registry._registry.clear()

    from app.main import app

    with TestClient(app) as c:
        yield c

    # Leave the registry clean for the next test
    job_registry._registry.clear()
