# Technical Specification — HuddleTag

**Version:** 1.3  
**Date:** 2026-03-28  
**Status:** Implemented — reflects shipped codebase (v1 core + Phase 1–3 features)

---

## 1. Purpose

This document captures all architectural and implementation decisions for HuddleTag. It supplements the `prd.md` product requirements with concrete technical choices, folder structure, API contracts, data models, and Docker topology. It reflects the current shipped state of the codebase including Phase 1–3 features (dark mode, keyboard shortcuts, session timer, SCP snippet, feature-rich media, job zip download, hot-reload, job upload, and S3 media backend).

---

## 2. Confirmed Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Frontend tooling | Vite + TypeScript + React |
| 2 | Jobs per server run | Multiple jobs loaded simultaneously; annotators can work on the same or different jobs concurrently |
| 3 | Annotation uniqueness | One row per `(job_id, item_id)` — last-write-wins |
| 4 | Frontend port (local dev) | `5173` (Vite default) |
| 5 | Frontend port (Docker) | `3000` (nginx) |
| 6 | Backend framework | FastAPI |
| 7 | Database | SQLite (single file) |
| 8 | Media serving | Backend streams files; frontend never accesses `data_dir` directly |
| 9 | Docker topology | Two containers: `backend` (Python) + `frontend` (nginx) via `docker-compose` |

---

## 3. Folder Structure

```
huddletag/
│
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI app factory, router registration, startup hooks
│   │   ├── api/
│   │   │   ├── jobs.py               # GET /api/jobs, GET /api/jobs/{job_id}/spec, GET /{job_id}/zip, POST /upload
│   │   │   ├── items.py              # GET /api/jobs/{job_id}/items
│   │   │   ├── annotations.py        # GET/POST /api/jobs/{job_id}/annotations/{item_id}
│   │   │   ├── media.py              # GET /api/media/{job_id}/{path:path} (local + S3 presigned)
│   │   │   └── export.py             # GET /api/jobs/{job_id}/export
│   │   ├── core/
│   │   │   ├── config.py             # Settings via pydantic-settings (env vars)
│   │   │   └── database.py           # SQLite init, connection, table creation
│   │   └── services/
│   │       ├── job_registry.py       # Scans JOBS_DIR at startup + 10s background reload loop
│   │       ├── spec_parser.py        # Parses annot_spec.yml → validated Python models
│   │       ├── dataset.py            # Parses dataset CSV → list of Item objects
│   │       ├── exporter.py           # Joins DB annotations onto dataset CSV → export CSV
│   │       └── s3_media.py           # S3 presigned URL generation for s3:// data_dir jobs
│   ├── requirements.txt
│   └── Dockerfile                    # FROM python:3.12-slim
│
├── frontend/
│   ├── src/
│   │   ├── api/                      # Typed fetch wrappers (one file per resource)
│   │   │   ├── jobs.ts
│   │   │   ├── items.ts
│   │   │   ├── annotations.ts
│   │   │   └── export.ts
│   │   ├── components/
│   │   │   ├── Sidebar/
│   │   │   │   ├── ItemList.tsx      # Scrollable list of items with completion badge
│   │   │   │   └── StatsPanel.tsx    # Progress bar, timer, ETA, Export button
│   │   │   ├── ContentPanel/
│   │   │   │   ├── ContentGrid.tsx   # Responsive grid for multiple content slots
│   │   │   │   ├── ImageSlot.tsx     # <img> renderer with zoom & pan
│   │   │   │   ├── VideoSlot.tsx     # HTML5 <video> with sync support
│   │   │   │   ├── TextSlot.tsx      # Scrollable text block
│   │   │   │   └── VideoSyncContext.ts  # Shared play/seek controller for multi-video sync
│   │   │   ├── FeedbackPanel/
│   │   │   │   ├── FeedbackForm.tsx  # Renders all feedback fields from spec
│   │   │   │   ├── RadioField.tsx
│   │   │   │   ├── CheckboxField.tsx
│   │   │   │   └── TextField.tsx
│   │   │   ├── ActionBar.tsx         # Save + Next Item buttons
│   │   │   ├── ThemeToggle.tsx       # Dark / light mode toggle (sun/moon icon)
│   │   │   └── ShortcutOverlay.tsx   # Keyboard shortcut cheat-sheet modal
│   │   ├── pages/
│   │   │   ├── JobSelector.tsx       # Landing page — job list, upload, SCP snippet
│   │   │   ├── AnnotatorView.tsx     # Main annotation workspace
│   │   │   └── NotFound.tsx
│   │   ├── hooks/
│   │   │   ├── useJob.ts
│   │   │   ├── useItems.ts
│   │   │   ├── useAnnotation.ts
│   │   │   ├── useKeyboardShortcuts.ts  # Keyboard navigation and save shortcuts
│   │   │   ├── useSessionTimer.ts       # Session elapsed time, avg per item, ETA
│   │   │   └── useTheme.ts              # Theme preference (localStorage + system pref)
│   │   ├── types/
│   │   │   └── index.ts              # Job, Item, Spec, Annotation, FeedbackField…
│   │   ├── App.tsx                   # Router (job selector → annotator view)
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts                # /api proxy → http://localhost:8000 in dev
│   └── Dockerfile                    # Stage 1: node:20-alpine (build) → Stage 2: nginx:alpine (serve)
│
├── jobs/                             # Default JOBS_DIR for local dev
│   ├── compare-dsm-vids/
│   │   ├── annot_spec.yml
│   │   └── dataset.csv
│   └── multimodal/
│       ├── annot_spec.yml
│       └── dataset.csv
│
├── db/                               # Local SQLite file (git-ignored)
│   └── .gitkeep
│
├── docs/
│   ├── idea.md
│   ├── prd.md
│   ├── tech_spec.md                  # ← this file
│   └── v2_plan.md                    # v2 feature backlog and roadmap
│
├── scripts/
│   ├── smoke_test.sh                 # End-to-end smoke test (Docker)
│   └── release_images.sh             # Build backend + frontend Docker images (ECR push placeholder)
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

> **Note on `data/`:** The existing `data/` directory (with the two sample job configs) will be reorganised into `jobs/` to match the new multi-job layout. The actual media files live outside the repo and are referenced via `data_dir` inside each `annot_spec.yml`.

---

## 4. Job Loading — Multi-Job Architecture

### 4.1 `JOBS_DIR`

A single environment variable `JOBS_DIR` points to a directory. At startup the backend scans every subdirectory that contains both `annot_spec.yml` and `dataset.csv`. Each such subdirectory becomes a **job**, with `job_id` equal to the subdirectory name.

```
JOBS_DIR/
├── compare-dsm-vids/     →  job_id = "compare-dsm-vids"
│   ├── annot_spec.yml
│   └── dataset.csv
└── multimodal/           →  job_id = "multimodal"
    ├── annot_spec.yml
    └── dataset.csv
