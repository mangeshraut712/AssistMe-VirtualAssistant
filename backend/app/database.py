from importlib import import_module

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from .settings import get_database_url

db_url = get_database_url()

if db_url:
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()

    # Import models to register them with SQLAlchemy for auto table creation
    try:
        import_module(".models", package=__name__)
    except ImportError:
        import_module("app.models")
    try:
        Base.metadata.create_all(bind=engine)  # type: ignore  # Create tables automatically
    except Exception as e:
        # Continue without database tables if creation fails
        print(f"Warning: Database table creation failed: {e}")
        pass

else:
    engine = None
    SessionLocal = None
    Base = declarative_base()

# Dependency for FastAPI
def get_db():
    if SessionLocal is None:
        # No database configured, return a mock session
        return None  # Or raise dependency skip
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
