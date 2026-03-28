"""
Integration tests for:
  GET  /api/jobs/{job_id}/export

Verifies: CSV structure, annotated values, empty values for unannotated items,
          pipe-separated content_paths, semicolon-separated checkbox values,
          Content-Disposition header, and per-job isolation.
"""

import csv
import io


def _parse_csv(text: str) -> list[dict[str, str]]:
    """Parse CSV text into a list of row dicts keyed by header."""
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


# ── Response basics ───────────────────────────────────────────────────────────


def test_export_returns_200(client):
    r = client.get("/api/jobs/compare-dsm-vids/export")
    assert r.status_code == 200


def test_export_content_type_is_csv(client):
    r = client.get("/api/jobs/compare-dsm-vids/export")
    assert "text/csv" in r.headers["content-type"]


def test_export_content_disposition_attachment(client):
    r = client.get("/api/jobs/compare-dsm-vids/export")
    cd = r.headers["content-disposition"]
    assert "attachment" in cd


def test_export_filename_contains_job_id(client):
    r = client.get("/api/jobs/compare-dsm-vids/export")
    assert "compare-dsm-vids-annotations.csv" in r.headers["content-disposition"]


# ── CSV structure ─────────────────────────────────────────────────────────────


def test_export_header_row(client):
    rows = _parse_csv(client.get("/api/jobs/compare-dsm-vids/export").text)
    assert list(rows[0].keys()) == ["item_id", "content_paths", "preferred_video", "reason"]


def test_export_all_items_present_when_empty(client):
    rows = _parse_csv(client.get("/api/jobs/compare-dsm-vids/export").text)
    item_ids = [r["item_id"] for r in rows]
    assert item_ids == ["pair_001", "pair_002", "pair_003", "pair_004", "pair_005", "pair_006"]


def test_export_row_count_equals_item_count(client):
    rows = _parse_csv(client.get("/api/jobs/compare-dsm-vids/export").text)
    assert len(rows) == 6


def test_export_content_paths_pipe_separated(client):
    rows = {r["item_id"]: r for r in _parse_csv(client.get("/api/jobs/compare-dsm-vids/export").text)}
    assert rows["pair_001"]["content_paths"] == "blur/blur0.mp4|night/night2.mp4"
    assert rows["pair_003"]["content_paths"] == "night/night3.mp4|misc/reflection.mp4"


# ── Values for annotated vs. unannotated items ────────────────────────────────


def test_export_annotated_item_has_correct_values(client):
    client.post(
        "/api/jobs/compare-dsm-vids/annotations/pair_001",
        json={"values": {"preferred_video": "Video A", "reason": "Sharper image"}},
    )
    rows = {r["item_id"]: r for r in _parse_csv(client.get("/api/jobs/compare-dsm-vids/export").text)}
    assert rows["pair_001"]["preferred_video"] == "Video A"
    assert rows["pair_001"]["reason"] == "Sharper image"


def test_export_unannotated_items_have_empty_feedback_columns(client):
    client.post(
        "/api/jobs/compare-dsm-vids/annotations/pair_001",
        json={"values": {"preferred_video": "Video A", "reason": ""}},
    )
    rows = {r["item_id"]: r for r in _parse_csv(client.get("/api/jobs/compare-dsm-vids/export").text)}
    assert rows["pair_002"]["preferred_video"] == ""
    assert rows["pair_002"]["reason"] == ""


def test_export_partial_annotation_all_items_still_present(client):
    """Exporting a partially-annotated job must include every item row."""
    client.post(
        "/api/jobs/compare-dsm-vids/annotations/pair_003",
        json={"values": {"preferred_video": "Video B", "reason": "better"}},
    )
    rows = _parse_csv(client.get("/api/jobs/compare-dsm-vids/export").text)
    assert len(rows) == 6


def test_export_reflects_latest_upsert(client):
    """Export must show the most recent annotation, not the original one."""
    client.post(
        "/api/jobs/compare-dsm-vids/annotations/pair_002",
        json={"values": {"preferred_video": "Video A", "reason": "first"}},
    )
    client.post(
        "/api/jobs/compare-dsm-vids/annotations/pair_002",
        json={"values": {"preferred_video": "Video B", "reason": "updated"}},
    )
    rows = {r["item_id"]: r for r in _parse_csv(client.get("/api/jobs/compare-dsm-vids/export").text)}
    assert rows["pair_002"]["preferred_video"] == "Video B"
    assert rows["pair_002"]["reason"] == "updated"


# ── Checkbox (multimodal job) ─────────────────────────────────────────────────


def test_export_multimodal_header(client):
    rows = _parse_csv(client.get("/api/jobs/multimodal/export").text)
    assert list(rows[0].keys()) == ["item_id", "content_paths", "issue_source", "comment"]


def test_export_checkbox_values_joined_with_semicolon(client):
    client.post(
        "/api/jobs/multimodal/annotations/001",
        json={"values": {"issue_source": ["img", "video"], "comment": "both bad"}},
    )
    rows = {r["item_id"]: r for r in _parse_csv(client.get("/api/jobs/multimodal/export").text)}
    assert rows["001"]["issue_source"] == "img;video"
    assert rows["001"]["comment"] == "both bad"


def test_export_checkbox_single_value_no_trailing_semicolon(client):
    client.post(
        "/api/jobs/multimodal/annotations/002",
        json={"values": {"issue_source": ["video"], "comment": ""}},
    )
    rows = {r["item_id"]: r for r in _parse_csv(client.get("/api/jobs/multimodal/export").text)}
    assert rows["002"]["issue_source"] == "video"


# ── Cross-job isolation ───────────────────────────────────────────────────────


def test_export_job_isolation(client):
    """Annotations in one job must not appear in another job's export."""
    client.post(
        "/api/jobs/compare-dsm-vids/annotations/pair_001",
        json={"values": {"preferred_video": "Video A", "reason": "isolated"}},
    )
    # multimodal export must remain entirely empty
    rows = _parse_csv(client.get("/api/jobs/multimodal/export").text)
    assert all(r["issue_source"] == "" for r in rows)


# ── Error handling ────────────────────────────────────────────────────────────


def test_export_unknown_job_returns_404(client):
    r = client.get("/api/jobs/nonexistent/export")
    assert r.status_code == 404
