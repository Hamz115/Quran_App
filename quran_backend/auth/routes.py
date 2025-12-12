from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
import sqlite3
from pathlib import Path
from datetime import datetime

from .models import (
    SignupRequest, LoginRequest, RefreshTokenRequest, VerifyEmailRequest,
    AddStudentRequest, UpdateProfileRequest,
    UserResponse, AuthResponse, TokenResponse, MessageResponse,
    StudentLookupResponse, StudentListItem, TeacherListItem
)
from .utils import (
    hash_password, verify_password, generate_student_id,
    create_access_token, create_refresh_token, decode_token,
    hash_token, generate_verification_token, create_user_token_data
)
from .dependencies import get_current_user, get_current_verified_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
students_router = APIRouter(prefix="/api/students", tags=["Student Management"])
teachers_router = APIRouter(prefix="/api/teachers", tags=["Teacher Management"])

# Database path
APP_DB = Path(__file__).parent.parent / "app.db"


def get_db():
    conn = sqlite3.connect(APP_DB)
    conn.row_factory = sqlite3.Row
    return conn


# ============ AUTH ENDPOINTS ============

@router.post("/signup", response_model=AuthResponse)
async def signup(data: SignupRequest):
    """Create a new user account - Teacher (verified) or Student (basic)"""
    conn = get_db()

    # Check if email already exists
    cursor = conn.execute("SELECT id FROM users WHERE email = ?", (data.email.lower(),))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username already exists
    cursor = conn.execute("SELECT id FROM users WHERE username = ?", (data.username.lower(),))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Generate unique student ID
    student_id = generate_student_id()
    while True:
        cursor = conn.execute("SELECT id FROM users WHERE student_id = ?", (student_id,))
        if not cursor.fetchone():
            break
        student_id = generate_student_id()

    # Hash password and create user
    password_hash = hash_password(data.password)

    # Teacher = verified (is_verified = 1), Student = basic (is_verified = 0)
    is_verified = 1 if data.role == "teacher" else 0

    cursor = conn.execute(
        """INSERT INTO users (student_id, username, email, password_hash, first_name, last_name, is_verified)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (student_id, data.username.lower(), data.email.lower(), password_hash,
         data.first_name, data.last_name, is_verified)
    )
    user_id = cursor.lastrowid
    conn.commit()

    # Fetch the created user
    cursor = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = dict(cursor.fetchone())

    # Create tokens
    token_data = create_user_token_data(user)
    access_token = create_access_token(token_data)
    refresh_token, token_hash, expires_at = create_refresh_token(user_id)

    # Store refresh token hash
    conn.execute(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        (user_id, token_hash, expires_at.isoformat())
    )
    conn.commit()
    conn.close()

    return AuthResponse(
        user=UserResponse(**user),
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest):
    """Login with email or username"""
    conn = get_db()

    # Find user by email or username
    identifier = data.identifier.lower()
    cursor = conn.execute(
        "SELECT * FROM users WHERE email = ? OR username = ?",
        (identifier, identifier)
    )
    user = cursor.fetchone()

    if not user:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    user = dict(user)

    # Verify password
    if not verify_password(data.password, user["password_hash"]):
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # Update last login
    conn.execute(
        "UPDATE users SET last_login_at = ? WHERE id = ?",
        (datetime.utcnow().isoformat(), user["id"])
    )

    # Create tokens
    token_data = create_user_token_data(user)
    access_token = create_access_token(token_data)
    refresh_token, token_hash, expires_at = create_refresh_token(user["id"])

    # Store refresh token hash
    conn.execute(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        (user["id"], token_hash, expires_at.isoformat())
    )
    conn.commit()
    conn.close()

    return AuthResponse(
        user=UserResponse(**user),
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(data: RefreshTokenRequest):
    """Get new access token using refresh token"""
    # Decode refresh token
    payload = decode_token(data.refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    user_id = int(payload["sub"])
    token_hash = hash_token(data.refresh_token)

    conn = get_db()

    # Verify refresh token exists and is valid
    cursor = conn.execute(
        "SELECT id FROM refresh_tokens WHERE user_id = ? AND token_hash = ? AND expires_at > ?",
        (user_id, token_hash, datetime.utcnow().isoformat())
    )
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    # Delete old refresh token (rotation)
    conn.execute("DELETE FROM refresh_tokens WHERE token_hash = ?", (token_hash,))

    # Get user data
    cursor = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    user = dict(user)

    # Create new tokens
    token_data = create_user_token_data(user)
    access_token = create_access_token(token_data)
    new_refresh_token, new_token_hash, expires_at = create_refresh_token(user_id)

    # Store new refresh token
    conn.execute(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        (user_id, new_token_hash, expires_at.isoformat())
    )
    conn.commit()
    conn.close()

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    data: RefreshTokenRequest = None,
    current_user: dict = Depends(get_current_user)
):
    """Logout - invalidate refresh token"""
    conn = get_db()

    if data and data.refresh_token:
        # Delete specific refresh token
        token_hash = hash_token(data.refresh_token)
        conn.execute("DELETE FROM refresh_tokens WHERE token_hash = ?", (token_hash,))
    else:
        # Delete all refresh tokens for this user
        conn.execute("DELETE FROM refresh_tokens WHERE user_id = ?", (int(current_user["sub"]),))

    conn.commit()
    conn.close()

    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's profile"""
    conn = get_db()
    cursor = conn.execute("SELECT * FROM users WHERE id = ?", (int(current_user["sub"]),))
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserResponse(**dict(user))


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    data: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile"""
    conn = get_db()

    updates = []
    values = []

    if data.first_name:
        updates.append("first_name = ?")
        values.append(data.first_name)

    if data.last_name:
        updates.append("last_name = ?")
        values.append(data.last_name)

    if not updates:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )

    updates.append("updated_at = ?")
    values.append(datetime.utcnow().isoformat())
    values.append(int(current_user["sub"]))

    conn.execute(
        f"UPDATE users SET {', '.join(updates)} WHERE id = ?",
        values
    )
    conn.commit()

    cursor = conn.execute("SELECT * FROM users WHERE id = ?", (int(current_user["sub"]),))
    user = cursor.fetchone()
    conn.close()

    return UserResponse(**dict(user))


@router.post("/request-verification", response_model=MessageResponse)
async def request_email_verification(current_user: dict = Depends(get_current_user)):
    """Request email verification (to upgrade to Teacher)"""
    if current_user.get("is_verified"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )

    conn = get_db()

    # Generate verification token
    token, expires_at = generate_verification_token()

    conn.execute(
        "UPDATE users SET verification_token = ?, verification_token_expires_at = ? WHERE id = ?",
        (token, expires_at.isoformat(), int(current_user["sub"]))
    )
    conn.commit()
    conn.close()

    # TODO: Send email with magic link
    # For now, just return the token (in production, send via email)
    # The magic link would be: {frontend_url}/verify-email?token={token}

    return MessageResponse(
        message=f"Verification email sent to {current_user['email']}. Token: {token}"
    )


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(data: VerifyEmailRequest):
    """Verify email with token from magic link"""
    conn = get_db()

    cursor = conn.execute(
        """SELECT id, verification_token_expires_at FROM users
           WHERE verification_token = ? AND is_verified = 0""",
        (data.token,)
    )
    user = cursor.fetchone()

    if not user:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )

    user = dict(user)

    # Check if token is expired
    if user["verification_token_expires_at"]:
        expires_at = datetime.fromisoformat(user["verification_token_expires_at"])
        if datetime.utcnow() > expires_at:
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification token has expired"
            )

    # Mark as verified
    conn.execute(
        """UPDATE users SET is_verified = 1, verification_token = NULL,
           verification_token_expires_at = NULL, updated_at = ? WHERE id = ?""",
        (datetime.utcnow().isoformat(), user["id"])
    )
    conn.commit()
    conn.close()

    return MessageResponse(
        message="Email verified! You now have Teacher capabilities."
    )


# ============ STUDENT MANAGEMENT ENDPOINTS ============

@students_router.get("/lookup", response_model=StudentLookupResponse)
async def lookup_student(
    email: str,
    current_user: dict = Depends(get_current_verified_user)
):
    """Look up a student by their email (Teacher only)"""
    conn = get_db()

    cursor = conn.execute(
        "SELECT student_id, email, first_name, last_name FROM users WHERE email = ?",
        (email.lower(),)
    )
    student = cursor.fetchone()
    conn.close()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user found with that email"
        )

    student = dict(student)

    # Create privacy-friendly display name (first name + last initial)
    display_name = f"{student['first_name']} {student['last_name'][0]}."

    return StudentLookupResponse(
        student_id=student["student_id"],
        email=student["email"],
        first_name=student["first_name"],
        last_name=student["last_name"],
        display_name=display_name
    )


@students_router.post("/add", response_model=MessageResponse)
async def add_student(
    data: AddStudentRequest,
    current_user: dict = Depends(get_current_verified_user)
):
    """Add a student to teacher's roster (Teacher only)"""
    teacher_id = int(current_user["sub"])
    conn = get_db()

    # Find the student by email
    cursor = conn.execute(
        "SELECT id, first_name, last_name FROM users WHERE email = ?",
        (data.email.lower(),)
    )
    student = cursor.fetchone()

    if not student:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )

    student = dict(student)
    student_user_id = student["id"]

    # Can't add yourself
    if student_user_id == teacher_id:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add yourself as a student"
        )

    # Check if relationship already exists
    cursor = conn.execute(
        "SELECT id FROM teacher_student_relationships WHERE teacher_id = ? AND student_id = ?",
        (teacher_id, student_user_id)
    )
    if cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student is already in your roster"
        )

    # Create relationship
    conn.execute(
        "INSERT INTO teacher_student_relationships (teacher_id, student_id) VALUES (?, ?)",
        (teacher_id, student_user_id)
    )
    conn.commit()
    conn.close()

    return MessageResponse(
        message=f"Student {student['first_name']} {student['last_name']} added successfully"
    )


