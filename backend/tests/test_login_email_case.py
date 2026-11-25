"""login_user matches emails case-insensitively, including rows stored before lower-casing."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401 - register models with Base.metadata
from app.core.accounts import login_user
from app.core.security import get_password_hash
from app.database import Base
from app.models import User
from tests.support import expect


def test_login_finds_legacy_mixed_case_email():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    try:
        db.add(User(email="Legacy.User@Example.com", username="legacy_user",
                    hashed_password=get_password_hash("Password123")))
        db.commit()

        for typed in ("Legacy.User@Example.com", "legacy.user@example.com"):
            user = login_user(db, typed, "Password123")
            expect(user is not None and user.username == "legacy_user", f"login as {typed} must succeed")
    finally:
        db.close()
