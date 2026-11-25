"""login_user matches emails case-insensitively, including rows stored before lower-casing."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  # pylint: disable=unused-import - register models with Base
from app.core.accounts import login_user
from app.core.security import get_password_hash
from app.database import Base
from app.models import User
from tests.support import expect


def _session():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _user(email, username):
    return User(email=email, username=username, hashed_password=get_password_hash("Password123"))


def test_login_finds_legacy_mixed_case_email():
    """A row stored before registration lower-cased emails can still log in."""
    db = _session()
    try:
        db.add(_user("Legacy.User@Example.com", "legacy_user"))
        db.commit()
        for typed in ("Legacy.User@Example.com", "legacy.user@example.com"):
            user = login_user(db, typed, "Password123")
            found = user is not None and user.username == "legacy_user"
            expect(found, f"login as {typed} must succeed")
    finally:
        db.close()


def test_login_refuses_an_ambiguous_case_insensitive_email():
    """Two legacy rows differing only by case: an inexact email picks neither."""
    db = _session()
    try:
        db.add_all([_user("Dup@Example.com", "first"), _user("DUP@example.com", "second")])
        db.commit()
        user = login_user(db, "dup@example.com", "Password123")
        expect(user is None, "ambiguous email must not pick an account")
        exact = login_user(db, "Dup@Example.com", "Password123")
        expect(exact is not None and exact.username == "first", "exact stored email still wins")
    finally:
        db.close()
