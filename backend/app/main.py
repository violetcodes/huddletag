from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import annotations, export, items, jobs, media
from .core.config import settings
from .core.database import init_db
from .services.job_registry import load_jobs


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    load_jobs(settings.JOBS_DIR)
    yield


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
