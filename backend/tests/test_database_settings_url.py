"""DATABASE_URL built from PG* variables must keep special characters in the password."""

from sqlalchemy.engine import make_url

from app.config import DatabaseSettings
from app.settings import get_database_url


def test_pg_credentials_with_reserved_characters_round_trip(monkeypatch):
    for name in ("DATABASE_URL", "RAILWAY_DATABASE_URL"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("PGHOST", "db.internal")
    monkeypatch.setenv("PGUSER", "assistme_user")
    monkeypatch.setenv("PGPASSWORD", "p@ss:w0rd/extra?special#chars and space")
    monkeypatch.setenv("PGDATABASE", "assistme_db")

    get_database_url.cache_clear()
    try:
        # Both builders: app settings, and the one the engine and Alembic use.
        for raw in (DatabaseSettings().url, get_database_url()):
            url = make_url(raw)
            assert url.drivername == "postgresql+psycopg"
            assert url.host == "db.internal"
            assert url.port == 5432
            assert url.username == "assistme_user"
            assert url.password == "p@ss:w0rd/extra?special#chars and space"
            assert url.database == "assistme_db"
    finally:
        get_database_url.cache_clear()