```

- **Local dev default:** `JOBS_DIR=./jobs`
- **Docker:** `JOBS_DIR=/jobs` (mounted volume)

### 4.2 `data_dir` Resolution

Each `annot_spec.yml` declares a `data_dir`. The backend resolves media paths as `{data_dir}/{relative_path_from_csv}`. In Docker, `data_dir` must match the container-internal mount path.

### 4.3 Hot-reload of Jobs

Jobs are loaded at server startup and then rescanned every 10 seconds via a background `asyncio` loop. New job directories placed in `JOBS_DIR` (or extracted by the upload endpoint) appear automatically in the UI without any server restart.

---

## 5. Environment Variables

| Variable | Default (local dev) | Docker value | Description |
|---|---|---|---|
| `JOBS_DIR` | `./jobs` | `/jobs` | Root directory scanned for job subdirectories |
| `DB_PATH` | `./db/huddletag.db` | `/data/db/huddletag.db` | SQLite database file path |
| `BACKEND_PORT` | `8000` | `8000` | Uvicorn listen port |
| `CORS_ORIGINS` | `http://localhost:5173` | `http://localhost:3000` | Allowed CORS origins |
| `AWS_ACCESS_KEY_ID` | _(unset)_ | _(pass-through)_ | AWS key — only needed for S3-backed jobs |
| `AWS_SECRET_ACCESS_KEY` | _(unset)_ | _(pass-through)_ | AWS secret |
| `AWS_SESSION_TOKEN` | _(unset)_ | _(pass-through)_ | AWS session token (temporary credentials) |
| `AWS_DEFAULT_REGION` | _(unset)_ | _(pass-through)_ | AWS region |

Defined in `.env` (local) or `docker-compose.yml` `environment:` section. See `.env.example` for the full template.

**AWS credential resolution order (boto3 standard):** env vars → `~/.aws` credentials file (mounted `~/.aws:/root/.aws:ro`) → EC2/ECS IAM role.

---

## 6. API Contract

All endpoints are prefixed with `/api`. All request/response bodies are JSON unless noted.

