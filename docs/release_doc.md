# HuddleTag — Release Summary

**HuddleTag** is a self-hosted, browser-based annotation tool for multi-modal datasets. Teams use it to review side-by-side video pairs, image+video comparisons, or image+text items and submit structured feedback — radio choices, checkboxes, and free-text comments — all driven by a declarative `annot_spec.yml` + `dataset.csv` job format with no coding required from annotators.

## Key Features (current release)

- **Multi-modal content rendering** — video pairs with synchronized play/seek, image zoom & pan, scrollable text; any combination of slots per item
- **Structured feedback forms** — radio, checkbox, and text fields defined in YAML; results exported as a merged CSV in one click
- **Job management** — upload a `.zip` from the browser UI or drop folders into the jobs directory; new jobs appear within 10 seconds via hot-reload (no restart needed)
- **S3 media backend** — set `data_dir: s3://bucket/prefix` in your job spec; backend issues presigned redirects so media loads directly from S3
- **Annotator productivity** — keyboard shortcuts (`→`/`←` navigate, `Ctrl+S` saves, `1–9` select radio options), session timer with avg-per-item and ETA, dark/light mode
- **Zero-friction deployment** — single `docker compose up --build` starts the full stack (FastAPI + nginx); tiered AWS credential support via env vars, `~/.aws`, or EC2 IAM role

## When to Prefer HuddleTag over CVAT

- **Skip the ops overhead** — no need to create projects, define label sets, assign tasks, or manage annotator accounts before work can begin; drop a spec + CSV and annotators are ready in minutes
- **Multi-modal or composite items** — tasks that present multiple content pieces together (e.g. video pairs, prompt + output image, video + transcript) and collect a single structured judgement are not natively supported in CVAT
- **Preference / ranking / QA tasks** — side-by-side comparison, quality rating, LLM output evaluation, and open-vocab tagging map naturally to HuddleTag's radio/checkbox/text form model

> **Supported content types:** text, image, video — audio support is planned.

## When Not to Use HuddleTag

HuddleTag collects structured form responses per item; it does not provide drawing or selection tools. Avoid it for tasks that require:

- Bounding boxes, polygons, or segmentation masks
- Keypoint / pose annotation
- Text span highlighting or NER tagging
- Any annotation that must be spatially attached to a region of the content
