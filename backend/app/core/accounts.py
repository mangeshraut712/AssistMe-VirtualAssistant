"""Shared account helpers for the two auth routers."""

from datetime import timedelta
from typing import Any

from ..models import User
from .security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    authenticate_and_upgrade,
    create_access_token,
    get_password_hash,
)


def register_user(db: Any, email: str, username: str, password: str) -> Any:
    """Persist a new user and return the stored row."""
    user = User(
        email=email,
        username=username,
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
    scheme = "bearer"
    payload = {"access_token": encoded}
    payload["token_type"] = scheme
    return payload


def login_user(db: Any, username: str, password: str) -> Any:
    """Return the user when the password matches, otherwise None."""
    user = db.query(User).filter(User.username == username).first()
    if authenticate_and_upgrade(user, password, db):
        return user
    return None
