# Product Requirements Document — HuddleTag

**Version:** 1.1  
**Date:** 2026-03-28  
**Status:** Draft

---

## 1. Overview

HuddleTag is a locally-hosted web application for collecting structured human feedback (annotations) on text, image, and video datasets. It is designed for teams operating on a shared local network, where multiple annotators can work through assigned tasks simultaneously. State is persisted continuously to a local SQLite database, so annotation sessions can be paused and resumed at any time by any annotator.

---

## 2. Goals

- Provide a clean, task-driven interface for annotators to label dataset items.
- Allow job creators to define data sources and feedback schemas via two simple configuration files.
- Persist annotation progress automatically to SQLite; no data is lost if the browser is closed.
- Export collected annotations as a structured CSV file for downstream use.
- Run inside Docker with minimal host-machine dependencies, accessible across a LAN on port `3000`.

---

## 3. User Roles

| Role | Description |
|---|---|
| **Job Creator** | Sets up annotation jobs by providing a dataset CSV, an annotation spec YAML, and a dataset directory. |
| **Annotator** | Works through tasks and submits feedback on each item. May resume any previously started job. |

---

## 4. Job Configuration

A job is defined by two files and a data directory on the host machine.

### 4.1 Annotation Spec YAML (`annot_spec.yml`)

This file is the single source of truth for a job's structure. It specifies:

1. **Content schema** — how many content pieces each item has, and their types (consistent across all items in a job).
2. **Root data directory** — absolute or relative path to the dataset directory on the host.
3. **Feedback fields** — what feedback to collect per item.

Content type is **inferred from the file extension** (e.g. `.jpg`/`.png` → image, `.mp4`/`.webm` → video, `.txt` → text). No explicit `content_type` field is required.

**Supported feedback types:**

| Type | Description |
|---|---|
| `radio` | Single-choice selection from a list of options. |
| `checkbox` | Multi-choice selection from a list of options. |
| `text` | Free-form text input. |

**Example:**

```yaml
data_dir: /data/my_dataset      # path to the dataset directory (mounted into Docker)

content_schema:                 # fixed across all items in this job
  - slot: image                 # logical label for the first content slot
  - slot: caption               # logical label for the second content slot

feedbacks:
  - name: quality
    type: radio
    options:
      - Good
      - Average
      - Poor

  - name: tags
    type: checkbox
    options:
      - Blurry
      - Cropped
      - Well-lit

  - name: notes
    type: text
```

### 4.2 Dataset CSV

A minimal file listing items and their content paths. Content types are inferred from extensions, so the CSV only needs two columns.

| Column | Description |
|---|---|
| `item_id` | Unique identifier for each item. |
| `content_paths` | Pipe-separated (`\|`) list of file paths relative to `data_dir`, in the same order as `content_schema` slots. |

**Example:**

```csv
item_id,content_paths
001,imgs/001.jpg|captions/001.txt
002,imgs/002.png|captions/002.txt
003,clips/003.mp4|captions/003.txt
```

The number of paths per row must match the number of slots defined in `content_schema`.

### 4.3 Dataset Directory

The directory containing all media files referenced in the CSV. Its path is declared in `annot_spec.yml` under `data_dir` and mounted into the Docker container at runtime.

---

## 5. Annotator Interface

### 5.1 Layout

The UI is divided into two regions:

**Left Sidebar**

- **Top (scrollable) — Item List:** All items for the active task, each showing its `item_id` and completion status.
- **Bottom — Stats Panel:**
  - Completion count and progress bar (e.g. `34 / 120 annotated`).
  - **Save** button — saves the current item's annotation.
  - **Export** button — downloads the full annotation CSV for the active job.

**Main Content Area**

