"""
Integration tests for:
  GET  /api/jobs/{job_id}/items
"""

# ── Basic listing ─────────────────────────────────────────────────────────────


def test_list_items_compare_dsm_vids_count(client):
    r = client.get("/api/jobs/compare-dsm-vids/items")
    assert r.status_code == 200
    assert len(r.json()) == 6


def test_list_items_compare_dsm_vids_order_and_ids(client):
    items = client.get("/api/jobs/compare-dsm-vids/items").json()
    ids = [i["item_id"] for i in items]
    assert ids == ["pair_001", "pair_002", "pair_003", "pair_004", "pair_005", "pair_006"]


def test_list_items_content_paths_pair_001(client):
    items = {i["item_id"]: i for i in client.get("/api/jobs/compare-dsm-vids/items").json()}
    assert items["pair_001"]["content_paths"] == ["blur/blur0.mp4", "night/night2.mp4"]


def test_list_items_content_paths_pair_003(client):
    items = {i["item_id"]: i for i in client.get("/api/jobs/compare-dsm-vids/items").json()}
    assert items["pair_003"]["content_paths"] == ["night/night3.mp4", "misc/reflection.mp4"]


def test_list_items_multimodal_count(client):
    r = client.get("/api/jobs/multimodal/items")
    assert r.status_code == 200
    assert len(r.json()) == 5


# ── is_annotated flag ─────────────────────────────────────────────────────────


def test_list_items_all_unannotated_initially(client):
    items = client.get("/api/jobs/compare-dsm-vids/items").json()
    assert all(not i["is_annotated"] for i in items)


def test_list_items_is_annotated_true_after_save(client):
    client.post(
        "/api/jobs/compare-dsm-vids/annotations/pair_003",
        json={"values": {"preferred_video": "Video B", "reason": "better"}},
    )
    items = {i["item_id"]: i for i in client.get("/api/jobs/compare-dsm-vids/items").json()}
    assert items["pair_003"]["is_annotated"] is True


def test_list_items_other_items_remain_unannotated(client):
    client.post(
        "/api/jobs/compare-dsm-vids/annotations/pair_003",
        json={"values": {"preferred_video": "Video B", "reason": ""}},
    )
    items = {i["item_id"]: i for i in client.get("/api/jobs/compare-dsm-vids/items").json()}
    unannotated = [iid for iid, i in items.items() if not i["is_annotated"]]
    assert set(unannotated) == {"pair_001", "pair_002", "pair_004", "pair_005", "pair_006"}


def test_list_items_is_annotated_reflects_upsert_not_double_flag(client):
    """Saving the same item twice must not create a second annotated entry."""
    for _ in range(2):
        client.post(
            "/api/jobs/compare-dsm-vids/annotations/pair_001",
            json={"values": {"preferred_video": "Video A", "reason": ""}},
        )
    items = client.get("/api/jobs/compare-dsm-vids/items").json()
    assert sum(1 for i in items if i["is_annotated"]) == 1


def test_list_items_cross_job_isolation(client):
    """Annotating an item in one job must not affect another job's items."""
    client.post(
        "/api/jobs/compare-dsm-vids/annotations/pair_001",
        json={"values": {"preferred_video": "Video A", "reason": ""}},
    )
    multimodal_items = client.get("/api/jobs/multimodal/items").json()
    assert all(not i["is_annotated"] for i in multimodal_items)


# ── Error handling ────────────────────────────────────────────────────────────


def test_list_items_unknown_job_returns_404(client):
    r = client.get("/api/jobs/nonexistent/items")
    assert r.status_code == 404
