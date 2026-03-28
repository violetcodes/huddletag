import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import annotations, export, items, jobs, media
from .core.config import settings
from .core.database import init_db
from .services.job_registry import load_jobs, reload_jobs

HOT_RELOAD_INTERVAL = 10  # seconds between re-scans


async def _hot_reload_loop() -> None:
    """Periodically rescan JOBS_DIR and update the in-memory job registry."""
    while True:
        await asyncio.sleep(HOT_RELOAD_INTERVAL)
        try:
            added, removed = reload_jobs(settings.JOBS_DIR)
            if added:
                print(f"[hot-reload] Jobs added: {', '.join(sorted(added))}")
            if removed:
                print(f"[hot-reload] Jobs removed: {', '.join(sorted(removed))}")
        except Exception as exc:
            print(f"[hot-reload] Error during rescan: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    load_jobs(settings.JOBS_DIR)
    task = asyncio.create_task(_hot_reload_loop())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="HuddleTag", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router, prefix="/api")
app.include_router(items.router, prefix="/api")
app.include_router(annotations.router, prefix="/api")
app.include_router(media.router, prefix="/api")
app.include_router(export.router, prefix="/api")