- **Header:** Displays the current `item_id`.
- **Content Panel:** Renders all content slots for the item in a responsive, centered grid layout. Content type is determined from the file extension:

  | Extension | Rendering |
  |---|---|
  | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` | `<img>` element |
  | `.mp4`, `.webm`, `.ogg` | HTML5 `<video>` player with thumbnail preview; playback is not required before submitting feedback. |
  | `.txt` | Styled text block |

- **Feedback Panel (bottom):** All feedback fields from `annot_spec.yml`, rendered as radio buttons, checkboxes, or text inputs.
- **Action Bar:** Save (current item) and Next Item buttons.

### 5.2 Persistence and Resume

- All annotations are written to SQLite on every save action.
- If an annotator closes the browser or navigates away, their progress is retained.
- Any annotator can reopen the job and continue from where it was left off.

---

## 6. Annotation Export

Clicking **Export** downloads a CSV that expands the input dataset CSV with one additional column per feedback field.

**Example output:**

```csv
item_id,content_paths,quality,tags,notes
001,imgs/001.jpg|captions/001.txt,Good,Well-lit,Looks great
002,imgs/002.png|captions/002.txt,Poor,"Blurry,Cropped",
003,clips/003.mp4|captions/003.txt,Average,,
```

---

## 7. Technical Stack and Hosting

### 7.1 Stack

| Layer | Technology |
|---|---|
| Backend | Python (FastAPI or Flask) |
| Frontend | React |
| Database | SQLite (file-based, persisted to a Docker volume) |
| Containerisation | Docker (multi-stage build using slim/alpine public images) |

### 7.2 Docker

- The application is fully Dockerized. The host machine only needs Docker installed — no Python, Node.js, or other runtimes required.
- The dataset directory is mounted into the container as a read-only volume at the path specified in `data_dir`.
- The SQLite database file is written to a named Docker volume so data survives container restarts.
- A `docker-compose.yml` is provided for one-command startup.

**Example startup:**

```bash
docker compose up
```

The app is then available at `http://localhost:3000` and on any device on the same LAN via the host's local IP (e.g. `http://192.168.1.x:3000`).

### 7.3 Browser Compatibility

The frontend targets browsers commonly found in team environments:

- Firefox (ESR and recent stable)
- Chrome / Chromium (recent stable, not bleeding-edge)

No bleeding-edge CSS or JS APIs should be used without a polyfill. Avoid features unavailable in Firefox ESR 115+ and Chrome 110+.

### 7.4 Host Requirements

- Ubuntu 20.04+ or Debian 11+ with Docker installed.
- No other runtime dependencies on the host machine.

---

## 8. Scope — v1.0

| Feature | Included |
|---|---|
| Task list sidebar with item list and progress bar | Yes |
| Save and Export buttons in sidebar | Yes |
| Multi-modal content rendering (text, image, video) | Yes |
| Content type inferred from file extension | Yes |
| Radio, checkbox, and text feedback types | Yes |
| Save and next-item navigation | Yes |
| YAML annotation spec (content schema + feedback fields + data dir) | Yes |
| Pipe-separated CSV dataset input | Yes |
| SQLite persistence with session resume | Yes |
| CSV export with annotation columns | Yes |
| Dockerized deployment, LAN-accessible | Yes |
| Browser backward compatibility (Firefox ESR, Chrome 110+) | Yes |
| Conditional feedback fields | No |
| User management / authentication | No (v2) |
| Task batching / parallel annotation | No (v2) |
| Full analytics with per-item metadata export | No (v2) |
| Task type templates | No (v2) |

---

## 9. Future Improvements (v2 Roadmap)

### 9.1 Task Type Templates

Derive a reusable **task type** from the structure of an existing `annot_spec.yml` (content slot count, content types, feedback field count and types). Job creators can then start a new job by selecting a saved task type and pointing to a new data directory — no need to author a new spec file from scratch.

### 9.2 User Management

- Annotator accounts with login.
- Track which annotator completed which items.
- Audit trail: record `annotator_id` and `last_updated_at` per annotation row in SQLite and in the export CSV.

### 9.3 Full Analytics

- Per-item `last_updated_at` timestamp persisted to SQLite.
- ETA estimation based on current annotation velocity.
- Exportable analytics report: completion rate, annotator throughput, and inter-annotator agreement hints.
- Progress detail visible in the sidebar stats panel.

### 9.4 Job Management and Parallel Annotation

- A dedicated **Job Dashboard** page: view all jobs, their status, and assigned annotators.
- Split a job into batches so multiple annotators can work on non-overlapping subsets in parallel.
- Batch assignment UI: assign batches to specific annotators or allow self-assignment.

---

## 10. Decisions Log

| # | Question | Decision |
|---|---|---|
| 1 | Persist to SQLite continuously or only on export? | SQLite, written on every save action. |
| 2 | Is partial progress saved if the browser is closed? | Yes. Any annotator can resume the job later. |
| 3 | Must video be watched before submitting feedback? | No. Thumbnail preview is sufficient; playback is optional. |
| 4 | Support conditional feedback fields? | Not required for v1. |

---

## 11. Glossary

| Term | Definition |
|---|---|
| **Job** | A complete annotation task defined by an `annot_spec.yml`, a dataset CSV, and a dataset directory. |
| **Item** | A single row in the dataset CSV representing one unit to be annotated. |
| **Content Slot** | A single piece of content within an item (e.g. one image, one caption). The number and type of slots is fixed per job. |
| **Feedback** | A structured response collected from an annotator for a given item. |
| **Task Type** | (v2) A reusable job template derived from the structure of a spec file. |
| **Batch** | (v2) A non-overlapping subset of items from a job assigned to a specific annotator. |
