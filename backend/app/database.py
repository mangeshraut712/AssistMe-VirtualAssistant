from sqlalchemy import create_engine  # type: ignore[import]
from sqlalchemy.ext.declarative import declarative_base  # type: ignore[import]
from sqlalchemy.orm import sessionmaker  # type: ignore[import]
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://assistme_user:assistme_password@localhost:5432/assistme_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
