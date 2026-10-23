"""Security utilities.

Password hashes are Argon2id via argon2-cffi's PasswordHasher. That is the
supported API in argon2-cffi 25; the legacy module-level hash_password helpers
stay unused. Existing bcrypt hashes still verify, and a successful login
replaces them with Argon2.
"""

import os
from datetime import datetime, timedelta
from typing import Any, Optional, Tuple, Union

import bcrypt
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from jose import jwt

_argon2 = PasswordHasher()

SECRET_KEY = os.getenv(
    "SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def _as_hash_text(hashed_password: Union[str, bytes]) -> str:
    if isinstance(hashed_password, bytes):
        return hashed_password.decode("utf-8")
    return hashed_password


def _is_argon2_hash(hashed_password: Union[str, bytes]) -> bool:
    try:
        return _as_hash_text(hashed_password).startswith("$argon2")
    except UnicodeDecodeError:
        return False


def _verify_legacy_bcrypt(plain_password: str, hashed_password: str) -> bool:
    """Verify a passlib/bcrypt hash without passlib.

    bcrypt 4.1+ dropped the metadata passlib probes, and bcrypt 5 rejects the
    long secret that probe uses. The library itself still verifies the hashes
    already stored for this app. Only the first 72 bytes are significant.
    """
    secret = plain_password.encode("utf-8")[:72]
    try:
        return bcrypt.checkpw(secret, hashed_password.encode("ascii"))
    except (ValueError, TypeError):
        return False


def verify_password(plain_password: str, hashed_password: Union[str, bytes]) -> bool:
    """Return whether plain_password matches an Argon2 or legacy bcrypt hash."""
    try:
        encoded = _as_hash_text(hashed_password)
    except UnicodeDecodeError:
        return False

    if encoded.startswith("$argon2"):
        try:
            return bool(_argon2.verify(encoded, plain_password))
        except VerificationError:
            return False

    return _verify_legacy_bcrypt(plain_password, encoded)


def get_password_hash(password: str) -> str:
    """Hash a new password with the current Argon2id parameters."""
    return _argon2.hash(password)


def password_needs_rehash(hashed_password: Union[str, bytes]) -> bool:
    """Return whether a stored hash should be replaced with current Argon2 parameters.

    argon2-cffi 25 accepts bytes here, matching the rest of PasswordHasher.
    Non-Argon2 hashes, including legacy bcrypt, always need a rehash.
    """
    if not _is_argon2_hash(hashed_password):
        return True
    return _argon2.check_needs_rehash(hashed_password)


def authenticate_password(
    plain_password: str, hashed_password: Union[str, bytes]
) -> Tuple[bool, Optional[str]]:
    """Verify a password and return a replacement hash when parameters are stale.

    The second value is a new Argon2 hash when the password matched a legacy
    bcrypt hash or an Argon2 hash whose cost parameters differ. It is None when
    the stored hash is already current, or when verification fails.
    """
    if not verify_password(plain_password, hashed_password):
        return False, None
    if not password_needs_rehash(hashed_password):
        return True, None
    return True, get_password_hash(plain_password)


def authenticate_and_upgrade(user: Any, plain_password: str, db: Any) -> bool:
    """Verify a user's password and store a current Argon2 hash when needed.

    Returns False when the user is missing or the password does not match.
    On success, a legacy or stale hash is replaced and committed when a
    database session is present.
    """
    if user is None:
        return False
    valid, upgraded = authenticate_password(plain_password, user.hashed_password)
    if not valid:
        return False
    if upgraded and db is not None:
        user.hashed_password = upgraded
        db.commit()
    return True


def create_access_token(
    subject: Union[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {"sub": str(subject), "exp": expire}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
