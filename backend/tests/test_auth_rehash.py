"""Login replaces a legacy bcrypt hash with Argon2 after a successful check."""

from types import SimpleNamespace

import bcrypt

from app.core.security import verify_password
from app.routes.auth import login as package_login
from app.routes.auth_standalone import login as standalone_login


def _bcrypt_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii")


class _Query:
    def __init__(self, user):
        self._user = user

    def filter(self, *_args, **_kwargs):
        return self

    def first(self):
        return self._user


class _Database:
    def __init__(self, user):
        self.user = user
        self.committed = False

    def query(self, _model):
        return _Query(self.user)

    def commit(self):
        self.committed = True


def _assert_login_upgrades(login):
    user = SimpleNamespace(username="ada", hashed_password=_bcrypt_hash("secret"))
    db = _Database(user)
    form = SimpleNamespace(username="ada", password="secret")

    token = login(form, db)

    assert token["token_type"] == "bearer"
    assert token["access_token"]
    assert db.committed is True
    assert user.hashed_password.startswith("$argon2id$")
    assert verify_password("secret", user.hashed_password) is True


def test_package_login_upgrades_legacy_bcrypt_hash():
    _assert_login_upgrades(package_login)


def test_standalone_login_upgrades_legacy_bcrypt_hash():
    _assert_login_upgrades(standalone_login)


def test_login_rejects_a_wrong_password_without_rewriting_the_hash():
    original = _bcrypt_hash("secret")
    user = SimpleNamespace(username="ada", hashed_password=original)
    db = _Database(user)
    form = SimpleNamespace(username="ada", password="nope")

    try:
        package_login(form, db)
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 400
    else:
        raise AssertionError("login accepted a wrong password")

    assert db.committed is False
    assert user.hashed_password == original
