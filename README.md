# HuddleTag

A lightweight annotation tool for multi-modal datasets. Annotators review items (video pairs, image+video, text…) defined by a job spec and submit structured feedback through a browser UI.

## Prerequisites

- Docker + Docker Compose

---

## Quick Start

### 1. Pull and tag the images

```bash
# Example: pull from your registry and tag to match docker-compose.yml
docker pull <your-registry>/huddletag-backend:v1
docker pull <your-registry>/huddletag-frontend:v1

docker tag <your-registry>/huddletag-backend:v1  huddletag-backend:v1
docker tag <your-registry>/huddletag-frontend:v1 huddletag-frontend:v1
```

### 2. Place your job folders next to `docker-compose.yml`

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

The `./jobs` folder is mounted directly into the backend container — no edits to `docker-compose.yml` needed.

### 3. Start the stack

```bash
docker compose up -d
```

Open **http://localhost:3000**. All jobs inside `./jobs` appear in the job selector immediately.

---

## Adding Jobs Later

Drop a new job folder into `./jobs` and restart the backend:

```bash
docker compose restart backend
```

---

## Job Folder Structure

Each job requires two files at its root:

| File | Purpose |
|---|---|
| `annot_spec.yml` | Content schema (what media to show) + feedback fields (radio, checkbox, text) |
| `dataset.csv` | One row per item: `item_id` and pipe-separated `content_paths` |

Media files referenced in `dataset.csv` must live inside the job folder so they are included in the `./jobs` mount.

See the bundled `jobs/imgen-eval/` and `jobs/compare-dsm-vids/` folders for working examples.

---

## Environment Variables

Override any of these in `docker-compose.yml` under `backend.environment` if needed:

| Variable | Default | Description |
|---|---|---|
| `JOBS_DIR` | `/jobs` | Path inside the container where job folders are scanned |
| `DB_PATH` | `/data/db/huddletag.db` | SQLite database path (backed by the named volume) |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins; update if serving on a custom domain |
