import asyncio
import importlib.util
import os
from pathlib import Path

os.environ["MAX_CREDITS"] = "0"

MODULE_PATH = Path(__file__).resolve().parents[1] / "app" / "services" / "rate_limit_service.py"


def _load_service_class():
    spec = importlib.util.spec_from_file_location("rate_limit_service_isolated", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module.RateLimitService


def test_get_status_does_not_divide_by_zero_when_max_credits_is_zero() -> None:
    service = _load_service_class()()
    assert service.max_credits == 0
    status = asyncio.run(service.get_status())
    assert status["max_credits"] == 0
    assert status["credit_usage_percent"] == 0.0
    assert "current_credits" in status
