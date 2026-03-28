# HuddleTag v2 — Feature Plan

**Date:** 2026-03-28  
**Status:** Phase 1–3 shipped; Phase 4 pending  
**Scope:** Everything deferred from v1, plus new features gathered from feedback.

---

## Context

v1 shipped a working single-user annotation tool: multi-job loading, media streaming, structured feedback forms (radio/checkbox/text), CSV export, and a Docker deployment. Phases 1–3 have since been implemented, adding dark mode, keyboard shortcuts, session timer, SCP snippet, feature-rich media rendering, job zip download, hot-reload, job upload, and S3 media backend. Phase 4 (identity, per-annotator rows, assignment, analytics) remains pending.

---

## Feature List — Ordered by Complexity & Effort

---

### Tier 1 — Low-Hanging Fruit (hours each)

#### 1. Git Repo + Public GitHub Push ✅ Shipped
**Effort:** ~15 min  
**Depends on:** nothing

Initialize the repo, wire up `.gitignore` (already exists), commit everything, push to a public GitHub repository via `gh repo create`.  
Unblocks collaboration, versioning, and issue tracking for all subsequent work.

---

#### 2. README Update + Commit Sample Images ✅ Shipped
**Effort:** ~30 min  
**Depends on:** 1

Update `README.md` with:
- A "Quick Start with local media" section showing exactly how to mount a local media folder into Docker.
- A note on the `docs/` folder for specs and planning docs.
- Commit a small sample image or note its path convention for the `imgen-eval` sample job.

---

#### 3. Dark / Light Mode Toggle ✅ Shipped
**Effort:** 2–3 hrs  
**Depends on:** nothing

The existing UI is effectively dark. Add a CSS custom-properties layer (`--bg`, `--surface`, `--text`, `--border`, etc.) that maps to two themes. A toggle button (sun/moon icon) in the top bar writes to `localStorage` and flips `data-theme` on `<html>`. System preference (`prefers-color-scheme`) is the default on first load.

Zero backend changes. No new dependencies if using native CSS variables.

---

#### 4. Keyboard Shortcuts ✅ Shipped
**Effort:** 2–3 hrs  
**Depends on:** nothing

Add a `useKeyboardShortcuts` hook attached to `AnnotatorView`. Mappings:

| Key | Action |
|---|---|
| `→` / `n` | Next item |
| `←` / `p` | Previous item |
| `Ctrl+S` | Save current annotation |
| `1`–`9`, `0` | Select radio option at index 0–9 (only when active field ≤ 10 options) |
| `?` | Toggle shortcut cheat-sheet overlay |

Number keys operate on whichever radio field currently has focus, or the first radio field if none is focused. Keys are ignored when a text `<input>` or `<textarea>` has focus to avoid accidental triggers.

---

#### 5. Progress ETA + Time-Spent Counter ✅ Shipped
**Effort:** 2–3 hrs  
**Depends on:** nothing

Store `sessionStart = Date.now()` in a ref when the annotator enters a job. Track how many items have been saved *this session*. Derive:

- **Time spent:** live running clock (HH:MM:SS).
- **Avg per item:** `timeSpent / savedThisSession`.
- **ETA to completion:** `itemsRemaining × avgPerItem`.

Display in `StatsPanel` alongside the existing progress bar. No backend changes. ETA only shows once at least one item has been saved in the session.

---

#### 6. SCP Snippet for Local-Network Job Upload ✅ Shipped
**Effort:** ~1 hr  
**Depends on:** nothing

On the Job Selector page, add a collapsible "Add a job" info card. It reads `window.location.hostname` and renders a ready-to-copy snippet:

```bash
scp -r /path/to/your-job/ <user>@<detected-host>:/mounted/jobs/
```

Then restart the server (or, once hot-reload lands, just refresh). No backend changes.

---

### Tier 2 — Medium Effort (days each)

#### 7. Feature-Rich Media Rendering ✅ Shipped
**Effort:** 1–2 days  
**Depends on:** nothing (pure frontend)

Three targeted enhancements to the content panel:

**7a. Scrollable long-text boxes**  
`TextSlot` gains `max-height` + `overflow-y: auto` with a subtle inner shadow to hint at scrollability. If the text exceeds a threshold (e.g. 300 px), a "Expand" toggle reveals the full content.

**7b. Image zoom & pan**  
`ImageSlot` wraps the `<img>` in a lightweight pan-zoom container. On hover, scroll-wheel zooms (CSS `transform: scale()`); drag pans. A reset button returns to fit-view. No extra library needed — ~80 lines of pointer-event logic — but `react-zoom-pan-pinch` is an acceptable drop-in if needed.

**7c. Synchronized multi-video playback**  
When the content schema has two or more video slots, a **sync bar** appears above the videos:
- **Play All / Pause All** — a single button that calls `.play()` / `.pause()` on all `<video>` refs simultaneously.
- **Seek sync** — when the user scrubs one video, all others jump to the same timestamp.
- If videos have different lengths, the shorter ones stop at their end; the longer one keeps playing (comparison is the point).
- Each video retains its own individual controls for independent use.

