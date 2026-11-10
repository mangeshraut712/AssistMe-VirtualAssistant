"""POST /api/files/upload-multiple must not report success when every file is rejected."""
from fastapi.testclient import TestClient

from app.main import app
from tests.support import expect


def test_upload_multiple_reports_failure_when_every_file_is_rejected():
    client = TestClient(app)
    response = client.post(
        "/api/files/upload-multiple",
        files=[
            ("files", ("run.exe", b"nope", "application/octet-stream")),
            ("files", ("payload.bin", b"", "application/octet-stream")),
        ],
    )
    expect(response.status_code == 200, "the route still returns one response for the batch")
    body = response.json()
    expect(body["success"] is False, "success must be false when every file failed")
    expect(len(body["files"]) == 2, "each rejected file should be listed")
    expect(all("error" in item for item in body["files"]), "each item should carry an error")


def test_upload_multiple_reports_success_when_every_file_is_saved(monkeypatch, tmp_path):
    import importlib
    file_service_module = importlib.import_module("app.services.file_service")
    monkeypatch.setattr(file_service_module, "UPLOAD_DIR", tmp_path)
    client = TestClient(app)
    response = client.post(
        "/api/files/upload-multiple",
        files=[("files", ("notes.txt", b"hello", "text/plain"))],
    )
    expect(response.status_code == 200, "a valid text upload should be accepted")
    body = response.json()
    expect(body["success"] is True, "success must be true when every file saved")
    expect(len(body["files"]) == 1, "the saved file should be listed")
    expect("error" not in body["files"][0], "a saved file should not carry an error")
    expect("path" not in body["files"][0], "the server path must stay hidden")


def test_upload_multiple_is_not_success_when_the_batch_is_mixed(monkeypatch, tmp_path):
    import importlib
    file_service_module = importlib.import_module("app.services.file_service")
    monkeypatch.setattr(file_service_module, "UPLOAD_DIR", tmp_path)
    client = TestClient(app)
    response = client.post(
        "/api/files/upload-multiple",
        files=[
            ("files", ("notes.txt", b"hello", "text/plain")),
            ("files", ("run.exe", b"nope", "application/octet-stream")),
        ],
    )
    body = response.json()
    expect(body["success"] is False, "a mixed batch is not a full success")
    expect(len(body["files"]) == 2, "both outcomes should be listed")
    expect(sum("error" in item for item in body["files"]) == 1, "one file should fail")
