from __future__ import annotations

import logging
from importlib import import_module

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from .settings import get_database_url

db_url = get_database_url()

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
            Base.metadata.create_all(bind=engine)  # type: ignore[arg-type]
            _tables_initialized = True
        except Exception as exc:
            logging.warning("Automatic table creation failed: %s", exc)
            # Table creation failed; leave flag unset so we retry later
            return False

    return SessionLocal is not None

def get_db():
    if not _ensure_database_setup() or SessionLocal is None:
        # Database setup failed or not configured, allow endpoints to degrade gracefully
        return None

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
