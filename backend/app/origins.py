"""Browser origins allowed to call the API."""

from __future__ import annotations

import os
import re
from typing import List, Optional

VERCEL_ORIGIN_PATTERN = re.compile(
    r"https://assist-me-virtual-assistant(-[a-z0-9]+)?\.vercel\.app"
)

GITHUB_PAGES_ORIGIN = "https://mangeshraut712.github.io"

_STATIC_ORIGINS = (
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://assist-me-virtual-assistant.vercel.app",
    "https://assistme-virtualassistant-production.up.railway.app",
    GITHUB_PAGES_ORIGIN,
)


def normalise_origin(value: Optional[str]) -> Optional[str]:
    """Return a scheme-qualified origin without a trailing slash."""
    if not value:
        return None
    origin = value.strip().rstrip("/")
    if not origin:
        return None
    if not origin.startswith(("http://", "https://")):
        origin = f"https://{origin}"
    return origin


def _env_configured_origins() -> List[str]:
    configured: List[str] = []
    for env_name in ("APP_URL", "VERCEL_URL"):
        normalised = normalise_origin(os.getenv(env_name))
        if normalised:
            configured.append(normalised)

    raw_custom = os.getenv("CORS_ALLOW_ORIGINS", "")
    if raw_custom:
        for entry in raw_custom.split(","):
            normalised = normalise_origin(entry)
            if normalised:
                configured.append(normalised)
    return configured


def allowed_origins_list() -> List[str]:
    """Origins accepted by CORS, including env overrides."""
    return sorted({origin for origin in (*_STATIC_ORIGINS, *_env_configured_origins()) if origin})


def origin_is_allowed(origin: str) -> bool:
    """Return whether a concrete Origin header value may read API responses."""
    if origin in allowed_origins_list():
        return True
    return VERCEL_ORIGIN_PATTERN.fullmatch(origin) is not None


def strict_transport_security(scheme: Optional[str], forwarded_proto: Optional[str]) -> Optional[str]:
    """Return an HSTS header only for HTTPS responses.

    Sending HSTS on plain HTTP, including local development, makes browsers
    upgrade later requests to https and breaks the dev server.
    """
    proto = (forwarded_proto or scheme or "").split(",")[0].strip().lower()
    if proto == "https":
        return "max-age=31536000; includeSubDomains"
    return None
