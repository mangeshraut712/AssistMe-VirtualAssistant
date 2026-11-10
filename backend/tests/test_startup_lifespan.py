"""Startup checks must use the FastAPI lifespan hook, not deprecated on_event."""
import inspect
import warnings

from fastapi.testclient import TestClient

import app.main as main
from app.main import app
from tests.support import expect


def test_startup_validation_is_wired_through_lifespan():
    """The app module must not register the deprecated on_event startup hook."""
    source = inspect.getsource(main)
    expect("@app.on_event" not in source, "startup must not use @app.on_event")
    expect("lifespan=lifespan" in source, "FastAPI must be constructed with the lifespan hook")


def test_client_startup_does_not_emit_on_event_deprecation():
    """TestClient should start the app without the on_event deprecation warning."""
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        with TestClient(app) as client:
            response = client.get("/health")
    expect(response.status_code == 200, "health should still work after startup")
    messages = [str(item.message) for item in caught]
    expect(
        not any("on_event is deprecated" in message for message in messages),
        "startup must not emit the on_event deprecation warning",
    )
