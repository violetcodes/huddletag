# HuddleTag — Idea Notes

A locally-hosted web app for collecting structured human feedback (annotations) on text, image, and video datasets. Runs on `localhost:3000`, accessible across a LAN.

---

## Annotator Interface

- **Left sidebar:**
  - Top: scrollable item list (task ID, items to annotate).
  - Bottom: progress bar, stats, Save and Export buttons.
- **Main content area:**
  - Header: current item ID.
  - Content panel: rendered content (text, image, or video) in a centered grid — multiple content pieces per item are supported.
  - Feedback panel: radio buttons, checkboxes, and/or text inputs as defined by the job spec.
  - Action bar: Save and Next Item buttons.

---

## Job Configuration

Two files define a job:

**`annot_spec.yml`** — specifies:
- `data_dir`: root path of the dataset directory.
- `content_schema`: number of content slots per item and their logical labels (type inferred from file extension, consistent across all items).
- `feedbacks`: list of feedback fields (radio, checkbox, or text) with their options.

**Dataset CSV** — two columns:
- `item_id`: unique identifier per item.
- `content_paths`: pipe-separated (`|`) list of file paths relative to `data_dir`, one per content slot.

Content type is inferred from the file extension — no explicit type column needed.

---

## Persistence and Export

- Annotations are saved continuously to SQLite. Progress is preserved if the browser is closed; any annotator can resume the job later.
- Export produces a CSV that expands the input CSV with one column per feedback field.

---

## Hosting

- Fully Dockerized (Python backend + React frontend, slim images).
- Host machine only needs Docker — no other runtime dependencies.
- Compatible with Ubuntu/Debian hosts and Firefox/Chrome browsers (not necessarily latest versions).

---

## Later Improvements (v2)

- **Task type templates:** derive a reusable job template from an existing spec file structure so new jobs can be created from a template + data directory, without writing a new spec from scratch.
- **User management:** annotator accounts; track who annotated what; `annotator_id` and `last_updated_at` per annotation row.
- **Full analytics:** per-item timestamps, annotation velocity, ETA, exportable analytics report.
- **Job dashboard and batching:** view all jobs, split a job into batches, assign batches to annotators for parallel annotation.
