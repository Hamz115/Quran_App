from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# Request Models
class SignupRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=30, pattern=r'^[a-zA-Z0-9_]+$')
    password: str = Field(..., min_length=8)
    # role removed — no teacher/student distinction


class LoginRequest(BaseModel):
    identifier: str  # Can be email or username
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class VerifyEmailRequest(BaseModel):
    token: str


class AddContactRequest(BaseModel):
    email: EmailStr


class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)


# Response Models
class UserResponse(BaseModel):
    id: int
    student_id: str
    username: str
    email: str
    first_name: str
    last_name: str
    is_verified: bool = True  # Legacy field, always True now
    created_at: str

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class ContactLookupResponse(BaseModel):
    student_id: str
    email: str
    first_name: str
    last_name: str
    display_name: str  # "Ahmed H." for privacy


class ContactListItem(BaseModel):
    id: int
    student_id: str
    first_name: str
    last_name: str
    added_at: str


class MessageResponse(BaseModel):
    message: str
