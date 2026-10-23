"""Cheap, stable client identifiers for rate limiting.

PBKDF2 is a password KDF. Using it on every request just to shorten a bearer
token burns CPU without adding secrecy, because the salt is public.
"""

from __future__ import annotations

import hashlib
from typing import Mapping, Optional


def hash_identifier(value: str) -> str:
    """Return a short SHA-256 digest that does not reveal the original secret."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


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