### 6.1 Jobs

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/jobs` | List all loaded jobs with `job_id`, item count, and annotated count |
| `GET` | `/api/jobs/{job_id}/spec` | Return the parsed annotation spec (content schema + feedback fields) |
| `GET` | `/api/jobs/{job_id}/zip` | Stream the job folder as a downloadable `.zip` archive |
| `POST` | `/api/jobs/upload` | Upload a `.zip` containing `annot_spec.yml` + `dataset.csv`; extracts to `JOBS_DIR`; max 11 GB |

**`GET /api/jobs` response:**
```json
[
  {
    "job_id": "compare-dsm-vids",
    "item_count": 6,
    "annotated_count": 2
  }
]
```

**`GET /api/jobs/{job_id}/spec` response:**
```json
{
  "content_schema": [
    { "slot": "video_a" },
    { "slot": "video_b" }
  ],
  "feedbacks": [
    { "name": "preferred_video", "type": "radio", "options": ["Video A", "Video B"] },
    { "name": "reason", "type": "text", "options": null }
  ]
}
```

### 6.2 Items

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/jobs/{job_id}/items` | List all items with `item_id`, `content_paths`, and `is_annotated` flag |

**Response:**
```json
[
  {
    "item_id": "pair_001",
    "content_paths": ["blur/blur0.mp4", "night/night2.mp4"],
    "is_annotated": true
  }
]
```

### 6.3 Annotations

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/jobs/{job_id}/annotations/{item_id}` | Get saved annotation for an item (404 if not yet annotated) |
| `POST` | `/api/jobs/{job_id}/annotations/{item_id}` | Upsert annotation (last-write-wins) |

**`POST` request body:**
```json
{
  "values": {
    "preferred_video": "Video A",
    "reason": "Sharper image in low light"
  }
}
```

**`GET` response:**
```json
{
  "item_id": "pair_001",
  "values": {
    "preferred_video": "Video A",
    "reason": "Sharper image in low light"
  },
  "updated_at": "2026-03-28T14:23:11Z"
}
```

### 6.4 Media

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/media/{job_id}/{path:path}` | Stream a media file from the job's `data_dir`. Supports `Range` header for video seeking. |

For **local** jobs: returns the raw file with the appropriate `Content-Type`. Path traversal is rejected.  
For **S3-backed** jobs (`data_dir: s3://...`): returns a `307` redirect to a short-lived presigned URL so the browser fetches media directly from S3 without proxying through the backend.

