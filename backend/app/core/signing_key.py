"""JWT signing key shared by settings and token issuance.

There is no published default. A deployment that forgets SECRET_KEY gets a
random key for this process, so tokens issued here still verify here, and a
known string from source cannot forge them. Production refuses to start
without SECRET_KEY.
"""

from __future__ import annotations

import os
import secrets

_ephemeral_secret_key: dict[str, str] = {}


def clear_ephemeral_secret_key() -> None:
    """Drop the process-local key. Tests use this between cases."""
    _ephemeral_secret_key.clear()


def get_secret_key() -> str:
    """Return SECRET_KEY, or one stable random key for this process."""
    configured = os.getenv("SECRET_KEY", "").strip()
    if configured:
        return configured
    cached = _ephemeral_secret_key.get("value")
    if cached is None:
        cached = secrets.token_urlsafe(32)
        _ephemeral_secret_key["value"] = cached
    return cached
