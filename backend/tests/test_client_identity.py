"""Rate-limit bucket identity: credential hashing and proxy trust boundaries."""

import hashlib

from app.client_identity import hash_identifier, resolve_client_id

TOKEN = "eyJhbGciOiJIUzI1NiJ9.e30.sig-nonce"


def test_bearer_token_hashes_to_user_bucket_without_leaking_token():
    client_id = resolve_client_id({"Authorization": f"Bearer {TOKEN}"}, "10.0.0.1")
    assert client_id == "user:" + hashlib.sha256(TOKEN.encode()).hexdigest()[:16]
    assert TOKEN not in client_id


def test_empty_bearer_credentials_fall_back_to_ip_bucket():
    assert resolve_client_id({"Authorization": "Bearer "}, "10.0.0.1") == "ip:10.0.0.1"


def test_api_key_uses_slow_kdf_not_plain_sha256():
    client_id = resolve_client_id({"X-API-Key": "sk-live-123"}, "10.0.0.1")
    assert client_id.startswith("key:")
    # A fast digest would let a leaked bucket id be reversed offline.
    assert client_id != "key:" + hash_identifier("sk-live-123")
    # Fixed salt: the same key must map to the same bucket across requests.
    assert client_id == resolve_client_id({"x-api-key": "sk-live-123"}, "10.0.0.2")


def test_forwarded_for_is_ignored_without_trust_proxy():
    headers = {"X-Forwarded-For": "1.2.3.4, 5.6.7.8"}
    assert resolve_client_id(headers, "10.0.0.1", trust_proxy=False) == "ip:10.0.0.1"


def test_forwarded_for_uses_rightmost_hop_when_proxy_is_trusted():
    headers = {"X-Forwarded-For": "spoofed-ip, 203.0.113.9"}
    assert resolve_client_id(headers, "10.0.0.1", trust_proxy=True) == "ip:203.0.113.9"


def test_forwarded_for_skips_blank_hops():
    headers = {"X-Forwarded-For": "  , 203.0.113.9 , ,"}
    assert resolve_client_id(headers, "10.0.0.1", trust_proxy=True) == "ip:203.0.113.9"


def test_trusted_proxy_without_forwarded_header_uses_socket_address():
    assert resolve_client_id({}, "10.0.0.1", trust_proxy=True) == "ip:10.0.0.1"


def test_no_credentials_and_no_address_maps_to_unknown_bucket():
    assert resolve_client_id({}, None) == "ip:unknown"
