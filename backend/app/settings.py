"""Shared configuration helpers for the AssistMe backend."""

from __future__ import annotations

import os
from functools import lru_cache


@lru_cache(maxsize=1)
def get_database_url() -> str | None:
    """Resolve the database URL from environment variables.

    Prefers deployment-provided values and falls back to the docker-compose
    connection string for local development.
    Returns None if no database is configured (for Railway deployment without PG)
    """
    candidates = (
        os.getenv("DATABASE_URL"),
        os.getenv("RAILWAY_DATABASE_URL"),
    )

    for url in candidates:
        if url:
            return _normalise_db_url(url)

    # Railway Postgres services expose PG* environment variables even when DATABASE_URL is unset
    pg_host = os.getenv("PGHOST")
    pg_user = os.getenv("PGUSER")
    pg_password = os.getenv("PGPASSWORD")
    pg_db = os.getenv("PGDATABASE")
    pg_port = os.getenv("PGPORT", "5432")

    if all([pg_host, pg_user, pg_password, pg_db]):
        return f"postgresql+pg8000://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_db}"

    # Only provide fallback for local development
    if os.getenv("RAILWAY_PROJECT_ID") is None:
        # Local default (docker-compose)
        return "postgresql+pg8000://assistme_user:assistme_password@db:5432/assistme_db"

    # In Railway without database, return None
    return None


@lru_cache(maxsize=1)
def get_redis_url() -> str:
    """Resolve the Redis URL from environment variables.

    Falls back to the docker-compose connection string for local development.
    """
    url = os.getenv("REDIS_URL")
    if url:
        return url

    # Local default (docker-compose)
    return "redis://redis:6379"


def _normalise_db_url(url: str) -> str:
    """Ensure SQLAlchemy can consume the URL."""
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    if url.startswith("postgresql://"):
        scheme, rest = url.split("://", 1)
        if "+" not in scheme:
            return "postgresql+pg8000://" + rest

    if url.startswith("postgresql+"):
        scheme, rest = url.split("://", 1)
        driver = scheme.split("+", 1)[1]
        if driver != "pg8000":
            return "postgresql+pg8000://" + rest

    return url
