"""HSTS emission rules and CORS origin normalisation."""

from app.origins import allowed_origins_list, normalise_origin, strict_transport_security

HSTS = "max-age=31536000; includeSubDomains"


def test_hsts_sent_only_for_https():
    # Emitting HSTS on plain HTTP makes browsers upgrade and breaks local dev.
    assert strict_transport_security("https", None) == HSTS
    assert strict_transport_security("http", None) is None


def test_forwarded_proto_takes_precedence_over_socket_scheme():
    assert strict_transport_security("http", "https") == HSTS


def test_forwarded_proto_first_hop_and_http_never_gets_hsts():
    assert strict_transport_security("http", "https, http") == HSTS
    assert strict_transport_security("https", "http") is None


def test_blank_or_missing_schemes_emit_no_hsts():
    assert strict_transport_security(None, "") is None
    assert strict_transport_security("", "  ") is None
    assert strict_transport_security(None, None) is None


def test_normalise_origin_qualifies_scheme_and_strips_trailing_slashes():
    assert normalise_origin("http://localhost:5173/") == "http://localhost:5173"
    assert normalise_origin("https://example.com///") == "https://example.com"
    assert normalise_origin("mangeshraut712.github.io") == (
        "https://mangeshraut712.github.io"
    )
    assert normalise_origin("  ") is None
    assert normalise_origin(None) is None


def test_env_origins_are_normalised_and_deduplicated(monkeypatch):
    monkeypatch.setenv("APP_URL", "https://app.example.com/")
    monkeypatch.setenv("CORS_ALLOW_ORIGINS", "app.example.com, https://other.example.com")
    monkeypatch.delenv("VERCEL_URL", raising=False)
    origins = allowed_origins_list()
    # APP_URL and the bare CORS entry are the same origin: one entry.
    assert origins.count("https://app.example.com") == 1
    assert "https://other.example.com" in origins
