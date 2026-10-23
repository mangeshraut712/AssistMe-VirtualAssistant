"""Login replaces a legacy bcrypt hash with Argon2 after a successful check."""

from types import SimpleNamespace

from fastapi import HTTPException

from app.core.security import verify_password
from app.routes.auth import login as package_login
from app.routes.auth_standalone import login as standalone_login
from tests.support import expect, legacy_bcrypt_hash


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
