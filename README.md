# HuddleTag

A lightweight browser-based annotation tool for multi-modal datasets. Annotators review items — video pairs, image+video, image+text, or any combination — defined by a declarative job spec (`annot_spec.yml` + `dataset.csv`) and submit structured feedback through a React UI.

## Features

- **Multi-modal content** — side-by-side video, image, and text slots in a single annotation view
- **Structured feedback** — radio buttons, checkboxes, and free-text fields driven by `annot_spec.yml`
- **Job upload** — drag-and-drop a `.zip` containing your job files directly from the UI (≤ 11 GB)
- **S3 media backend** — set `data_dir: s3://bucket/prefix` in your spec; backend streams via presigned URLs
- **Hot-reload** — new job folders appear automatically within 10 seconds; no server restart required
- **Dark / light mode** — persisted per browser via `localStorage`; respects system preference on first load
- **Keyboard shortcuts** — `→`/`←` to navigate, `Ctrl+S` to save, `1`–`9` for radio options, `?` for cheat-sheet
- **Session timer & ETA** — time spent, avg per item, and estimated time to completion shown in the sidebar
- **CSV export** — one-click download of all annotations merged with the original dataset
- **Docker Compose deploy** — two-container stack (FastAPI + nginx) ready in one command

## Prerequisites

- Python 3.12+
- Node.js 20+
- Docker + Docker Compose (for containerised deployment)

---

## Quick Start — Local Development

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
JOBS_DIR=../jobs DB_PATH=../db/huddletag.db uvicorn app.main:app --reload --port 8000
```

The API is available at `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev   # starts on http://localhost:5173
```

Vite proxies all `/api/*` requests to `http://localhost:8000` via `vite.config.ts`.

### 3. Environment variables

Copy `.env.example` to `backend/.env` and adjust as needed:

| Variable | Default | Description |
|---|---|---|
| `JOBS_DIR` | `./jobs` | Root directory scanned for job subdirectories |
| `DB_PATH` | `./db/huddletag.db` | SQLite database file path |
| `BACKEND_PORT` | `8000` | Uvicorn listen port |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed CORS origins |
| `AWS_ACCESS_KEY_ID` | _(unset)_ | AWS key for S3-backed jobs (optional) |
| `AWS_SECRET_ACCESS_KEY` | _(unset)_ | AWS secret for S3-backed jobs (optional) |
| `AWS_DEFAULT_REGION` | _(unset)_ | AWS region (optional) |

AWS credentials are only needed for jobs with `data_dir: s3://...`. Resolution order: env vars → `~/.aws` credentials file → EC2/ECS IAM role.

---

## Quick Start — Hosting with Docker

`docker-compose.yml` mounts the `./jobs` folder next to itself directly into the container. No compose edits needed — just drop job folders there.

**1. Clone / copy the repo and place your job folders inside `./jobs`:**

```
huddletag/
├── docker-compose.yml
└── jobs/
    ├── my-first-job/
    │   ├── annot_spec.yml
    │   ├── dataset.csv
    │   └── media/
    │       ├── clip_a.mp4
    │       └── clip_b.mp4
    └── another-job/
        ├── annot_spec.yml
        ├── dataset.csv
        └── media/
            └── image.jpg
```

**2. Bring the stack up:**

```bash
docker compose up --build
```

The UI is available at `http://localhost:3000`. All jobs inside `./jobs` appear in the job selector immediately.

> **Adding more jobs later:** drop the new folder into `./jobs` — it will appear in the UI within 10 seconds automatically (no restart required). You can also upload a job `.zip` directly from the Job Selector page.

---

## Job Configuration

Each job lives in a subdirectory under `JOBS_DIR` and requires two files:

```
jobs/
└── my-job/
    ├── annot_spec.yml   # content schema + feedback fields
    └── dataset.csv      # item_id, content_paths (pipe-separated)
```

See `jobs/imgen-eval/` for a working example job with images and text prompts, and `jobs/compare-dsm-vids/` for a two-video comparison job.

New job folders placed in `JOBS_DIR` are picked up automatically within 10 seconds. Alternatively, zip your job folder and upload it from the Job Selector page in the UI (supports local media and S3-backed jobs).

---

## Running Tests

```bash
cd backend
source .venv/bin/activate
pytest
```

---

## Docker

```bash
docker compose up --build
```

The frontend is served at `http://localhost:3000`. The backend API is proxied internally by nginx.

Media files must be mounted into the backend container at the path declared in each job's `data_dir`. Uncomment and update the example volume entries in `docker-compose.yml`.

### End-to-end smoke test

After `docker compose up --build`, run:

```bash
./scripts/smoke_test.sh          # leaves containers running
./scripts/smoke_test.sh --down   # tears down after testing
```

The script polls `http://localhost:3000/api/jobs` until the stack is ready, then exercises all major API endpoints through nginx and reports pass/fail.

---

## Docs

The `docs/` folder contains detailed planning and specification documents:

| File | Description |
|---|---|
| `docs/release_doc.md` | Project summary: primary use case and key shipped features |
| `docs/tech_spec.md` | Technical specification: architecture, API contracts, data models |
| `docs/v2_plan.md` | Feature roadmap with shipped / pending status per feature |
| `docs/prd.md` | Product requirements document |
| `docs/idea.md` | Original concept notes |
