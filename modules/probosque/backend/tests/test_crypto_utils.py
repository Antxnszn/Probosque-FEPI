from datetime import timedelta
from jose import jwt
from app.utils.crypto import (
    generate_nonce,
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
)
from app.services.evidence_service import compute_sha256
from app.config import settings


def test_generate_nonce_length_and_uniqueness():
    """Verify cryptographic nonce generation length and randomness."""
    nonce1 = generate_nonce(16)
    nonce2 = generate_nonce(16)
    # Hex encoding turns 16 bytes into 32 hex characters
    assert len(nonce1) == 32
    assert len(nonce2) == 32
    assert nonce1 != nonce2


def test_compute_sha256_standard_vectors():
    """Verify SHA-256 computation against standard test vectors."""
    # Standard vector: empty string
    empty_hash = compute_sha256(b"")
    assert empty_hash == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    # Known content
    content_hash = compute_sha256(b"probosque-test-payload")
    assert len(content_hash) == 64
    assert isinstance(content_hash, str)


def test_password_hash_and_verification():
    """Verify bcrypt password hashing and verification edge cases."""
    password = "SuperSecretPassword2026!"
    hashed = get_password_hash(password)

    # Hash should be a valid bcrypt string
    assert hashed != password
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")

    # Correct password verifies
    assert verify_password(password, hashed) is True

    # Incorrect password fails
    assert verify_password("WrongPassword!", hashed) is False

    # Empty password fails
    assert verify_password("", hashed) is False


def test_jwt_create_and_decode_valid():
    """Verify JWT access token encoding and decoding."""
    payload_data = {"sub": "user-12345", "role": "TECHNICIAN"}
    token = create_access_token(payload_data, expires_delta=timedelta(minutes=15))

    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "user-12345"
    assert decoded["role"] == "TECHNICIAN"
    assert "exp" in decoded


def test_jwt_decode_expired_token():
    """Edge Case: Expired token returns None without raising unhandled exception."""
    payload_data = {"sub": "user-expired"}
    # Token expired 1 hour ago
    expired_token = create_access_token(payload_data, expires_delta=timedelta(hours=-1))

    decoded = decode_access_token(expired_token)
    assert decoded is None


def test_jwt_decode_tampered_token():
    """Edge Case: Token with modified payload or invalid signature returns None."""
    payload_data = {"sub": "legit-user"}
    token = create_access_token(payload_data)

    # Tamper with token string
    tampered_token = token[:-4] + "ABCD"
    decoded = decode_access_token(tampered_token)
    assert decoded is None
