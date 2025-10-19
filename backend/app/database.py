from importlib import import_module

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from .settings import get_database_url

db_url = get_database_url()

# Deferred database setup - only create when accessed
engine = None
SessionLocal = None
Base = None
_tables_created = False

def _ensure_database_setup():
    global engine, SessionLocal, Base, _tables_created
    if Base is None:
        # First time setup
        Base = declarative_base()
        if db_url:
            try:
                engine = create_engine(db_url)
                SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            except Exception as e:
                print(f"Warning: Database engine creation failed: {e}")
                engine = None
                SessionLocal = None
                return False

            # Try to create tables
            if engine is not None and not _tables_created:
                try:
                    # Import models dynamically
                    import_module(".models", package=__name__)
                    Base.metadata.create_all(bind=engine)  # type: ignore
                    _tables_created = True
                except Exception as e:
                    print(f"Warning: Database table creation failed: {e}")
                    return False
        else:
            engine = None
            SessionLocal = None
            return False
    return True

# Dependency for FastAPI
def get_db():
    if not _ensure_database_setup() or SessionLocal is None:
        # Database setup failed or not configured, return None
        return None  # App works without database

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
