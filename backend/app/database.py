from __future__ import annotations

import logging
import os
from importlib import import_module
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .settings import get_database_url

# Get database URL from settings
db_url = get_database_url()

# If no database URL is configured, use SQLite in a data directory
if not db_url:
    data_dir = Path(os.getenv("DATA_DIR", "."))
    data_dir.mkdir(exist_ok=True)
    sqlite_path = data_dir / "assistme.db"
    db_url = f"sqlite:///{sqlite_path}"
    logging.info(f"Using SQLite database at {sqlite_path}")
else:
    logging.info(
        f"Using configured database: {db_url.split('@')[-1] if '@' in db_url else 'SQLite'}"
    )

Base = declarative_base()
engine = None
SessionLocal = None
_tables_initialized = False


def _load_models() -> None:
    """
    Import the models module so SQLAlchemy sees the mapped classes.
    Works for both package-relative and absolute imports.
    """
    try:
        import_module(".models", package=__package__)
    except ImportError:
        import_module("app.models")


def _ensure_database_setup() -> bool:
    """Create the engine/session and lazily create tables if a DB URL is configured."""
    global engine, SessionLocal, _tables_initialized

    if not db_url:
        return False

    if engine is None:
        try:
            engine = create_engine(db_url)
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        except Exception as exc:
            logging.warning("Database engine creation failed: %s", exc)
            # Engine creation failed (missing driver, bad URL, etc.)
            engine = None
            SessionLocal = None
            return False

    if engine is not None and not _tables_initialized:
        try:
            _load_models()
            Base.metadata.create_all(bind=engine)
            _tables_initialized = True
        except Exception as exc:
            logging.warning("Automatic table creation failed: %s", exc)
            # Table creation failed; leave flag unset so we retry later
            return False

    return SessionLocal is not None


def get_db():
    if not _ensure_database_setup() or SessionLocal is None:
        # Database setup failed or not configured, yield None to allow endpoints to degrade gracefully
        yield None
        return

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
