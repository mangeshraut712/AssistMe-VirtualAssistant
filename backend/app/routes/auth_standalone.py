"""
Standalone authentication routes - no dependencies on embedding services.
"""

import os
import sys
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..core.accounts import issue_bearer_token, login_user, register_user
from ..database import get_db
from ..models import User

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


# Schemas
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token)
def register(
    user_in: UserCreate,
    db: Session = Depends(get_db),
) -> Any:
    """Register a new user."""
    by_email = db.query(User).filter(User.email == user_in.email).first()
    if by_email is not None:
        raise HTTPException(status_code=400, detail="Email already registered")

    by_name = db.query(User).filter(User.username == user_in.username).first()
    if by_name is not None:
        raise HTTPException(status_code=400, detail="Username already taken")

    created = register_user(db, user_in.email, user_in.username, user_in.password)
    return issue_bearer_token(created.username)


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
) -> Any:
    """OAuth2 compatible token login."""
    authenticated = login_user(db, form_data.username, form_data.password)
    if authenticated is None:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    return issue_bearer_token(authenticated.username)
