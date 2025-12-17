"""
FastAPI Dependencies (2025 Best Practice)

Centralized dependency injection for:
- Database sessions
- Authentication
- Rate limiting
- AI providers
- Caching
"""

from __future__ import annotations
import time
from pydantic import BaseModel, Field
from typing import Any

from functools import lru_cache
from typing import Annotated, AsyncGenerator

from fastapi import Depends, Header, HTTPException, Request, status

from .config import get_settings, AppSettings
from .logging_config import logger


# ==============================================================================
# Settings
# ==============================================================================

def get_app_settings() -> AppSettings:
    """Get application settings (cached)."""
    return get_settings()


Settings = Annotated[AppSettings, Depends(get_app_settings)]


# ==============================================================================
# Database
# ==============================================================================

async def get_db() -> AsyncGenerator:
    """Get database session with proper cleanup.

    Yields:
        Database session

    Note:
        Handles case where database is not configured (Vercel/serverless)
    """
    settings = get_settings()
    db_url = settings.database.url

    if not db_url:
        # No database configured
        yield None
        return

    # Import here to avoid circular imports
    try:
        from .database import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Database unavailable: {e}")
        yield None


# Type alias for database dependency
DBSession = Annotated[Any, Depends(get_db)]


# ==============================================================================
# Authentication
# ==============================================================================

async def get_optional_token(
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> str | None:
    """Extract optional bearer token from Authorization header."""
    if not authorization:
        return None

    if not authorization.startswith("Bearer "):
        return None

    return authorization[7:]


async def get_required_token(
    authorization: str = Header(..., alias="Authorization"),
) -> str:
    """Extract required bearer token from Authorization header.

    Raises:
        HTTPException: If token is missing or invalid format
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization[7:]
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return token


# Token dependency types
OptionalToken = Annotated[str | None, Depends(get_optional_token)]
RequiredToken = Annotated[str, Depends(get_required_token)]


async def get_current_user(token: RequiredToken) -> dict:
    """Validate token and get current user.

    Args:
        token: JWT token from Authorization header

    Returns:
        User data dict

    Raises:
        HTTPException: If token is invalid
    """
    # Import here to avoid circular imports
    try:
        from jose import JWTError, jwt
        from .config import get_settings

        settings = get_settings()
        payload = jwt.decode(
            token,
            settings.security.secret_key,
            algorithms=[settings.security.algorithm],
        )
        username: str | None = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims",
            )
        return {"username": username, "user_id": payload.get("user_id")}

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {e}",
        )


CurrentUser = Annotated[dict, Depends(get_current_user)]


# ==============================================================================
# Rate Limiting
# ==============================================================================

async def check_rate_limit(request: Request) -> None:
    """Check rate limit for current request.

    Uses client_id from RateLimitContextMiddleware.
    """
    client_id = getattr(request.state, "client_id", "unknown")

    # Import rate limit service
    try:
        from .services.rate_limit_service import rate_limit_service

        allowed, remaining, reset_at = await rate_limit_service.check_limit(client_id)

        # Add rate limit headers
        request.state.rate_limit_remaining = remaining
        request.state.rate_limit_reset = reset_at

        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers={
                    "X-RateLimit-Remaining": str(remaining),
                    "X-RateLimit-Reset": str(reset_at),
                    "Retry-After": str(max(1, reset_at - int(time.time()))),
                },
            )
    except ImportError:
        # Rate limiting not configured
        pass


RateLimited = Annotated[None, Depends(check_rate_limit)]


# ==============================================================================
# AI Provider
# ==============================================================================

@lru_cache
def get_ai_provider():
    """Get configured AI provider (cached).

    Returns:
        Configured AI provider instance
    """
    from .providers import get_provider
    return get_provider()


AIProvider = Annotated[Any, Depends(get_ai_provider)]


# ==============================================================================
# Request Context
# ==============================================================================

def get_request_id(request: Request) -> str:
    """Get request ID from request state."""
    return getattr(request.state, "request_id", "unknown")


def get_client_id(request: Request) -> str:
    """Get client ID from request state."""
    return getattr(request.state, "client_id", "unknown")


RequestID = Annotated[str, Depends(get_request_id)]
ClientID = Annotated[str, Depends(get_client_id)]


# ==============================================================================
# Common Query Parameters
# ==============================================================================


class PaginationParams(BaseModel):
    """Common pagination parameters."""
    skip: int = Field(default=0, ge=0, description="Number of items to skip")
    limit: int = Field(default=20, ge=1, le=100, description="Max items to return")


async def get_pagination(
    skip: int = 0,
    limit: int = 20,
) -> PaginationParams:
    """Get pagination parameters."""
    return PaginationParams(skip=skip, limit=min(limit, 100))


Pagination = Annotated[PaginationParams, Depends(get_pagination)]


class SortParams(BaseModel):
    """Common sorting parameters."""
    sort_by: str = Field(default="created_at", description="Field to sort by")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")


async def get_sorting(
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> SortParams:
    """Get sorting parameters."""
    return SortParams(sort_by=sort_by, sort_order=sort_order)


Sorting = Annotated[SortParams, Depends(get_sorting)]


# ==============================================================================
# Utility Dependencies
# ==============================================================================


async def get_request_timing(request: Request) -> dict:
    """Get request timing information."""
    start_time = getattr(request.state, "start_time", time.perf_counter())
    return {
        "start_time": start_time,
        "elapsed_ms": (time.perf_counter() - start_time) * 1000,
    }


Timing = Annotated[dict, Depends(get_request_timing)]
