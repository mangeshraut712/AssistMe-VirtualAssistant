"""Stable client identifiers for rate limiting."""

from __future__ import annotations

import hashlib
from typing import Mapping, Optional

_IDENTIFIER_SALT = b"assistme-rate-limit"


def hash_identifier(value: str) -> str:
    """Return a short digest that does not reveal the original credential.

    One PBKDF2 iteration is enough to bucket a request. This is not stored
    password hashing, but it avoids a bare fast hash of a bearer token.
    """
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        value.encode("utf-8"),
        _IDENTIFIER_SALT,
        1,
    )
    return digest.hex()[:16]


def resolve_client_id(headers: Mapping[str, str], client_host: Optional[str]) -> str:
    """Choose a rate-limit bucket from the auth token, API key, or client IP."""
    auth_header = headers.get("Authorization", "") or headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        if token:
            return "user:" + hash_identifier(token)

    api_key = headers.get("X-API-Key") or headers.get("x-api-key")
    if api_key:
        return "key:" + hash_identifier(api_key)

    forwarded = headers.get("X-Forwarded-For") or headers.get("x-forwarded-for")
    if forwarded:
        return f"ip:{forwarded.split(',')[0].strip()}"
    return f"ip:{client_host or 'unknown'}"
