"""Argon2id password hashing and legacy bcrypt upgrades."""

from types import SimpleNamespace

from argon2 import PasswordHasher
from fastapi import HTTPException

from app.core.security import (
    authenticate_password,
    get_password_hash,
    password_needs_rehash,
    verify_password,
)
from app.routes.auth import login as package_login
from app.routes.auth_standalone import login as standalone_login
from tests.support import expect, legacy_bcrypt_hash

_weaker_argon2 = PasswordHasher(time_cost=1, memory_cost=8, parallelism=1)


def test_new_passwords_use_argon2id_and_round_trip():
    """New hashes are Argon2id and verify only the original phrase."""
    phrase = "correct horse"
    hashed = get_password_hash(phrase)

    expect(hashed.startswith("$argon2id$"), "new hashes should be argon2id")
    expect(verify_password(phrase, hashed) is True, "original phrase should match")
    expect(verify_password("wrong horse", hashed) is False, "other phrase should not match")
    expect(password_needs_rehash(hashed) is False, "fresh hash should not need rehash")
    expect(
        password_needs_rehash(hashed.encode("utf-8")) is False,
        "bytes form of a fresh hash should not need rehash",
    )


def test_bytes_and_stale_parameters_need_rehash():
    """Weaker Argon2 parameters verify and are replaced, including bytes input."""
    phrase = "battery"
    stale = _weaker_argon2.hash(phrase)

    expect(verify_password(phrase, stale) is True, "stale hash should still verify")
    expect(password_needs_rehash(stale) is True, "weaker parameters should need rehash")
    expect(
        password_needs_rehash(stale.encode("utf-8")) is True,
        "bytes form of a stale hash should need rehash",
    )

    valid, upgraded = authenticate_password(phrase, stale.encode("utf-8"))
    expect(valid is True, "stale bytes hash should authenticate")
    expect(upgraded is not None, "stale hash should be replaced")
    expect(upgraded.startswith("$argon2id$"), "replacement should be argon2id")
    expect(password_needs_rehash(upgraded) is False, "replacement should be current")
    expect(verify_password(phrase, upgraded) is True, "replacement should verify")


def test_legacy_bcrypt_verifies_and_is_replaced():
    """Legacy bcrypt hashes verify and authenticate_password returns Argon2."""
    phrase = "secret"
    other = "nope"
    legacy = legacy_bcrypt_hash(phrase)

    expect(legacy.startswith("$argon2") is False, "bcrypt hash should not look like argon2")
    expect(verify_password(phrase, legacy) is True, "legacy hash should verify")
    expect(verify_password(other, legacy) is False, "wrong phrase should not verify")
    expect(password_needs_rehash(legacy) is True, "bcrypt should always need rehash")

    valid, upgraded = authenticate_password(phrase, legacy)
    expect(valid is True, "legacy hash should authenticate")
    expect(upgraded.startswith("$argon2id$"), "upgrade should be argon2id")
    expect(verify_password(phrase, upgraded) is True, "upgraded hash should verify")


def test_bcrypt5_still_accepts_the_first_72_bytes_of_a_long_password():
    """bcrypt only uses the first 72 bytes, including under bcrypt 5."""
    long_value = "x" * 80
    legacy = legacy_bcrypt_hash(long_value)

    expect(verify_password(long_value, legacy) is True, "full phrase should verify")
    expect(
        verify_password(long_value[:72] + "yyyyyyyy", legacy) is True,
        "bytes after 72 should not change the bcrypt check",
    )
    expect(verify_password("x" * 71, legacy) is False, "a shorter phrase should not match")


def test_malformed_hashes_do_not_authenticate():
    """Garbage hashes fail closed and still count as needing a rehash."""
    phrase = "secret"
    expect(verify_password(phrase, "not-a-hash") is False, "text garbage should not verify")
    expect(verify_password(phrase, b"\xff") is False, "binary garbage should not verify")
    expect(password_needs_rehash(b"\xff") is True, "binary garbage should need rehash")

    valid, upgraded = authenticate_password(phrase, "not-a-hash")
    expect(valid is False, "garbage should not authenticate")
    expect(upgraded is None, "failed auth should not return a new hash")


class _Query:
    """Query stub that returns one user."""

    def __init__(self, user):
        self._user = user

    def filter(self, *_args, **_kwargs):
        """Ignore the SQL expression and keep this query."""
        return self

    def first(self):
        """Return the stubbed user."""
        return self._user


class _Database:
    """Session stub that records whether commit was called."""

    def __init__(self, user):
        self.user = user
        self.committed = False

    def query(self, _model):
        """Return a query bound to the stubbed user."""
        return _Query(self.user)

    def commit(self):
        """Record that the route asked to persist the upgraded hash."""
        self.committed = True


def _login_form(username, phrase):
    return SimpleNamespace(username=username, password=phrase)


def _require_upgraded_login(login, phrase):
    user = SimpleNamespace(username="ada", hashed_password=legacy_bcrypt_hash(phrase))
    database = _Database(user)
    token = login(_login_form("ada", phrase), database)
    expect(token["token_type"] == "bearer", "login should return a bearer token")
    expect(bool(token["access_token"]), "login should return an access token")
    expect(database.committed is True, "upgraded hash should be committed")
    expect(user.hashed_password.startswith("$argon2id$"), "stored hash should be argon2id")
    expect(
        verify_password(phrase, user.hashed_password) is True,
        "upgraded hash should verify",
    )


def test_package_login_upgrades_legacy_bcrypt_hash():
    """The package login route rewrites bcrypt to Argon2 after success."""
    _require_upgraded_login(package_login, "secret")


def test_standalone_login_upgrades_legacy_bcrypt_hash():
    """The standalone login route rewrites bcrypt to Argon2 after success."""
    _require_upgraded_login(standalone_login, "secret")


def test_login_rejects_a_wrong_password_without_rewriting_the_hash():
    """A wrong password is rejected and the stored hash stays unchanged."""
    phrase = "secret"
    stored = legacy_bcrypt_hash(phrase)
    user = SimpleNamespace(username="ada", hashed_password=stored)
    database = _Database(user)

    try:
        package_login(_login_form("ada", "nope"), database)
    except HTTPException as exc:
        expect(exc.status_code == 400, "wrong password should return 400")
    else:
        raise AssertionError("login accepted a wrong password")

    expect(database.committed is False, "rejected login must not commit")
    expect(user.hashed_password == stored, "rejected login must keep the original hash")
