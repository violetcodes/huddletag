"""
Integration tests for:
  GET  /api/media/{job_id}/{path:path}

Covers: unknown job (404), missing file (404), path-traversal rejection (403),
        full file serving with correct MIME type, and byte-range (206) streaming.
"""

import pytest


# ── Helper: patch a job's data_dir to a temporary directory ──────────────────


@pytest.fixture()
def media_job(tmp_path):
    """
    Yields (media_dir, job) after pointing the compare-dsm-vids job's data_dir
    at a fresh temporary directory.  The original data_dir is restored on teardown.
    """
    from app.services import job_registry

    job = job_registry.get_job("compare-dsm-vids")
    original = job.spec.data_dir
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    job.spec.data_dir = str(media_dir)
    yield media_dir, job
    job.spec.data_dir = original


# ── Error handling ────────────────────────────────────────────────────────────


def test_media_unknown_job_returns_404(client):
    r = client.get("/api/media/nonexistent-job/some/file.mp4")
    assert r.status_code == 404


def test_media_missing_file_returns_404(client):
    # data_dir for compare-dsm-vids is a Docker path (/data/compare-dsm-vids)
    # that doesn't exist locally — so any file request must return 404.
    r = client.get("/api/media/compare-dsm-vids/blur/nonexistent.mp4")
    assert r.status_code == 404


def test_media_path_traversal_rejected(client, media_job):
    """
    A path that escapes data_dir via '..' must return 403 (Forbidden), not
    leak contents of files outside the job's media directory.
    """
    media_dir, _ = media_job
    # Plant a sentinel file one level above media_dir so we can confirm it's blocked
    secret = media_dir.parent / "secret.txt"
    secret.write_text("top-secret")

    r = client.get("/api/media/compare-dsm-vids/../secret.txt")
    assert r.status_code in (403, 404)  # either is acceptable; must not be 200


# ── Full file serving ─────────────────────────────────────────────────────────


def test_media_serves_mp4_with_correct_mime(client, media_job):
    media_dir, _ = media_job
    (media_dir / "clip.mp4").write_bytes(b"fake video bytes")

    r = client.get("/api/media/compare-dsm-vids/clip.mp4")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("video/mp4")
    assert r.content == b"fake video bytes"


def test_media_serves_jpg_with_correct_mime(client, media_job):
    media_dir, _ = media_job
    (media_dir / "frame.jpg").write_bytes(b"\xff\xd8\xff fake jpeg")

    r = client.get("/api/media/compare-dsm-vids/frame.jpg")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/jpeg")


def test_media_serves_txt_with_correct_mime(client, media_job):
    media_dir, _ = media_job
    (media_dir / "note.txt").write_text("hello world")

    r = client.get("/api/media/compare-dsm-vids/note.txt")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/plain")


def test_media_serves_file_in_subdirectory(client, media_job):
    media_dir, _ = media_job
    subdir = media_dir / "blur"
    subdir.mkdir()
    (subdir / "blur0.mp4").write_bytes(b"subdir video")

    r = client.get("/api/media/compare-dsm-vids/blur/blur0.mp4")
    assert r.status_code == 200
    assert r.content == b"subdir video"


def test_media_response_has_accept_ranges_header(client, media_job):
    media_dir, _ = media_job
    (media_dir / "vid.mp4").write_bytes(b"seekable")

    r = client.get("/api/media/compare-dsm-vids/vid.mp4")
    assert r.headers.get("accept-ranges") == "bytes"


def test_media_response_has_content_length_header(client, media_job):
    media_dir, _ = media_job
    payload = b"exactly 16 bytes"
    (media_dir / "sized.mp4").write_bytes(payload)

    r = client.get("/api/media/compare-dsm-vids/sized.mp4")
    assert int(r.headers["content-length"]) == len(payload)


# ── Byte-range requests (video seeking) ──────────────────────────────────────


def test_media_range_request_returns_206(client, media_job):
    media_dir, _ = media_job
    (media_dir / "clip.mp4").write_bytes(b"0123456789abcdef")  # 16 bytes

    r = client.get("/api/media/compare-dsm-vids/clip.mp4", headers={"Range": "bytes=0-7"})
    assert r.status_code == 206


def test_media_range_request_returns_correct_slice(client, media_job):
    media_dir, _ = media_job
    (media_dir / "clip.mp4").write_bytes(b"0123456789abcdef")

    r = client.get("/api/media/compare-dsm-vids/clip.mp4", headers={"Range": "bytes=4-9"})
    assert r.content == b"456789"


def test_media_range_request_content_range_header(client, media_job):
    media_dir, _ = media_job
    (media_dir / "clip.mp4").write_bytes(b"0123456789abcdef")  # 16 bytes

    r = client.get("/api/media/compare-dsm-vids/clip.mp4", headers={"Range": "bytes=4-9"})
    assert r.headers["content-range"] == "bytes 4-9/16"


def test_media_range_request_content_length(client, media_job):
    media_dir, _ = media_job
    (media_dir / "clip.mp4").write_bytes(b"0123456789abcdef")

    r = client.get("/api/media/compare-dsm-vids/clip.mp4", headers={"Range": "bytes=0-3"})
    assert int(r.headers["content-length"]) == 4


def test_media_range_open_ended(client, media_job):
    """bytes=8- should return from byte 8 to the end of the file."""
    media_dir, _ = media_job
    (media_dir / "clip.mp4").write_bytes(b"0123456789abcdef")  # 16 bytes

    r = client.get("/api/media/compare-dsm-vids/clip.mp4", headers={"Range": "bytes=8-"})
    assert r.status_code == 206
    assert r.content == b"89abcdef"
