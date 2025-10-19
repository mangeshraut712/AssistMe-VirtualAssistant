"""Shared configuration helpers for the AssistMe backend."""

from __future__ import annotations

import os
from functools import lru_cache


@lru_cache(maxsize=1)
def get_database_url() -> str:
    """Resolve the database URL from environment variables.

    Supports Railway defaults (DATABASE_URL or RAILWAY_DATABASE_URL) and
    falls back to the local docker-compose connection string.
    """
    candidates = [
        os.getenv("DATABASE_URL"),
        os.getenv("RAILWAY_DATABASE_URL"),
    ]

    for url in candidates:
        if url:
            return _normalise_db_url(url)

    # Local default (docker-compose)
    return "postgresql://assistme_user:assistme_password@db:5432/assistme_db"


def _normalise_db_url(url: str) -> str:
    """Ensure SQLAlchemy can consume the URL."""
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    # Add pg8000 driver for PostgreSQL URLs if not specified
    if url.startswith("postgresql://") and "pg8000" not in url:
        return url.replace("postgresql://", "postgresql+pg8000://", 1)
    return url
