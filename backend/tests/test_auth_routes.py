"""Unit test contracts for user registration, login, and token issuance."""

import importlib
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
import app.models  # noqa: F401 - ensure models are registered with Base.metadata
from tests.support import expect


@pytest.fixture(params=["app.routes.auth", "app.routes.auth_standalone"])
def auth_client(request):
    """Create test client with in-memory SQLite and auth router."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    auth_module = importlib.import_module(request.param)
    app = FastAPI()
    app.include_router(auth_module.router)
    app.dependency_overrides[get_db] = override_get_db

    return TestClient(app)


def test_register_user_success(auth_client):
    """Registering a new user with strong password returns bearer access token."""
    response = auth_client.post(
        "/api/auth/register",
        json={
            "email": "testuser@example.com",
            "username": "testuser_1",
            "password": "Password123",
        },
    )
    expect(response.status_code == 200, "registration should succeed")
    data = response.json()
    expect("access_token" in data, "response must include access_token")
    expect(data.get("token_type") == "bearer", "token_type must be bearer")


def test_register_duplicate_email_rejected(auth_client):
    """Attempting to register with an already existing email returns HTTP 400."""
    user_payload = {
        "email": "duplicate@example.com",
        "username": "first_user",
        "password": "Password123",
    }
    res1 = auth_client.post("/api/auth/register", json=user_payload)
    expect(res1.status_code == 200, "first registration must succeed")

    res2 = auth_client.post(
        "/api/auth/register",
        json={
            "email": "duplicate@example.com",
            "username": "second_user",
            "password": "Password123",
        },
    )
    expect(res2.status_code == 400, "duplicate email must return 400")
    expect("already exists" in res2.json()["detail"], "helpful duplicate detail")


def test_register_email_case_insensitivity_and_whitespace(auth_client):
    """Registration normalizes email casing and trims whitespace."""
    user_payload = {
        "email": "  MixedCase@Example.COM  ",
        "username": "  cased_user  ",
        "password": "Password123",
    }
    res1 = auth_client.post("/api/auth/register", json=user_payload)
    expect(res1.status_code == 200, "mixed case registration should succeed")

    # Duplicate with lowercase returns 400
    res2 = auth_client.post(
        "/api/auth/register",
        json={
            "email": "mixedcase@example.com",
            "username": "other_user",
            "password": "Password123",
        },
    )
    expect(res2.status_code == 400, "duplicate lowercase email must return 400")

    # Login works with both username and lowercase email
    login_res = auth_client.post(
        "/api/auth/login",
        data={"username": "mixedcase@example.com", "password": "Password123"},
    )
    expect(login_res.status_code == 200, "login with normalized email must succeed")


def test_register_duplicate_username_rejected(auth_client):
    """Attempting to register with an already existing username returns HTTP 400."""
    user_payload = {
        "email": "user1@example.com",
        "username": "unique_handle",
        "password": "Password123",
    }
    res1 = auth_client.post("/api/auth/register", json=user_payload)
    expect(res1.status_code == 200, "first registration must succeed")

    res2 = auth_client.post(
        "/api/auth/register",
        json={
            "email": "user2@example.com",
            "username": "unique_handle",
            "password": "Password123",
        },
    )
    expect(res2.status_code == 400, "duplicate username must return 400")


def test_register_weak_password_rejected(auth_client):
    """Weak passwords lacking uppercase, lowercase, or digits are rejected with 422."""
    res_no_upper = auth_client.post(
        "/api/auth/register",
        json={
            "email": "weak@example.com",
            "username": "weak_user",
            "password": "password123",
        },
    )
    expect(res_no_upper.status_code == 422, "missing uppercase must return 422")

    res_no_digit = auth_client.post(
        "/api/auth/register",
        json={
            "email": "weak2@example.com",
            "username": "weak_user2",
            "password": "PasswordOnly",
        },
    )
    expect(res_no_digit.status_code == 422, "missing digit must return 422")


def test_login_with_username_success(auth_client):
    """Logging in using username and password returns access token."""
    auth_client.post(
        "/api/auth/register",
        json={
            "email": "loginuser@example.com",
            "username": "login_target",
            "password": "ValidPassword99",
        },
    )

    response = auth_client.post(
        "/api/auth/login",
        data={"username": "login_target", "password": "ValidPassword99"},
    )
    expect(response.status_code == 200, "login with username should succeed")
    data = response.json()
    expect("access_token" in data and data.get("token_type") == "bearer", "valid bearer token")


def test_login_with_email_success(auth_client):
    """Logging in using email address and password returns access token."""
    auth_client.post(
        "/api/auth/register",
        json={
            "email": "email_login@example.com",
            "username": "email_user_target",
            "password": "ValidPassword99",
        },
    )

    response = auth_client.post(
        "/api/auth/login",
        data={"username": "email_login@example.com", "password": "ValidPassword99"},
    )
    expect(response.status_code == 200, "login with email should succeed")
    data = response.json()
    expect("access_token" in data and data.get("token_type") == "bearer", "valid bearer token")


def test_login_incorrect_password_rejected(auth_client):
    """Incorrect password returns HTTP 400 Bad Request."""
    auth_client.post(
        "/api/auth/register",
        json={
            "email": "secure@example.com",
            "username": "secure_user",
            "password": "CorrectPassword123",
        },
    )

    response = auth_client.post(
        "/api/auth/login",
        data={"username": "secure_user", "password": "WrongPassword456"},
    )
    expect(response.status_code == 400, "wrong password must return 400")
    expect("Incorrect email or password" in response.json()["detail"], "generic security detail")


def test_login_nonexistent_user_rejected(auth_client):
    """Nonexistent user login returns HTTP 400 Bad Request."""
    response = auth_client.post(
        "/api/auth/login",
        data={"username": "ghost_user", "password": "SomePassword123"},
    )
    expect(response.status_code == 400, "nonexistent user must return 400")
