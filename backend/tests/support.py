"""Helpers shared by backend tests."""

import bcrypt


def expect(condition, detail):
    """Raise AssertionError when a test condition does not hold."""
    if condition:
        return
    raise AssertionError(detail)


def legacy_bcrypt_hash(plain: str) -> str:
    """Hash a phrase with bcrypt the way older accounts were stored.

    Only the first 72 bytes are part of the hash, matching bcrypt itself.
    """
    raw = plain.encode("utf-8")[:72]
    return bcrypt.hashpw(raw, bcrypt.gensalt()).decode("ascii")