Implementation: collect `ref`s in `ContentGrid`, pass a shared `syncController` context down to each `VideoSlot`.

---

#### 8. Download Sample Job Zip ✅ Shipped
**Effort:** 3–4 hrs  
**Depends on:** nothing

Backend: `GET /api/sample-job.zip` — dynamically zips the `compare-dsm-vids` (or a purpose-built minimal) job folder into a streaming response using Python's `zipfile` + `StreamingResponse`.  
Frontend: a "Download sample job" button on the Job Selector page. Annotators and admins use this to understand the expected folder structure before uploading their own job.

---

#### 9. Job Upload via Zip (UI) ✅ Shipped
**Effort:** 6–8 hrs  
**Depends on:** 10 (hot-reload)

Backend: `POST /api/jobs/upload` — accepts a multipart zip. Validates it contains `annot_spec.yml` + `dataset.csv` at the root level, then extracts to `{JOBS_DIR}/{job_name}/`. Triggers a job registry reload.  
Frontend: drag-and-drop file picker on the Job Selector page. Shows upload progress and validation errors (missing files, malformed YAML, etc.).  
The SCP snippet (feature 6) stays as a power-user alternative for large media sets.

---

#### 10. Hot-Reload of Jobs (No Restart Required) ✅ Shipped
**Effort:** 4–6 hrs  
**Depends on:** nothing  
*Noted as a v2 concern in `tech_spec.md`.*

Backend: replace the one-time startup scan with a background task (using `watchdog` or a periodic `asyncio` coroutine) that monitors `JOBS_DIR` for new/removed subdirectories and updates the in-memory registry.  
Frontend: TanStack Query's `refetchInterval` on the job list already handles UI refresh automatically.

---

#### 11. Conditional Feedback Fields
**Effort:** 6–8 hrs  
**Depends on:** nothing  
*Out of scope for v1 per `tech_spec.md`.*

Extend `annot_spec.yml` with an optional `show_if` key:

```yaml
- name: reason
  type: text
  show_if:
    field: quality_rating
    value: Poor
```

Backend: spec parser validates and passes `show_if` to the frontend.  
Frontend: `FeedbackForm` evaluates `show_if` conditions reactively against current form state. Hidden fields are excluded from the save payload.

---

#### 12. Job Splitting and Merging
**Effort:** 8–10 hrs  
**Depends on:** nothing

**Split:** given a job, divide its `dataset.csv` into N chunks (by count or by percentage). Create N sub-jobs, each with the same `annot_spec.yml` and a slice of the dataset. Useful for distributing work across annotators before user assignment is available.

**Merge:** given N jobs with identical `annot_spec.yml` fingerprints, combine their `dataset.csv` rows (dedup by `item_id`) and merge their DB annotation rows into a new unified job. Conflicting annotations (same `item_id`, different values) are flagged in the export with a `conflict` column.

Exposed as `POST /api/jobs/{job_id}/split` and `POST /api/jobs/merge`. Small admin UI panel.

---

### Tier 3 — Heavier Lifts (1–2 weeks each)

#### 13. Lightweight Identity — UUID-Based User System
**Effort:** 1–2 days  
**Depends on:** nothing

**Design principle:** no passwords, no session tokens. Knowing a UUID *is* the credential. This is intentionally simple — suitable for trusted teams on a private network.

**How it works:**

1. On first visit to the app (or whenever no identity is stored), a modal prompts: *"Enter your User ID"*. The value is stored in `localStorage` and sent as `X-User-ID: <uuid>` on every API request.
2. If no User ID is provided, the backend treats the request as the `annotator` role (default).
3. On the server, a plain file `JOBS_DIR/../users.yml` (or a path set via env var `USERS_FILE`) maps UUIDs to roles:

```yaml
# users.yml
a1b2c3d4-...:
  role: owner
  display_name: Alice

e5f6a7b8-...:
  role: admin
  display_name: Bob

# Anyone not listed → annotator
```

4. **Roles:**
   - `annotator` — can annotate jobs assigned to them (or all jobs if no assignments exist).
   - `admin` — can manage jobs (upload, split, merge), see all annotators' progress, and update `users.yml` entries except owners.
   - `owner` — all admin capabilities plus can edit any entry in `users.yml`. Owner UUIDs are identified by a separate `OWNER_FILE` path on the server (e.g. `/etc/huddletag/owner_ids`), never editable through the UI. This means ownership is conferred by whoever controls the server, not by a DB record.

5. The backend reads `users.yml` on each request (or caches with a short TTL) so changes take effect without a restart.

**Alignment with future goals:** This design is a clean stepping stone. When/if a proper auth system is needed later (passwords, OAuth, JWTs), the role model and `users.yml` schema remain valid — only the *identification mechanism* changes from "UUID in header" to "verified token". The per-annotator annotation rows (feature 14) slot directly onto this identity layer.

---

#### 14. Per-Annotator Annotation Rows
**Effort:** 1–2 days  
**Depends on:** 13

Change the DB primary key from `(job_id, item_id)` to `(job_id, item_id, user_id)`. Each annotator's response is stored independently.

Migration: existing rows without a `user_id` get a synthetic `user_id = "default"`.

