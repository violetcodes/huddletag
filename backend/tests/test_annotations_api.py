"""
Integration tests for:
  GET   /api/jobs/{job_id}/annotations/{item_id}
  POST  /api/jobs/{job_id}/annotations/{item_id}

Covers: create, read-back, upsert (last-write-wins), checkbox values,
        updated_at timestamp, and concurrent writes from two annotators.
"""

import threading

# ── GET before any annotation exists ─────────────────────────────────────────


def test_get_annotation_before_save_returns_404(client):
    r = client.get("/api/jobs/compare-dsm-vids/annotations/pair_001")
    assert r.status_code == 404


# ── POST — create ─────────────────────────────────────────────────────────────


def test_post_annotation_returns_200(client):
    r = client.post(
        "/api/jobs/compare-dsm-vids/annotations/pair_001",
        json={"values": {"preferred_video": "Video A", "reason": "Sharper in low light"}},
    )
    assert r.status_code == 200


def test_post_annotation_response_body(client):
    r = client.post(
        "/api/jobs/compare-dsm-vids/annotations/pair_001",
        json={"values": {"preferred_video": "Video A", "reason": "Sharper in low light"}},
    )
    body = r.json()
    assert body["item_id"] == "pair_001"
    assert body["values"]["preferred_video"] == "Video A"
    assert body["values"]["reason"] == "Sharper in low light"


def test_post_annotation_response_contains_updated_at(client):
    r = client.post(
        "/api/jobs/compare-dsm-vids/annotations/pair_001",
        json={"values": {"preferred_video": "Video B", "reason": ""}},
    )
    assert "updated_at" in r.json()
    # Basic ISO-8601 sanity check
    assert r.json()["updated_at"].endswith("Z")


# ── GET after POST ────────────────────────────────────────────────────────────


def test_get_annotation_returns_saved_values(client):
    client.post(
        "/api/jobs/compare-dsm-vids/annotations/pair_001",
        json={"values": {"preferred_video": "Video A", "reason": "clear"}},
    )
    r = client.get("/api/jobs/compare-dsm-vids/annotations/pair_001")
    assert r.status_code == 200
    body = r.json()
    assert body["item_id"] == "pair_001"
    assert body["values"]["preferred_video"] == "Video A"
    assert body["values"]["reason"] == "clear"
    assert "updated_at" in body


# ── Upsert — last-write-wins ──────────────────────────────────────────────────


def test_annotation_upsert_overwrites_previous_values(client):
    client.post(
        "/api/jobs/compare-dsm-vids/annotations/pair_002",
        json={"values": {"preferred_video": "Video A", "reason": "first write"}},
    )
    client.post(
        "/api/jobs/compare-dsm-vids/annotations/pair_002",
        json={"values": {"preferred_video": "Video B", "reason": "second write"}},
    )
    r = client.get("/api/jobs/compare-dsm-vids/annotations/pair_002")
    assert r.json()["values"]["preferred_video"] == "Video B"
    assert r.json()["values"]["reason"] == "second write"


def test_annotation_upsert_updates_timestamp(client):
    r1 = client.post(
        "/api/jobs/compare-dsm-vids/annotations/pair_002",
        json={"values": {"preferred_video": "Video A", "reason": ""}},
    )
    r2 = client.post(
        "/api/jobs/compare-dsm-vids/annotations/pair_002",
        json={"values": {"preferred_video": "Video B", "reason": ""}},
    )
    # Second write must have an equal or later timestamp
    assert r2.json()["updated_at"] >= r1.json()["updated_at"]


# ── Checkbox values (multimodal job) ──────────────────────────────────────────


def test_checkbox_annotation_stored_as_list(client):
    r = client.post(
        "/api/jobs/multimodal/annotations/001",
        json={"values": {"issue_source": ["img", "video"], "comment": "both issues"}},
    )
    assert r.status_code == 200
    assert r.json()["values"]["issue_source"] == ["img", "video"]


def test_checkbox_annotation_round_trip(client):
    client.post(
        "/api/jobs/multimodal/annotations/001",
        json={"values": {"issue_source": ["img"], "comment": "image only"}},
    )
    r = client.get("/api/jobs/multimodal/annotations/001")
    assert r.json()["values"]["issue_source"] == ["img"]
    assert r.json()["values"]["comment"] == "image only"


