"""DATABASE_URL built from PG* variables must keep special characters in the password."""

from sqlalchemy.engine import make_url

from app.config import DatabaseSettings


def test_pg_credentials_with_reserved_characters_round_trip(monkeypatch):
    for name in ("DATABASE_URL", "RAILWAY_DATABASE_URL"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("PGHOST", "db.internal")
    monkeypatch.setenv("PGUSER", "assistme_user")
    monkeypatch.setenv("PGPASSWORD", "p@ss:w0rd/extra?special#chars and space")
    monkeypatch.setenv("PGDATABASE", "assistme_db")

    url = make_url(DatabaseSettings().url)

    assert url.drivername == "postgresql+psycopg"
    assert url.host == "db.internal"
    assert url.port == 5432
    assert url.username == "assistme_user"
    assert url.password == "p@ss:w0rd/extra?special#chars and space"
    assert url.database == "assistme_db"
