from sqlalchemy import create_engine  # type: ignore[import]
from sqlalchemy.ext.declarative import declarative_base  # type: ignore[import]
from sqlalchemy.orm import sessionmaker  # type: ignore[import]

from .settings import get_database_url


engine = create_engine(get_database_url())
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