@students_router.get("", response_model=List[StudentListItem])
async def get_my_students(current_user: dict = Depends(get_current_verified_user)):
    """Get all students for current teacher (Teacher only)"""
    teacher_id = int(current_user["sub"])
    conn = get_db()

    cursor = conn.execute(
        """SELECT u.id, u.student_id, u.first_name, u.last_name, tsr.added_at
           FROM users u
           JOIN teacher_student_relationships tsr ON u.id = tsr.student_id
           WHERE tsr.teacher_id = ?
           ORDER BY tsr.added_at DESC""",
        (teacher_id,)
    )
    students = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return students


@students_router.delete("/remove/{student_id}", response_model=MessageResponse)
async def remove_student(
    student_id: str,
    current_user: dict = Depends(get_current_verified_user)
):
    """Remove a student from teacher's roster (Teacher only)"""
    teacher_id = int(current_user["sub"])
    conn = get_db()

    # Find the student
    cursor = conn.execute(
        "SELECT id FROM users WHERE student_id = ?",
        (student_id.upper(),)
    )
    student = cursor.fetchone()

    if not student:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )

    student_user_id = student["id"]

    # Delete relationship
    cursor = conn.execute(
        "DELETE FROM teacher_student_relationships WHERE teacher_id = ? AND student_id = ?",
        (teacher_id, student_user_id)
    )

    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student is not in your roster"
        )

    conn.commit()
    conn.close()

    return MessageResponse(message="Student removed from roster")


# ============ TEACHER ENDPOINTS (for students) ============

@teachers_router.get("", response_model=List[TeacherListItem])
async def get_my_teachers(current_user: dict = Depends(get_current_user)):
    """Get all teachers who have added the current user as a student"""
    student_id = int(current_user["sub"])
    conn = get_db()

    cursor = conn.execute(
        """SELECT u.id, u.first_name, u.last_name, tsr.added_at
           FROM users u
           JOIN teacher_student_relationships tsr ON u.id = tsr.teacher_id
           WHERE tsr.student_id = ?
           ORDER BY tsr.added_at DESC""",
        (student_id,)
    )
    teachers = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return teachers