Export adds a `user_id` column. The export endpoint accepts an optional `?user_id=` filter. An admin can export all annotators' responses in one file.

Conflict detection: if two annotators annotate the same item differently, a `conflict` flag is set in the merged export (useful for inter-annotator agreement analysis).

---

#### 15. S3 Support for Media ✅ Shipped
**Effort:** 1–2 days  
**Depends on:** nothing

Extend `annot_spec.yml` with an optional `media_backend` key:

```yaml
media_backend: s3
s3_bucket: my-bucket
s3_prefix: datasets/compare-dsm-vids/
```

Backend:
- Add `boto3` / `aiobotocore` to requirements.
- `media.py` switches between local file streaming and S3 presigned URL generation based on `media_backend`.
- For private buckets, presigned URLs are generated per-request (short TTL). The frontend receives a redirect to the presigned URL, so media loads directly from S3 without proxying through the backend.
- AWS credentials via standard env vars (`AWS_ACCESS_KEY_ID`, etc.) or IAM role if deployed on AWS.

Local file mode remains the default; S3 is opt-in per job.

---

#### 16. Batch Assignment
**Effort:** 2–3 days  
**Depends on:** 13, 14

Assign specific items (or a percentage of the dataset) to specific annotators.

New DB table: `item_assignments (job_id, item_id, user_id)`. If a row exists for a `(job_id, user_id)` pair, that annotator only sees their assigned items. If no assignment exists, the annotator sees all items (current v1 behaviour preserved).

Admin UI: a table view per job where admins can drag items between annotators, or use an "Auto-distribute" button that splits items evenly (or by configurable ratio).

---

#### 17. Analytics Dashboard
**Effort:** 3–5 days  
**Depends on:** 14

A read-only dashboard page, accessible to admins and owners:

- **Per-job:** completion %, items remaining, avg time per item (once per-annotator timing is stored).
- **Per-annotator:** items completed, avg time, last active.
- **Inter-annotator agreement:** Cohen's kappa / Fleiss' kappa for radio fields across annotators who share items. Displayed as a heatmap matrix.
- **Export:** dashboard data exportable as CSV.

Backend: new `GET /api/jobs/{job_id}/analytics` aggregation endpoint.  
Frontend: `recharts` or `chart.js` for visualisations (lightweight, no heavy BI dependency).

---

## Prioritised Roadmap

### Phase 1 — Quick Wins ✅ Complete

| # | Feature | Effort | Status |
|---|---|---|---|
| 1 | Git repo + GitHub push | 15 min | ✅ Shipped |
| 2 | README update | 30 min | ✅ Shipped |
| 3 | Dark / light mode | 2–3 hrs | ✅ Shipped |
| 4 | Keyboard shortcuts | 2–3 hrs | ✅ Shipped |
| 5 | Progress ETA + timer | 2–3 hrs | ✅ Shipped |
| 6 | SCP snippet | 1 hr | ✅ Shipped |

**Total Phase 1: ~1 day**

---

### Phase 2 — Media & UX Polish ✅ Mostly Complete

| # | Feature | Effort | Status |
|---|---|---|---|
| 7 | Feature-rich media rendering (text scroll, image zoom/pan, video sync) | 1–2 days | ✅ Shipped |
| 8 | Download sample job zip | 3–4 hrs | ✅ Shipped |
| 10 | Hot-reload of jobs | 4–6 hrs | ✅ Shipped |
| 11 | Conditional feedback fields | 6–8 hrs | Pending |

**Total Phase 2: ~3–4 days**

---

### Phase 3 — Job Management ✅ Mostly Complete

| # | Feature | Effort | Status |
|---|---|---|---|
| 9 | Job upload via zip (UI) | 6–8 hrs | ✅ Shipped |
| 12 | Job split + merge | 8–10 hrs | Pending |
| 15 | S3 media support | 1–2 days | ✅ Shipped |

**Total Phase 3: ~3–5 days**

---

### Phase 4 — Team & Identity (Pending)

| # | Feature | Effort | Status |
|---|---|---|---|
| 13 | UUID-based user identity + roles | 1–2 days | Pending |
| 14 | Per-annotator annotation rows | 1–2 days | Pending |
| 16 | Batch assignment | 2–3 days | Pending |
| 17 | Analytics dashboard | 3–5 days | Pending |

**Total Phase 4: ~1–2 weeks**

---

## Items From `tech_spec.md` Out-of-Scope List (all now addressed)

| Spec item | Covered by |
|---|---|
| User authentication / annotator accounts | Feature 13 |
| Per-annotator annotation rows | Feature 14 |
| Job management UI (add/remove without restart) | Features 9 + 10 |
| Conditional feedback fields | Feature 11 |
| Analytics dashboard | Feature 17 |
| Batch assignment | Feature 16 |
| Hot-reload of jobs | Feature 10 |

---

## What Is Explicitly Deferred to v3

- OAuth / SSO (Google, GitHub login)
- Annotation review workflow (a second annotator reviews/approves another's answers)
- Webhook / API callbacks on job completion
- Multi-tenant isolation (separate DB per team)
- Real-time collaborative editing (WebSocket-based live cursors)
