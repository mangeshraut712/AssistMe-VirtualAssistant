"""Resolve stored-history ownership without changing anonymous chat access."""
from typing import Optional

from fastapi import Depends, Header, HTTPException
from jose import JWTError
from sqlalchemy.orm import Session

from .core.security import decode_access_token
from .database import get_db
from .models import User


def optional_history_user(
    authorization: Optional[str] = Header(default=None),
    db: Optional[Session] = Depends(get_db),
) -> Optional[User]:
    if authorization is None:
        return None
    scheme, _, token = authorization.partition(" ")
    invalid = HTTPException(
        status_code=401, detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if scheme.lower() != "bearer" or not token:
        raise invalid
    try:
        subject = decode_access_token(token).get("sub")
    except JWTError as exc:
        raise invalid from exc
    if not isinstance(subject, str) or not subject:
        raise invalid
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    user = db.query(User).filter(User.username == subject).first()
    if user is None:
        raise invalid
    return user


def required_history_user(
    user: Optional[User] = Depends(optional_history_user),
) -> User:
    if user is None:
        raise HTTPException(
            status_code=401, detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
