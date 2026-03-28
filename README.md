# HuddleTag

A lightweight annotation tool for multi-modal datasets. Annotators review items (video pairs, image+video, text…) defined by a job spec and submit structured feedback through a browser UI.

## Prerequisites

- Python 3.12+
- Node.js 20+
- Docker + Docker Compose (for containerised deployment)

---

## Local Development

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

## Job Configuration

Each job lives in a subdirectory under `JOBS_DIR` and requires two files:

```
jobs/
└── my-job/
    ├── annot_spec.yml   # content schema + feedback fields
    └── dataset.csv      # item_id, content_paths (pipe-separated)
```

Adding a new job requires a server restart (hot-reload is a v2 feature).

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
./smoke_test.sh          # leaves containers running
./smoke_test.sh --down   # tears down after testing
```

The script polls `http://localhost:3000/api/jobs` until the stack is ready, then exercises all major API endpoints through nginx and reports pass/fail.
