"""Argon2id password hashing and legacy bcrypt upgrades."""

import bcrypt
from argon2 import PasswordHasher

from app.core.security import (
    authenticate_password,
    get_password_hash,
    password_needs_rehash,
    verify_password,
)

_weaker_argon2 = PasswordHasher(time_cost=1, memory_cost=8, parallelism=1)


def _bcrypt_hash(password: str) -> str:
    secret = password.encode("utf-8")[:72]
    return bcrypt.hashpw(secret, bcrypt.gensalt()).decode("ascii")


def test_new_passwords_use_argon2id_and_round_trip():
    hashed = get_password_hash("correct horse")

    assert hashed.startswith("$argon2id$")
    assert verify_password("correct horse", hashed) is True
    assert verify_password("wrong horse", hashed) is False
    assert password_needs_rehash(hashed) is False
    assert password_needs_rehash(hashed.encode("utf-8")) is False


def test_bytes_and_stale_parameters_need_rehash():
    stale = _weaker_argon2.hash("battery")

    assert verify_password("battery", stale) is True
    assert password_needs_rehash(stale) is True
    assert password_needs_rehash(stale.encode("utf-8")) is True

    valid, upgraded = authenticate_password("battery", stale.encode("utf-8"))
    assert valid is True
    assert upgraded is not None
    assert upgraded.startswith("$argon2id$")
    assert password_needs_rehash(upgraded) is False
    assert verify_password("battery", upgraded) is True


def test_legacy_bcrypt_verifies_and_is_replaced():
    legacy = _bcrypt_hash("secret")

    assert not legacy.startswith("$argon2")
    assert verify_password("secret", legacy) is True
    assert verify_password("nope", legacy) is False
    assert password_needs_rehash(legacy) is True

    valid, upgraded = authenticate_password("secret", legacy)
    assert valid is True
    assert upgraded.startswith("$argon2id$")
    assert verify_password("secret", upgraded) is True


def test_bcrypt5_still_accepts_the_first_72_bytes_of_a_long_password():
    password = "x" * 80
    legacy = _bcrypt_hash(password)

    assert verify_password(password, legacy) is True
    assert verify_password(password[:72] + "yyyyyyyy", legacy) is True
    assert verify_password("x" * 71, legacy) is False


def test_malformed_hashes_do_not_authenticate():
    assert verify_password("secret", "not-a-hash") is False
    assert verify_password("secret", b"\xff") is False
    assert password_needs_rehash(b"\xff") is True

    valid, upgraded = authenticate_password("secret", "not-a-hash")
    assert valid is False
    assert upgraded is None
