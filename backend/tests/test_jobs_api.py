"""
Integration tests for:
  GET  /api/jobs
  GET  /api/jobs/{job_id}/spec
"""

EXPECTED_JOBS = {"compare-dsm-vids", "multimodal"}

# ── GET /api/jobs ──────────────────────────────────────────────────────────────


def test_list_jobs_returns_both_sample_jobs(client):
    r = client.get("/api/jobs")
    assert r.status_code == 200
    job_ids = {j["job_id"] for j in r.json()}
    assert job_ids == EXPECTED_JOBS


def test_list_jobs_response_schema(client):
    r = client.get("/api/jobs")
    for job in r.json():
        assert set(job.keys()) == {"job_id", "item_count", "annotated_count"}


def test_list_jobs_item_counts(client):
    jobs = {j["job_id"]: j for j in client.get("/api/jobs").json()}
    assert jobs["compare-dsm-vids"]["item_count"] == 6
    assert jobs["multimodal"]["item_count"] == 5


def test_list_jobs_annotated_count_starts_at_zero(client):
    for job in client.get("/api/jobs").json():
        assert job["annotated_count"] == 0


def test_list_jobs_annotated_count_increments_after_save(client):
    client.post(
        "/api/jobs/compare-dsm-vids/annotations/pair_001",
        json={"values": {"preferred_video": "Video A", "reason": ""}},
    )
    jobs = {j["job_id"]: j for j in client.get("/api/jobs").json()}
    assert jobs["compare-dsm-vids"]["annotated_count"] == 1
    # Cross-job isolation: multimodal must stay at 0
    assert jobs["multimodal"]["annotated_count"] == 0


def test_list_jobs_annotated_count_does_not_double_count_upsert(client):
    """Updating the same item twice must not inflate annotated_count."""
    for _ in range(3):
        client.post(
            "/api/jobs/compare-dsm-vids/annotations/pair_001",
            json={"values": {"preferred_video": "Video A", "reason": "re-save"}},
        )
    jobs = {j["job_id"]: j for j in client.get("/api/jobs").json()}
    assert jobs["compare-dsm-vids"]["annotated_count"] == 1


# ── GET /api/jobs/{job_id}/spec ───────────────────────────────────────────────


def test_get_spec_compare_dsm_vids_content_schema(client):
    spec = client.get("/api/jobs/compare-dsm-vids/spec").json()
    assert [s["slot"] for s in spec["content_schema"]] == ["video_a", "video_b"]


def test_get_spec_compare_dsm_vids_feedbacks(client):
    spec = client.get("/api/jobs/compare-dsm-vids/spec").json()
    feedbacks = {f["name"]: f for f in spec["feedbacks"]}

    assert feedbacks["preferred_video"]["type"] == "radio"
    assert set(feedbacks["preferred_video"]["options"]) == {"Video A", "Video B"}

    assert feedbacks["reason"]["type"] == "text"
    assert feedbacks["reason"]["options"] is None


def test_get_spec_multimodal_content_schema(client):
    spec = client.get("/api/jobs/multimodal/spec").json()
    assert [s["slot"] for s in spec["content_schema"]] == ["image", "video"]


def test_get_spec_multimodal_feedbacks(client):
    spec = client.get("/api/jobs/multimodal/spec").json()
    feedbacks = {f["name"]: f for f in spec["feedbacks"]}

    assert feedbacks["issue_source"]["type"] == "checkbox"
    assert set(feedbacks["issue_source"]["options"]) == {"img", "video"}

    assert feedbacks["comment"]["type"] == "text"
    assert feedbacks["comment"]["options"] is None


def test_get_spec_unknown_job_returns_404(client):
    r = client.get("/api/jobs/nonexistent/spec")
    assert r.status_code == 404
