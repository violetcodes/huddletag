# HuddleTag

A lightweight annotation tool for multi-modal datasets. Annotators review items (video pairs, image+video, text…) defined by a job spec and submit structured feedback through a browser UI.

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

> **Adding more jobs later:** drop the new folder into `./jobs` and restart the backend (`docker compose restart backend`). Hot-reload (no restart needed) is a planned v2 feature.

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

Adding a new job currently requires a server restart (hot-reload is a v2 feature).

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
| `docs/tech_spec.md` | Full v1 technical specification: architecture, API contracts, data models |
| `docs/v2_plan.md` | v2 feature roadmap ordered by complexity and effort |
| `docs/prd.md` | Product requirements document |
| `docs/idea.md` | Original concept notes |
