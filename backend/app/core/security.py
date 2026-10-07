from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Any
from jose import jwt
from passlib.context import CryptContext
import hashlib
import os

from app.core.config import settings

# Setup password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # Fallback to sha256 with salt if bcrypt format issue
        if ":" in hashed_password:
            salt, hash_val = hashed_password.split(":", 1)
            candidate_hash = hashlib.sha256((salt + plain_password).encode('utf-8')).hexdigest()
            return candidate_hash == hash_val
        return False

def get_password_hash(password: str) -> str:
    """Generate secure password hash."""
    try:
        return pwd_context.hash(password)
    except Exception:
        salt = os.urandom(16).hex()
        hash_val = hashlib.sha256((salt + password).encode('utf-8')).hexdigest()
        return f"{salt}:{hash_val}"

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token with expiration."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "iat": datetime.now(timezone.utc)
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate JWT token."""
    try:
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return decoded
    except Exception:
        return None
