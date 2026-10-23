"""Authentication routes backed by the shared account helpers."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..core.accounts import issue_bearer_token, login_user, register_user
from ..database import get_db
from ..models import User
from ..schemas import Token, UserCreate

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)) -> Any:
    """
    Register a new user.
    """
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )

    created = register_user(db, user_in.email, user_in.username, user_in.password)
    return issue_bearer_token(created.username)


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    authenticated = login_user(db, form_data.username, form_data.password)
    if authenticated is None:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    return issue_bearer_token(authenticated.username)
