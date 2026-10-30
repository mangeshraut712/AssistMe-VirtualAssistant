"""Offline dependency contracts."""

import importlib
from types import SimpleNamespace

import anyio
from fastapi import HTTPException

from tests.support import expect


class _RateLimitService:
    """Rate limiter matching the service's public check_rate_limit contract."""

    def __init__(self, allowed, detail):
        self.allowed = allowed
        self.detail = detail
        self.calls = 0

    async def check_rate_limit(self):
        self.calls += 1
        return self.allowed, self.detail


def _install_rate_limiter(monkeypatch, limiter):
    module = importlib.import_module("app.services.rate_limit_service")
    monkeypatch.setattr(module, "rate_limit_service", limiter)


def test_rate_limit_dependency_calls_the_public_service_method(monkeypatch):
    """The optional dependency should call check_rate_limit without a stale client argument."""
    dependencies = importlib.import_module("app.dependencies")
    limiter = _RateLimitService(True, "")
    _install_rate_limiter(monkeypatch, limiter)
    request = SimpleNamespace(state=SimpleNamespace(client_id="offline-client"))

    anyio.run(dependencies.check_rate_limit, request)

    expect(limiter.calls == 1, "the configured limiter should be consulted once")


def test_rate_limit_dependency_returns_429_for_a_denied_request(monkeypatch):
    """A rejected public limiter result must become the standard HTTP rate-limit response."""
    dependencies = importlib.import_module("app.dependencies")
    limiter = _RateLimitService(False, "per-minute limit reached")
    _install_rate_limiter(monkeypatch, limiter)
    request = SimpleNamespace(state=SimpleNamespace(client_id="offline-client"))

    try:
        anyio.run(dependencies.check_rate_limit, request)
    except HTTPException as exc:
        expect(exc.status_code == 429, "denied requests should get HTTP 429")
        expect("per-minute limit reached" in str(exc.detail), "the limiter reason should be retained")
    else:
        raise AssertionError("a denied limiter result should not continue the request")
