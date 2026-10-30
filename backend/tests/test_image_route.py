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
