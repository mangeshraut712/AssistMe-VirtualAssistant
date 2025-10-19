from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .models import User, Conversation, Message

from .settings import get_database_url

db_url = get_database_url()

Base = declarative_base()

# Register model classes with the base
User.__bases__ = (Base,)
Conversation.__bases__ = (Base,)
Message.__bases__ = (Base,)

# Defer engine/table creation
engine = None
SessionLocal = None
_tables_created = False

def _ensure_database_setup():
    global engine, SessionLocal, _tables_created
    if SessionLocal is None and db_url:
        engine = create_engine(db_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    if SessionLocal is not None and not _tables_created:
        try:
            Base.metadata.create_all(bind=engine)  # type: ignore
            _tables_created = True
        except Exception as e:
            print(f"Warning: Database table creation failed: {e}")
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
