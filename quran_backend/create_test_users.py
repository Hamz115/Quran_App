#!/usr/bin/env python3
"""
Script to create test users for the Quran App.
Creates 10 students and 5 teachers with Muslim names.
All accounts use the same password: Test123!
"""

import sqlite3
import secrets
from pathlib import Path
from passlib.context import CryptContext

# Database path
APP_DB = Path(__file__).parent / "app.db"

# Password hashing (same as auth/utils.py)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def generate_student_id() -> str:
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    random_part = ''.join(secrets.choice(chars) for _ in range(6))
    return f"STU-{random_part}"

# Common password for all test users
TEST_PASSWORD = "Test123!"

# 10 Students (8 male, 2 female)
STUDENTS = [
    {"first_name": "Ahmed", "last_name": "Khan", "username": "ahmed.khan", "email": "ahmed.khan@test.com"},
    {"first_name": "Yusuf", "last_name": "Ali", "username": "yusuf.ali", "email": "yusuf.ali@test.com"},
    {"first_name": "Omar", "last_name": "Hassan", "username": "omar.hassan", "email": "omar.hassan@test.com"},
    {"first_name": "Ibrahim", "last_name": "Mohammed", "username": "ibrahim.m", "email": "ibrahim.m@test.com"},
    {"first_name": "Bilal", "last_name": "Ahmad", "username": "bilal.ahmad", "email": "bilal.ahmad@test.com"},
    {"first_name": "Khalid", "last_name": "Rahman", "username": "khalid.r", "email": "khalid.r@test.com"},
    {"first_name": "Zayd", "last_name": "Malik", "username": "zayd.malik", "email": "zayd.malik@test.com"},
    {"first_name": "Mustafa", "last_name": "Hussain", "username": "mustafa.h", "email": "mustafa.h@test.com"},
    # Female students
    {"first_name": "Fatima", "last_name": "Zahra", "username": "fatima.zahra", "email": "fatima.zahra@test.com"},
    {"first_name": "Aisha", "last_name": "Begum", "username": "aisha.begum", "email": "aisha.begum@test.com"},
]

# 5 Teachers (3 male, 2 female)
TEACHERS = [
    {"first_name": "Abdullah", "last_name": "Qureshi", "username": "abdullah.q", "email": "abdullah.q@test.com"},
    {"first_name": "Tariq", "last_name": "Jameel", "username": "tariq.jameel", "email": "tariq.jameel@test.com"},
    {"first_name": "Usman", "last_name": "Farooq", "username": "usman.farooq", "email": "usman.farooq@test.com"},
    # Female teachers
    {"first_name": "Maryam", "last_name": "Siddiqui", "username": "maryam.s", "email": "maryam.s@test.com"},
    {"first_name": "Khadijah", "last_name": "Noor", "username": "khadijah.noor", "email": "khadijah.noor@test.com"},
]

def create_users():
    conn = sqlite3.connect(APP_DB)
    conn.row_factory = sqlite3.Row

    password_hash = hash_password(TEST_PASSWORD)

    created_students = []
    created_teachers = []

    # Create students (is_verified = 0)
    print("\n=== Creating Students ===")
    for student in STUDENTS:
        # Check if email already exists
        cursor = conn.execute("SELECT id FROM users WHERE email = ?", (student["email"],))
        if cursor.fetchone():
            print(f"  Skipping {student['first_name']} {student['last_name']} - email already exists")
            continue

        # Generate unique student_id
        student_id = generate_student_id()
        while True:
            cursor = conn.execute("SELECT id FROM users WHERE student_id = ?", (student_id,))
            if not cursor.fetchone():
                break
            student_id = generate_student_id()

        conn.execute(
            """INSERT INTO users (student_id, username, email, password_hash, first_name, last_name, is_verified)
               VALUES (?, ?, ?, ?, ?, ?, 0)""",
            (student_id, student["username"], student["email"], password_hash,
             student["first_name"], student["last_name"])
        )
        created_students.append({**student, "student_id": student_id})
        print(f"  Created: {student['first_name']} {student['last_name']} ({student['email']}) - ID: {student_id}")

    # Create teachers (is_verified = 1)
    print("\n=== Creating Teachers ===")
    for teacher in TEACHERS:
        # Check if email already exists
        cursor = conn.execute("SELECT id FROM users WHERE email = ?", (teacher["email"],))
        if cursor.fetchone():
            print(f"  Skipping {teacher['first_name']} {teacher['last_name']} - email already exists")
            continue

        # Generate unique student_id
        student_id = generate_student_id()
        while True:
            cursor = conn.execute("SELECT id FROM users WHERE student_id = ?", (student_id,))
            if not cursor.fetchone():
                break
            student_id = generate_student_id()

        conn.execute(
            """INSERT INTO users (student_id, username, email, password_hash, first_name, last_name, is_verified)
               VALUES (?, ?, ?, ?, ?, ?, 1)""",
            (student_id, teacher["username"], teacher["email"], password_hash,
             teacher["first_name"], teacher["last_name"])
        )
        created_teachers.append({**teacher, "student_id": student_id})
        print(f"  Created: {teacher['first_name']} {teacher['last_name']} ({teacher['email']}) - ID: {student_id}")

    conn.commit()
    conn.close()

    # Summary
    print("\n" + "="*50)
    print("SUMMARY")
    print("="*50)
    print(f"\nPassword for ALL accounts: {TEST_PASSWORD}")
    print(f"\nStudents created: {len(created_students)}")
    print(f"Teachers created: {len(created_teachers)}")

    if created_students:
        print("\n--- Student Accounts ---")
        for s in created_students:
            print(f"  {s['first_name']} {s['last_name']}")
            print(f"    Email: {s['email']}")
            print(f"    Username: {s['username']}")
            print(f"    Student ID: {s['student_id']}")

    if created_teachers:
        print("\n--- Teacher Accounts ---")
        for t in created_teachers:
            print(f"  {t['first_name']} {t['last_name']}")
            print(f"    Email: {t['email']}")
            print(f"    Username: {t['username']}")

if __name__ == "__main__":
    create_users()
