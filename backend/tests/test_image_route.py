"""Offline image-route contracts."""

import importlib

from fastapi import FastAPI
from fastapi.testclient import TestClient

from tests.support import expect


def test_image_route_replaces_null_model_and_size_with_safe_defaults(monkeypatch):
    """Nullable request fields must not reach the image service as None."""
    image_module = importlib.import_module("app.routes.image")
    captured = {}

    async def generate_image(**kwargs):
        captured.update(kwargs)
        return "offline-image"

    monkeypatch.setattr(image_module.image_service, "generate_image", generate_image)
    app = FastAPI()
    app.include_router(image_module.router)
    response = TestClient(app).post(
        "/api/images/generate",
        json={"prompt": "offline prompt", "model": None, "size": None},
    )

    expect(response.status_code == 200, "the request should use safe defaults")
    expect(captured["model"] == "flux", "a null model should use the default model")
    expect(captured["size"] == "1024x1024", "a null size should use the default size")


def test_image_route_rejects_empty_or_whitespace_prompt():
    """Empty or whitespace-only prompt must return 400 Bad Request."""
    image_module = importlib.import_module("app.routes.image")
    app = FastAPI()
    app.include_router(image_module.router)
    client = TestClient(app)

    res_empty = client.post("/api/images/generate", json={"prompt": ""})
    expect(res_empty.status_code == 400, "empty prompt must return 400")
    expect("Prompt must not be empty" in res_empty.json()["detail"], "helpful error detail")

    res_spaces = client.post("/api/images/generate", json={"prompt": "   \n\t  "})
    expect(res_spaces.status_code == 400, "whitespace prompt must return 400")


def test_image_route_strips_prompt_whitespace(monkeypatch):
    """Leading and trailing whitespace must be stripped before calling image service."""
    image_module = importlib.import_module("app.routes.image")
    captured = {}

    async def generate_image(**kwargs):
        captured.update(kwargs)
        return "offline-image"

    monkeypatch.setattr(image_module.image_service, "generate_image", generate_image)
    app = FastAPI()
    app.include_router(image_module.router)
    response = TestClient(app).post(
        "/api/images/generate",
        json={"prompt": "   cyberpunk cat   "},
    )
    expect(response.status_code == 200, "valid prompt must succeed")
    expect(captured["prompt"] == "cyberpunk cat", "whitespace must be stripped")


def test_image_route_returns_500_on_service_error(monkeypatch):
    """Backend service failure must be caught and returned as HTTP 500."""
    image_module = importlib.import_module("app.routes.image")

    async def fail(**kwargs):
        raise RuntimeError("upstream timeout")

    monkeypatch.setattr(image_module.image_service, "generate_image", fail)
    app = FastAPI()
    app.include_router(image_module.router)
    response = TestClient(app).post(
        "/api/images/generate",
        json={"prompt": "cyberpunk cat"},
    )
    expect(response.status_code == 500, "service failure should return 500")
    expect(response.json()["detail"] == "Image generation failed", "standard error detail")


def test_image_route_preserves_http_exceptions(monkeypatch):
    """HTTP exceptions from image service (e.g. 429 rate limit) must be preserved."""
    from fastapi import HTTPException

    image_module = importlib.import_module("app.routes.image")

    async def fail_rate_limit(**kwargs):
        raise HTTPException(status_code=429, detail="Image generation rate limit exceeded")

    monkeypatch.setattr(image_module.image_service, "generate_image", fail_rate_limit)
    app = FastAPI()
    app.include_router(image_module.router)
    response = TestClient(app).post(
        "/api/images/generate",
        json={"prompt": "cyberpunk cat"},
    )
    expect(response.status_code == 429, "HTTPException 429 should be preserved")
    expect(response.json()["detail"] == "Image generation rate limit exceeded", "detail preserved")


def test_image_route_passes_quality_field(monkeypatch):
    """Request quality parameter must be passed to image service."""
    image_module = importlib.import_module("app.routes.image")
    captured = {}

    async def generate_image(**kwargs):
        captured.update(kwargs)
        return "offline-image"

    monkeypatch.setattr(image_module.image_service, "generate_image", generate_image)
    app = FastAPI()
    app.include_router(image_module.router)
    response = TestClient(app).post(
        "/api/images/generate",
        json={"prompt": "cyberpunk cat", "quality": "hd"},
    )
    expect(response.status_code == 200, "request should succeed")
    expect(captured["quality"] == "hd", "custom quality must be forwarded")
