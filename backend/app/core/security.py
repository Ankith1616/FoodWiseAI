"""
FoodWiseAI — Security Utilities

JWT token generation & verification, password hashing with PBKDF2-HMAC-SHA256.
"""

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any, Dict, Optional

from app.core.config import settings

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2 with SHA256 and a random 16-byte salt."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100_000)
    return f"{salt.hex()}:${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a PBKDF2 hash."""
    try:
        parts = hashed_password.split('$')
        if len(parts) != 2:
            return False
        salt = bytes.fromhex(parts[0])
        expected_key = parts[1]
        key = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100_000)
        return hmac.compare_digest(key.hex(), expected_key)
    except Exception:
        return False


def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')


def _b64_decode(data: str) -> bytes:
    padding = 4 - (len(data) % 4)
    if padding != 4:
        data += '=' * padding
    return base64.urlsafe_b64decode(data.encode('utf-8'))


def create_access_token(data: Dict[str, Any], expires_delta: Optional[int] = None) -> str:
    """Creates a signed JWT access token."""
    to_encode = data.copy()
    now = int(time.time())
    expire = now + (expires_delta if expires_delta is not None else ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    to_encode.update({"iat": now, "exp": expire})

    header = {"alg": "HS256", "typ": "JWT"}
    
    header_json = json.dumps(header, separators=(',', ':')).encode('utf-8')
    payload_json = json.dumps(to_encode, separators=(',', ':')).encode('utf-8')

    header_b64 = _b64_encode(header_json)
    payload_b64 = _b64_encode(payload_json)

    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(settings.SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
    signature_b64 = _b64_encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and verifies a signed JWT access token."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None

        header_b64, payload_b64, signature_b64 = parts

        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = hmac.new(settings.SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
        actual_sig = _b64_decode(signature_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        payload_bytes = _b64_decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))

        now = int(time.time())
        if payload.get("exp") and payload["exp"] < now:
            return None

        return payload
    except Exception:
        return None
