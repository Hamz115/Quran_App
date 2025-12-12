import os
import secrets

# JWT Configuration
# In production, use environment variables for these
SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
BCRYPT_ROUNDS = 12

# Student ID Configuration
STUDENT_ID_PREFIX = "STU"
STUDENT_ID_LENGTH = 6
# Exclude confusing characters: 0, O, I, l, 1
STUDENT_ID_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

# Email verification
VERIFICATION_TOKEN_EXPIRE_HOURS = 24