def test_checkbox_empty_selection(client):
    r = client.post(
        "/api/jobs/multimodal/annotations/002",
        json={"values": {"issue_source": [], "comment": "looks fine"}},
    )
    assert r.status_code == 200
    assert r.json()["values"]["issue_source"] == []


# ── Error handling ────────────────────────────────────────────────────────────


def test_post_annotation_unknown_job_returns_404(client):
    r = client.post(
        "/api/jobs/nonexistent/annotations/pair_001",
        json={"values": {}},
    )
    assert r.status_code == 404


def test_post_annotation_unknown_item_returns_404(client):
    r = client.post(
        "/api/jobs/compare-dsm-vids/annotations/does_not_exist",
        json={"values": {}},
    )
    assert r.status_code == 404


def test_get_annotation_unknown_job_returns_404(client):
    r = client.get("/api/jobs/nonexistent/annotations/pair_001")
    assert r.status_code == 404


# ── Concurrent writes — two annotators posting to the same item ───────────────


def test_concurrent_writes_both_succeed(client):
    """
    Simulates two annotators submitting annotations for the same item at the
    same time (spec §2, decision #2 and #3 — last-write-wins, no error).
    Both requests must return HTTP 200 and the DB must hold exactly one row
    with a valid value.
    """
    results: dict[str, int] = {}
    errors: list[Exception] = []

    def write(value: str, key: str) -> None:
        try:
            r = client.post(
                "/api/jobs/compare-dsm-vids/annotations/pair_005",
                json={"values": {"preferred_video": value, "reason": f"from {key}"}},
            )
            results[key] = r.status_code
        except Exception as exc:
            errors.append(exc)

    threads = [
        threading.Thread(target=write, args=("Video A", "annotator_1")),
        threading.Thread(target=write, args=("Video B", "annotator_2")),
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert not errors, f"Unexpected exceptions during concurrent writes: {errors}"
    assert results.get("annotator_1") == 200
    assert results.get("annotator_2") == 200

    # DB must have exactly one row for this item
    r = client.get("/api/jobs/compare-dsm-vids/annotations/pair_005")
    assert r.status_code == 200
    assert r.json()["values"]["preferred_video"] in ("Video A", "Video B")


def test_concurrent_writes_to_different_items(client):
    """
    Two annotators working on *different* items in the same job concurrently —
    both must succeed and be independently readable.
    """
    results: dict[str, int] = {}
    errors: list[Exception] = []

    def write(item_id: str, value: str) -> None:
        try:
            r = client.post(
                f"/api/jobs/compare-dsm-vids/annotations/{item_id}",
                json={"values": {"preferred_video": value, "reason": ""}},
            )
            results[item_id] = r.status_code
        except Exception as exc:
            errors.append(exc)

    threads = [
        threading.Thread(target=write, args=("pair_001", "Video A")),
        threading.Thread(target=write, args=("pair_002", "Video B")),
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert not errors
    assert results["pair_001"] == 200
    assert results["pair_002"] == 200

    assert client.get("/api/jobs/compare-dsm-vids/annotations/pair_001").json()["values"]["preferred_video"] == "Video A"
    assert client.get("/api/jobs/compare-dsm-vids/annotations/pair_002").json()["values"]["preferred_video"] == "Video B"


def test_concurrent_writes_across_different_jobs(client):
    """
    Two annotators working on *different jobs* simultaneously — no cross-job
    interference.
    """
    results: dict[str, int] = {}
    errors: list[Exception] = []

    def write_dsm():
        try:
            r = client.post(
                "/api/jobs/compare-dsm-vids/annotations/pair_006",
                json={"values": {"preferred_video": "Video A", "reason": "dsm worker"}},
            )
            results["dsm"] = r.status_code
        except Exception as exc:
            errors.append(exc)

    def write_multimodal():
        try:
            r = client.post(
                "/api/jobs/multimodal/annotations/003",
                json={"values": {"issue_source": ["img"], "comment": "multimodal worker"}},
            )
            results["multimodal"] = r.status_code
        except Exception as exc:
            errors.append(exc)

    threads = [
        threading.Thread(target=write_dsm),
        threading.Thread(target=write_multimodal),
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert not errors
    assert results["dsm"] == 200
    assert results["multimodal"] == 200

    dsm_r = client.get("/api/jobs/compare-dsm-vids/annotations/pair_006")
    assert dsm_r.json()["values"]["preferred_video"] == "Video A"

    mm_r = client.get("/api/jobs/multimodal/annotations/003")
    assert mm_r.json()["values"]["issue_source"] == ["img"]
