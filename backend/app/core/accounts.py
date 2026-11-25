"""Shared account helpers for the two auth routers."""

from datetime import timedelta
from typing import Any

from sqlalchemy import func

from ..models import User
from .security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    authenticate_and_upgrade,
    create_access_token,
    get_password_hash,
)


def register_user(db: Any, email: str, username: str, password: str) -> Any:
    """Persist a new user and return the stored row."""
    clean_email = (email or "").strip().lower()
    clean_username = (username or "").strip()
    user = User(
        email=clean_email,
        username=clean_username,
        hashed_password=get_password_hash(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def issue_bearer_token(subject: str) -> dict:
    """Return the access-token payload used by login and register."""
    expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    encoded = create_access_token(subject=subject, expires_delta=expires)
    return {
        "access_token": encoded,
        "token_type": "bearer",
        "expires_in": int(expires.total_seconds()),
    }


def login_user(db: Any, username: str, password: str) -> Any:
    """Return the user when the password matches username or email, otherwise None."""
    identifier = (username or "").strip()
    folded = identifier.lower()
    # Indexed lookups first: the exact username, or the email as typed / lower-cased.
    candidates = (
        db.query(User)
        .filter((User.username == identifier) | User.email.in_([identifier, folded]))
        .all()
    )
    user = next((u for u in candidates if u.username == identifier), None)
    if user is None:
        user = next((u for u in candidates if u.email == identifier), None)
    if user is None:
        user = next((u for u in candidates if u.email == folded), None)
    if user is None and "@" in identifier:
        # Older rows may predate lower-casing at registration. Fall back to a
        # case-insensitive match only when it identifies a single account.
        email_matches = db.query(User).filter(func.lower(User.email) == folded).limit(2).all()
        user = email_matches[0] if len(email_matches) == 1 else None
    if authenticate_and_upgrade(user, password, db):
        return user
    return None
