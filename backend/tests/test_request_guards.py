"""Bounds and secret handling that do not need the full application."""

import importlib
import os
import secrets
import time
from io import BytesIO

import anyio
from fastapi import FastAPI
from fastapi.testclient import TestClient
from jose import JWTError, jwt
from pydantic import ValidationError
from starlette.datastructures import Headers, UploadFile

from app.client_identity import hash_api_key, hash_identifier, resolve_client_id
from app.config import get_settings
from app.core.security import create_access_token, decode_access_token, get_secret_key
from app.core.signing_key import clear_ephemeral_secret_key
from app.knowledge_schema import GrokipediaRequest, IngestRequest, SearchRequest
from app.origins import origin_is_allowed, strict_transport_security
from app.routes.gemini import router as gemini_router
from app.routes.speedtest import clamp_download_size
from app.routes.speedtest import router as speedtest_router
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
    clear_ephemeral_secret_key()
    get_settings.cache_clear()
    try:
        signing_key = get_secret_key()
        expect(
            signing_key == get_settings().security.secret_key,
            "signing and verification keys differ",
        )
        expect(len(signing_key) >= 32, "an unset key should still be long")
        expect(get_secret_key() == signing_key, "the process key should stay stable")
        token = create_access_token("ada")
        payload = jwt.decode(token, signing_key, algorithms=["HS256"])
        expect(payload["sub"] == "ada", "the process key should verify a new token")
    finally:
        clear_ephemeral_secret_key()
        get_settings.cache_clear()


def test_production_rejects_a_missing_signing_key(monkeypatch):
    """Production must not boot with a generated, unshared signing key."""
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")
    get_settings.cache_clear()
    try:
        try:
            get_settings()
        except ValidationError:
            return
        raise AssertionError("production without SECRET_KEY should be rejected")
    finally:
        clear_ephemeral_secret_key()
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
    expect(time.perf_counter() - started < 1, "token hashing should stay cheap")
    spoofed = resolve_client_id(
        {"X-Forwarded-For": "203.0.113.8, 10.0.0.1"},
        "192.0.2.10",
    )
    expect(spoofed == "ip:192.0.2.10", "a client-supplied forward header is ignored")
    trusted = resolve_client_id(
        {"X-Forwarded-For": "203.0.113.8, 10.0.0.1"},
        "192.0.2.10",
        trust_proxy=True,
    )
    expect(trusted == "ip:10.0.0.1", "the proxy-appended hop is the client bucket")

    supplied = "user-supplied-key"
    bucket = resolve_client_id({"X-API-Key": supplied}, "127.0.0.1")
    again = resolve_client_id({"x-api-key": supplied}, "127.0.0.1")
    expect(bucket == again, "header case should not change the api-key bucket")
    expect(supplied not in bucket, "the bucket should not echo the api key")
    expect(
        bucket != "key:" + hash_identifier(supplied),
        "api keys must not use the fast token hash",
    )
    expect(bucket == "key:" + hash_api_key(supplied), "the bucket uses the key KDF")


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


def test_access_tokens_only_verify_as_hs256(monkeypatch):
    """Verification stays on HS256 even if JWT_ALGORITHM is changed."""
    signing_key = secrets.token_urlsafe(32)
    monkeypatch.setenv("SECRET_KEY", signing_key)
    monkeypatch.setenv("JWT_ALGORITHM", "none")
    get_settings.cache_clear()
    try:
        token = create_access_token("ada")
        payload = decode_access_token(token)
        expect(payload["sub"] == "ada", "an HS256 token should verify")
        other = jwt.encode(
            {"sub": "ada"},
            signing_key,
            algorithm="HS512",
        )
        try:
            decode_access_token(other)
        except JWTError:
            return
        raise AssertionError("an HS512 token must not verify")
    finally:
        get_settings.cache_clear()


def test_speedtest_upload_stops_at_the_cap(monkeypatch):
    """Upload probes cannot stream an unbounded body into the process."""
    speedtest_module = importlib.import_module("app.routes.speedtest")
    monkeypatch.setattr(speedtest_module, "MAX_UPLOAD_BYTES", 32)
    app = FastAPI()
    app.include_router(speedtest_router)
    client = TestClient(app)

    small = client.post("/api/speedtest/upload", content=b"x" * 16)
    expect(small.status_code == 200, "a small upload should be accepted")
    expect(small.json()["size_received"] == 16, "the received size should match")

    huge = client.post("/api/speedtest/upload", content=b"x" * 64)
    expect(huge.status_code == 413, "an upload over the cap should be rejected")
    expect("25 MB" in huge.json()["detail"], "the error should name the limit")


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
    article = GrokipediaRequest(
        query="  drexel  ", max_results=8, search_depth="advanced"
    )
    expect(article.normalized_query() == "drexel", "the query view is trimmed")
    expect(article.uses_advanced_search() is True, "advanced search is visible")
    search = SearchRequest(query="drexel", top_k=4)
    expect(search.result_window() == 4, "the result window is the requested top_k")
    ingest = IngestRequest(documents=["alpha", "beta"])
    expect(ingest.document_count() == 2, "document_count matches the payload")
    expect(ingest.longest_document() == 5, "longest_document uses character length")
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
