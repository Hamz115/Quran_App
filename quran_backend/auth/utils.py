import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from jose import jwt, JWTError
from passlib.context import CryptContext

from .config import (
    SECRET_KEY, ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS,
    BCRYPT_ROUNDS,
    STUDENT_ID_PREFIX, STUDENT_ID_LENGTH, STUDENT_ID_CHARS,
    VERIFICATION_TOKEN_EXPIRE_HOURS
)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=BCRYPT_ROUNDS)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def generate_student_id() -> str:
    """Generate a TeamViewer-style student ID: STU-XXXXXX"""
    random_part = ''.join(secrets.choice(STUDENT_ID_CHARS) for _ in range(STUDENT_ID_LENGTH))
    return f"{STUDENT_ID_PREFIX}-{random_part}"


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: int) -> tuple[str, str, datetime]:
    """
    Create a refresh token.
    Returns: (token, token_hash, expires_at)
    """
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    token_data = {
        "sub": str(user_id),
        "jti": secrets.token_urlsafe(32),
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    }
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    token_hash = hash_token(token)
    return token, token_hash, expire


def hash_token(token: str) -> str:
    """Hash a token for storage."""
    return hashlib.sha256(token.encode()).hexdigest()


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def generate_verification_token() -> tuple[str, datetime]:
    """
    Generate an email verification token.
    Returns: (token, expires_at)
    """
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=VERIFICATION_TOKEN_EXPIRE_HOURS)
    return token, expires_at


def create_user_token_data(user: Dict[str, Any]) -> Dict[str, Any]:
    """Create the data payload for a user's access token."""
    return {
        "sub": str(user["id"]),
        "student_id": user["student_id"],
        "username": user["username"],
        "email": user["email"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "is_verified": bool(user["is_verified"])
    }
