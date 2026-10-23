"""Stable client identifiers for rate limiting.

Bearer tokens are high-entropy JWTs, so a short SHA-256 prefix only has to
hide the raw token. API keys are password-class credentials: a fast hash
would let a leaked bucket id be guessed offline, so those use PBKDF2.
"""

from __future__ import annotations

import hashlib
from typing import Mapping, Optional

# Enough work to stop casual offline guessing, and still one request.
# This runs before the rate limiter can shed load.
_KDF_ROUNDS = 10000


def hash_identifier(value: str) -> str:
    """Return a short SHA-256 digest of a high-entropy bearer token."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


def hash_api_key(api_key: str) -> str:
    """Return a short PBKDF2 digest of an API key.

    SHA-256 is not a password hash. PBKDF2 is slow on purpose so a copied
    rate-limit bucket cannot be used to recover a low-entropy key.
    """
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        api_key.encode("utf-8"),
        b"assistme-rate-limit",
        _KDF_ROUNDS,
    )
    return digest.hex()[:16]


def _proxy_client_address(forwarded: str) -> str:
    """Return the address appended by the nearest proxy.

    Clients can prepend fake hops. The rightmost hop is the one the trusted
    proxy observed.
    """
    parts = [part.strip() for part in forwarded.split(",") if part.strip()]
    if not parts:
        return ""
    return parts[-1]


def resolve_client_id(
    headers: Mapping[str, str],
    client_host: Optional[str],
    trust_proxy: bool = False,
) -> str:
    """Choose a rate-limit bucket from the auth token, API key, or client IP."""
    auth_header = headers.get("Authorization", "") or headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        if token:
            return "user:" + hash_identifier(token)

    supplied_key = headers.get("X-API-Key") or headers.get("x-api-key")
    if supplied_key:
        return "key:" + hash_api_key(supplied_key)

    if trust_proxy:
        forwarded = headers.get("X-Forwarded-For") or headers.get("x-forwarded-for")
        if forwarded:
            hop = _proxy_client_address(forwarded)
            if hop:
                return f"ip:{hop}"
    return f"ip:{client_host or 'unknown'}"
