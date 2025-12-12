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
    role: str = Field(..., pattern=r'^(teacher|student)$')  # "teacher" or "student"


class LoginRequest(BaseModel):
    identifier: str  # Can be email or username
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class VerifyEmailRequest(BaseModel):
    token: str


class AddStudentRequest(BaseModel):
    student_id: str = Field(..., pattern=r'^STU-[A-Z0-9]{6}$')


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
    is_verified: bool
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


class StudentLookupResponse(BaseModel):
    student_id: str
    first_name: str
    last_name: str
    display_name: str  # "Ahmed H." for privacy


class StudentListItem(BaseModel):
    id: int
    student_id: str
    first_name: str
    last_name: str
    added_at: str


class TeacherListItem(BaseModel):
    id: int
    first_name: str
    last_name: str
    added_at: str


class MessageResponse(BaseModel):
    message: str
