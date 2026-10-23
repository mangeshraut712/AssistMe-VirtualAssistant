"""Bounds and secret handling that do not need the full application."""

import importlib
import os
import time
from io import BytesIO

import anyio
from fastapi import FastAPI
from fastapi.testclient import TestClient
from jose import jwt
from pydantic import ValidationError
from starlette.datastructures import Headers, UploadFile

from app.client_identity import hash_identifier, resolve_client_id
from app.config import get_settings
from app.core.security import create_access_token, get_secret_key
from app.knowledge_schema import GrokipediaRequest, IngestRequest
from app.origins import origin_is_allowed, strict_transport_security
from app.routes.gemini import router as gemini_router
from app.routes.speedtest import clamp_download_size
from app.services.file_service import (
    MAX_UPLOAD_BYTES,
    UploadRejected,
    file_service,
)
from app.services.image_service import parse_image_size
from tests.support import expect


def test_default_jwt_secret_matches_settings(monkeypatch):
    """Login signs with the same key get_current_user uses to verify."""
    monkeypatch.delenv("SECRET_KEY", raising=False)
    get_settings.cache_clear()
    try:
        signing_key = get_secret_key()
        expect(
            signing_key == get_settings().security.secret_key,
            "signing and verification keys differ",
        )
        token = create_access_token("ada")
        payload = jwt.decode(token, signing_key, algorithms=["HS256"])
        expect(payload["sub"] == "ada", "the settings secret should verify a newly issued token")
    finally:
        get_settings.cache_clear()


def test_configured_secret_is_what_signs_the_token(monkeypatch):
    """SECRET_KEY from the environment is used at issue time."""
    monkeypatch.setenv("SECRET_KEY", "unit-test-secret-key-value")
    get_settings.cache_clear()
    try:
        token = create_access_token("ada")
        payload = jwt.decode(token, "unit-test-secret-key-value", algorithms=["HS256"])
        expect(payload["sub"] == "ada", "configured secret should verify the token")
    finally:
        get_settings.cache_clear()


def test_rate_limit_identity_stays_cheap():
    """A thousand request identities stay well under a second."""
    first = hash_identifier("secret-token")
    expect(first == hash_identifier("secret-token"), "digest should be stable")
    expect(len(first) == 16, "digest should stay short")
    expect("secret-token" not in first, "digest should not echo the token")

    started = time.perf_counter()
    for index in range(1000):
        resolve_client_id({"Authorization": f"Bearer token-{index}"}, "127.0.0.1")
    expect(time.perf_counter() - started < 1, "identity hashing should stay cheap")
    expect(
        resolve_client_id({"X-Forwarded-For": "203.0.113.8, 10.0.0.1"}, None) == "ip:203.0.113.8",
        "the first forwarded address is the client bucket",
    )


def test_browser_origins_and_hsts():
    """The public site is allowlisted and HSTS is not sent on plain HTTP."""
    expect(
        origin_is_allowed("https://mangeshraut712.github.io") is True,
        "pages origin should be allowed",
    )
    expect(origin_is_allowed("https://evil.example") is False, "unknown origins should be rejected")
    expect(strict_transport_security("http", None) is None, "local http should not set HSTS")
    expect(
        strict_transport_security("http", "https") == "max-age=31536000; includeSubDomains",
        "forwarded https should set HSTS",
    )


def test_gemini_key_is_not_readable_from_an_unlisted_origin(monkeypatch):
    """A foreign Origin cannot read GOOGLE_API_KEY."""
    monkeypatch.setenv("GOOGLE_API_KEY", "unit-test-google-key")
    app = FastAPI()
    app.include_router(gemini_router)
    client = TestClient(app)

    denied = client.get("/api/gemini/key", headers={"origin": "https://evil.example"})
    expect(denied.status_code == 403, "foreign origin should be forbidden")
    expect("unit-test-google-key" not in denied.text, "the key must not leak in the error")

    allowed = client.get("/api/gemini/key", headers={"origin": "http://localhost:5173"})
    expect(allowed.status_code == 200, "local dev origin should receive the key")
    expect(
        allowed.json()["apiKey"] == "unit-test-google-key",
        "allowed origin receives the configured key",
    )

    same_origin = client.get("/api/gemini/key")
    expect(same_origin.status_code == 200, "a request without Origin is same-origin")


def test_download_size_is_clamped():
    """Speed-test downloads cannot request an unbounded body."""
    expect(
        clamp_download_size(25 * 1024 * 1024) == 25 * 1024 * 1024,
        "the normal probe size should pass",
    )
    expect(clamp_download_size(10**12) == 25 * 1024 * 1024, "huge sizes should clamp to the cap")
    expect(clamp_download_size(-5) == 1024, "negative sizes should clamp to the minimum")


def test_image_size_is_clamped():
    """Image dimensions stay inside a fixed range."""
    expect(parse_image_size("1024x768") == (1024, 768), "normal sizes should pass")
    expect(parse_image_size("1x999999") == (64, 2048), "edges should clamp")
    expect(parse_image_size("nope") == (1024, 1024), "invalid sizes should fall back")
    expect(parse_image_size(None) == (1024, 1024), "missing sizes should fall back")


def test_knowledge_requests_reject_unbounded_input():
    """Search and ingest payloads have explicit limits."""
    GrokipediaRequest(query="drexel", max_results=8, search_depth="advanced")
    try:
        GrokipediaRequest(query="x" * 4001, max_results=100, search_depth="everything")
    except ValidationError:
        pass
    else:
        raise AssertionError("an overlong research query should be rejected")

    try:
        IngestRequest(documents=["ok"] * 101)
    except ValidationError:
        pass
    else:
        raise AssertionError("too many documents should be rejected")


def _upload(name, payload, content_type="text/plain"):
    return UploadFile(
        file=BytesIO(payload),
        filename=name,
        headers=Headers({"content-type": content_type}),
    )


def test_uploads_reject_traversal_oversize_and_hide_the_server_path(monkeypatch, tmp_path):
    """Saved files stay in the upload directory and responses omit that path."""
    file_service_module = importlib.import_module("app.services.file_service")
    monkeypatch.setattr(file_service_module, "UPLOAD_DIR", tmp_path)

    async def scenario():
        saved = await file_service.save_file(_upload("../../notes.txt", b"hello"))
        expect(saved["filename"] == "notes.txt", "the stored display name should be the basename")
        expect(".." not in saved["path"], "the storage path should not keep traversal segments")
        expect(
            os.path.dirname(saved["path"]) == str(tmp_path),
            "the file should stay in the upload directory",
        )
        text = await file_service.extract_text(saved["path"], None)
        expect(
            text == "Text extraction not supported for this file type.",
            "a missing type should not raise",
        )

        try:
            await file_service.save_file(_upload("run.exe", b"nope"))
        except UploadRejected:
            pass
        else:
            raise AssertionError("an executable extension should be rejected")

        try:
            await file_service.save_file(_upload("big.txt", b"x" * (MAX_UPLOAD_BYTES + 1)))
        except UploadRejected as exc:
            expect(exc.code == "size", "the size error should use the size code")
        else:
            raise AssertionError("an oversized upload should be rejected")

    anyio.run(scenario)
