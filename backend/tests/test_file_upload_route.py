"""Unit test contracts for /api/files/upload endpoint."""

import importlib
from fastapi.testclient import TestClient
from app.main import app
from tests.support import expect


def test_upload_text_file_success(monkeypatch, tmp_path):
    """Uploading a plain text file succeeds, saves content, extracts text, and hides server path."""
    file_service_module = importlib.import_module("app.services.file_service")
    monkeypatch.setattr(file_service_module, "UPLOAD_DIR", tmp_path)
    client = TestClient(app)

    response = client.post(
        "/api/files/upload",
        files={"file": ("notes.txt", b"Antigravity Agent Unit Test", "text/plain")},
    )
    expect(response.status_code == 200, "upload should succeed with status 200")
    data = response.json()
    expect(data.get("success") is True, "success must be true")
    file_data = data.get("file", {})
    expect(file_data.get("filename") == "notes.txt", "filename matches")
    expect(file_data.get("extracted_text") == "Antigravity Agent Unit Test", "extracted text matches")
    expect("path" not in file_data, "server internal path must never leak")


def test_upload_json_file_success(monkeypatch, tmp_path):
    """Uploading a json document extracts formatted text and is accepted."""
    file_service_module = importlib.import_module("app.services.file_service")
    monkeypatch.setattr(file_service_module, "UPLOAD_DIR", tmp_path)
    client = TestClient(app)

    json_payload = b'{"status": "ok", "count": 42}'
    response = client.post(
        "/api/files/upload",
        files={"file": ("dataset.json", json_payload, "application/json")},
    )
    expect(response.status_code == 200, "json upload must succeed")
    data = response.json()
    expect(data["file"]["extracted_text"] == '{"status": "ok", "count": 42}', "json text extracted")


def test_upload_empty_file_rejected():
    """Empty files (0 bytes) must return HTTP 400 Bad Request."""
    client = TestClient(app)
    response = client.post(
        "/api/files/upload",
        files={"file": ("empty.txt", b"", "text/plain")},
    )
    expect(response.status_code == 400, "empty file returns 400")
    expect(response.json()["detail"] == "Empty file", "detail specifies Empty file")


def test_upload_unsupported_file_type_rejected():
    """Executable binaries or scripts (.exe, .sh) must return HTTP 400 Unsupported file type."""
    client = TestClient(app)
    response = client.post(
        "/api/files/upload",
        files={"file": ("exploit.exe", b"\x7fELF", "application/octet-stream")},
    )
    expect(response.status_code == 400, "unsupported type returns 400")
    expect(response.json()["detail"] == "Unsupported file type", "detail specifies unsupported")


def test_upload_filename_traversal_sanitized(monkeypatch, tmp_path):
    """Filename path traversals such as ../../doc.txt are sanitized to doc.txt."""
    file_service_module = importlib.import_module("app.services.file_service")
    monkeypatch.setattr(file_service_module, "UPLOAD_DIR", tmp_path)
    client = TestClient(app)

    response = client.post(
        "/api/files/upload",
        files={"file": ("../../nested/secret.txt", b"Safe Content", "text/plain")},
    )
    expect(response.status_code == 200, "sanitized file uploads successfully")
    file_data = response.json()["file"]
    expect(file_data["filename"] == "secret.txt", "traversal characters must be stripped")
    saved_files = list(tmp_path.iterdir())
    expect(len(saved_files) == 1, "exactly one file written inside isolated directory")
    expect(saved_files[0].read_text() == "Safe Content", "file content matches")


def test_upload_oversized_file_rejected(monkeypatch):
    """Uploading a file exceeding MAX_UPLOAD_BYTES is rejected with HTTP 400."""
    file_service_module = importlib.import_module("app.services.file_service")
    monkeypatch.setattr(file_service_module, "MAX_UPLOAD_BYTES", 100)
    client = TestClient(app)

    oversized_data = b"X" * 150
    response = client.post(
        "/api/files/upload",
        files={"file": ("large.txt", oversized_data, "text/plain")},
    )
    expect(response.status_code == 400, "oversized file returns 400")
    expect("exceeds the upload size limit" in response.json()["detail"], "helpful size error")


def test_safe_upload_name_strips_control_chars_and_traversal():
    """safe_upload_name removes ASCII control characters and path traversal."""
    file_service_module = importlib.import_module("app.services.file_service")
    expect(
        file_service_module.safe_upload_name("injected\r\nheader\x07.txt") == "injectedheader.txt",
        "safe_upload_name strips CRLF and bell chars",
    )
    expect(
        file_service_module.safe_upload_name("test\x00file\tname.txt") == "testfilename.txt",
        "safe_upload_name strips tab and null chars",
    )
    expect(
        file_service_module.safe_upload_name("../../../secret.txt") == "secret.txt",
        "safe_upload_name strips directory traversal",
    )
    expect(file_service_module.safe_upload_name("") == "upload", "empty fallback")
    expect(file_service_module.safe_upload_name(None) == "upload", "none fallback")
