"""Debug HTTP routes must not be served in production."""

from app.debug_access import debug_endpoints_allowed
from tests.support import expect


def test_debug_endpoints_are_hidden_in_production(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    expect(debug_endpoints_allowed() is False, "production should hide debug routes")
    monkeypatch.setenv("DEBUG", "true")
    expect(debug_endpoints_allowed() is False, "DEBUG must not re-open debug routes in production")
    expect(debug_endpoints_allowed("production") is False, "an explicit production environment is hidden")
    expect(debug_endpoints_allowed("development") is True, "development should keep debug routes")
    expect(debug_endpoints_allowed("staging") is True, "staging should keep debug routes")
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    expect(debug_endpoints_allowed() is True, "the default environment should keep debug routes")