### 6.5 Export

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/jobs/{job_id}/export` | Download annotations as CSV (`Content-Disposition: attachment`) |

Output format: original dataset CSV columns + one column per feedback field. Empty string for unannotated items. Checkbox values are joined with `;`.

```csv
item_id,content_paths,preferred_video,reason
pair_001,blur/blur0.mp4|night/night2.mp4,Video A,Sharper image
pair_002,rain/rain1.mp4|blur/blur2.mp4,,
```

---

## 7. Database Schema

Single SQLite file. One table for v1.

```sql
CREATE TABLE IF NOT EXISTS annotations (
    job_id      TEXT    NOT NULL,
    item_id     TEXT    NOT NULL,
    values_json TEXT    NOT NULL,   -- JSON object: { field_name: value }
    updated_at  TEXT    NOT NULL,   -- ISO-8601 UTC timestamp
    PRIMARY KEY (job_id, item_id)
);
```

- `values_json` stores the entire feedback payload as a JSON string. No separate column per field — this keeps the schema stable regardless of spec changes.
- Checkbox values are stored as a JSON array (e.g. `["Blurry", "Cropped"]`) and joined with `;` on export.

---

## 8. Frontend Routing

```
/                          →  JobSelector page (list of jobs)
/jobs/:jobId               →  AnnotatorView (redirects to first unannotated item)
/jobs/:jobId/items/:itemId →  AnnotatorView (specific item active)
```

Client-side routing via React Router v6.

---

## 9. Frontend — State and Data Flow

- **Job list:** fetched once on `JobSelector` mount.
- **Items list:** fetched when entering `AnnotatorView`; refetched after each successful save to update `is_annotated` flags in the sidebar.
- **Current annotation:** fetched when `itemId` changes; pre-populates the feedback form.
- **Save:** `POST /api/jobs/{job_id}/annotations/{item_id}` → on success, refresh items list, then auto-advance to next unannotated item.
- **Export:** direct `<a href="/api/jobs/{job_id}/export" download>` — no JS fetch needed.

No global state manager (Redux/Zustand) for v1 — React Query (TanStack Query) handles server state, caching, and refetching.

---

## 10. Content Type Inference

Inferred from file extension in both backend (for `Content-Type` header) and frontend (for choosing the correct slot component):

| Extension | Type | Backend MIME | Frontend Component |
|---|---|---|---|
| `.jpg` `.jpeg` `.png` `.gif` `.webp` | image | `image/*` | `<ImageSlot>` |
| `.mp4` `.webm` `.ogg` | video | `video/*` | `<VideoSlot>` |
| `.txt` | text | `text/plain` | `<TextSlot>` |

---

## 11. Docker Topology

```
┌─────────────────────────────────────────────────────┐
│  docker-compose                                     │
│                                                     │
│  ┌──────────────────────┐   ┌────────────────────┐  │
│  │  frontend (nginx)    │   │  backend (FastAPI) │  │
│  │  port 3000 → LAN     │──▶│  port 8000         │  │
│  │                      │   │                    │  │
│  │  serves static build │   │  mounts:           │  │
│  │  proxies /api/* to   │   │  - /jobs  (ro)     │  │
│  │  backend:8000        │   │  - /data/db (rw)   │  │
│  └──────────────────────┘   └────────────────────┘  │
│                                                     │
│  volumes:  huddletag_db  →  /data/db/               │
└─────────────────────────────────────────────────────┘
```

### 11.1 Backend Dockerfile

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 11.2 Frontend Dockerfile (multi-stage)

```dockerfile
# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

### 11.3 nginx.conf (key block)

```nginx
server {
    listen 3000;

    location /api/ {
        proxy_pass http://backend:8000;
    }

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

### 11.4 docker-compose.yml (outline)

```yaml
services:
  backend:
    build: ./backend
    environment:
      JOBS_DIR: /jobs
      DB_PATH: /data/db/huddletag.db
      CORS_ORIGINS: http://localhost:3000
    volumes:
      - ./jobs:/jobs:ro          # job configs
      - huddletag_db:/data/db    # SQLite persistence

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  huddletag_db:
```

---

## 12. Local Development Setup

```bash
# Terminal 1 — backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
JOBS_DIR=../jobs DB_PATH=../db/huddletag.db uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev          # starts on http://localhost:5173
```

Vite proxies all `/api/*` requests to `http://localhost:8000` via `vite.config.ts`.

---

## 13. Python Dependencies

```
fastapi
uvicorn[standard]
pydantic-settings
pyyaml
aiofiles          # async file streaming for /api/media
python-multipart  # UploadFile support for POST /api/jobs/upload
boto3             # S3 presigned URL generation for s3:// data_dir jobs
```

No ORM — raw `sqlite3` from the Python standard library is sufficient for the single-table schema.

---

## 14. Frontend Dependencies (initial)

```
react, react-dom
react-router-dom      # v6
@tanstack/react-query # server state, caching, refetch
```

Dev: `vite`, `typescript`, `@types/react`, `@types/react-dom`

---

## 15. Shipped Beyond v1 Scope

The following features from the v2 roadmap have been implemented and are part of the current codebase:

- **Dark / light mode toggle** (Phase 1, feature 3)
- **Keyboard shortcuts** with cheat-sheet overlay (Phase 1, feature 4)
- **Session timer, avg per item, ETA** in sidebar (Phase 1, feature 5)
- **SCP snippet card** on Job Selector (Phase 1, feature 6)
- **Feature-rich media rendering** — image zoom/pan, scrollable text, multi-video sync (Phase 2, feature 7)
- **Per-job zip download** from Job Selector (Phase 2, feature 8)
- **Hot-reload of jobs** — 10s background rescan loop (Phase 2, feature 10)
- **Job upload via zip** from UI (Phase 3, feature 9)
- **S3 media backend** — presigned URL redirect for `s3://` `data_dir` (Phase 3, feature 15)
- **Tiered AWS credentials** — env vars → `~/.aws` → EC2 IAM role (Phase 3)

Still deferred (Phase 4+): user identity / roles, per-annotator annotation rows, batch assignment, analytics dashboard, conditional feedback fields, job split/merge.

---

## 16. Implementation Order

1. **Backend scaffold** — FastAPI app, config, DB init, job registry, spec parser, dataset parser
2. **Backend API** — all endpoints, media streaming
3. **Frontend scaffold** — Vite + TS + React Router + TanStack Query
4. **Frontend pages** — JobSelector, AnnotatorView shell
5. **Frontend components** — Sidebar, ContentPanel, FeedbackPanel, ActionBar
6. **Integration testing** — local dev with sample jobs
7. **Docker** — Dockerfiles, nginx config, docker-compose
8. **End-to-end smoke test** — Docker build + LAN access
