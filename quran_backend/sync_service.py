"""
Supabase Sync Service for QuranTrack

Handles bidirectional sync between local app.db (SQLite) and Supabase (PostgreSQL).

Sync Strategy:
- Local writes go to app.db first (instant)
- Background sync pushes to Supabase
- Pulls remote changes on app start and periodically

Tables synced:
- profiles (users)
- teacher_students (relationships)
- classes
- assignments
- mistakes
"""

import sys
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

# --- Path resolution for PyInstaller frozen mode ---
if getattr(sys, 'frozen', False):
    _WRITABLE_DIR = Path(sys.executable).parent
    _SRC_DIR = Path(sys._MEIPASS)
else:
    _WRITABLE_DIR = Path(__file__).parent
    _SRC_DIR = Path(__file__).parent

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv(_SRC_DIR / ".env")

from supabase import create_client, Client

# Database paths — read-write, lives next to exe when frozen
APP_DB = _WRITABLE_DIR / "app.db"

# Supabase client (initialized lazily)
_supabase_client: Optional[Client] = None


def get_supabase() -> Client:
    """Get or create Supabase client"""
    global _supabase_client
    if _supabase_client is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_KEY")  # Service key for backend operations
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        _supabase_client = create_client(url, key)
    return _supabase_client


def get_app_db():
    """Get SQLite connection"""
    conn = sqlite3.connect(APP_DB)
    conn.row_factory = sqlite3.Row
    return conn


# ============ PROFILES: Supabase → Local (one-way) ============

def pull_profiles() -> Dict[str, int]:
    """
    Pull ALL profiles from Supabase to app.db.
    Profiles are managed in Supabase (source of truth), so this is one-way sync.
    """
    conn = get_app_db()
    supabase = get_supabase()

    results = {"created": 0, "updated": 0}

    # Get all profiles from Supabase
    response = supabase.table("profiles").select("*").execute()

    for profile in response.data:
        supabase_id = profile["id"]

        # Check if exists locally
        cursor = conn.execute("SELECT id FROM profiles WHERE id = ?", (supabase_id,))
        local_row = cursor.fetchone()

        if local_row:
            # Update existing
            conn.execute("""
                UPDATE profiles SET
                    email = ?, name = ?, role = ?,
                    updated_at = ?, last_synced_at = ?
                WHERE id = ?
            """, (
                profile.get("email"),
                profile.get("name"),
                profile.get("role", "student"),
                profile.get("updated_at"),
                datetime.utcnow().isoformat(),
                supabase_id
            ))
            results["updated"] += 1
        else:
            # Create new local record
            conn.execute("""
                INSERT INTO profiles (id, email, name, role, created_at, updated_at, last_synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                supabase_id,
                profile.get("email"),
                profile.get("name"),
                profile.get("role", "student"),
                profile.get("created_at"),
                profile.get("updated_at"),
                datetime.utcnow().isoformat()
            ))
            results["created"] += 1

        conn.commit()

    conn.close()
    return results


def pull_teacher_students(teacher_id: str) -> Dict[str, int]:
    """
    Pull teacher-student relationships from Supabase to app.db.
    Only pulls relationships for the given teacher.
    """
    conn = get_app_db()
    supabase = get_supabase()

    results = {"created": 0, "updated": 0}

    # Get teacher's students from Supabase
    response = supabase.table("teacher_students").select("*").eq("teacher_id", teacher_id).execute()

    for rel in response.data:
        teacher_id = rel["teacher_id"]
        student_id = rel["student_id"]

        # Check if exists locally
        cursor = conn.execute(
            "SELECT id FROM teacher_students WHERE teacher_id = ? AND student_id = ?",
            (teacher_id, student_id)
        )
        local_row = cursor.fetchone()

        if local_row:
            conn.execute("""
                UPDATE teacher_students SET last_synced_at = ?
                WHERE teacher_id = ? AND student_id = ?
            """, (datetime.utcnow().isoformat(), teacher_id, student_id))
            results["updated"] += 1
        else:
            conn.execute("""
                INSERT INTO teacher_students (teacher_id, student_id, created_at, last_synced_at)
                VALUES (?, ?, ?, ?)
            """, (
                teacher_id,
                student_id,
                rel.get("created_at"),
                datetime.utcnow().isoformat()
            ))
            results["created"] += 1

        conn.commit()

    conn.close()
    return results


# ============ PUSH: Local → Supabase ============

def push_pending_classes(supabase_user_id: str) -> Dict[str, int]:
    """Push pending classes from app.db to Supabase"""
    conn = get_app_db()
    supabase = get_supabase()

    results = {"created": 0, "updated": 0, "errors": 0}

    # Get pending classes for this user
    cursor = conn.execute("""
        SELECT * FROM classes
        WHERE sync_status = 'pending'
        AND (supabase_teacher_id = ? OR teacher_id IS NOT NULL)
    """, (supabase_user_id,))

    for row in cursor.fetchall():
        class_data = dict(row)
        local_id = class_data["id"]
        supabase_id = class_data.get("supabase_id")

        try:
            # Prepare data for Supabase
            remote_data = {
                "teacher_id": supabase_user_id,
                "date": class_data["date"],
                "day": class_data["day"],
                "notes": class_data.get("notes"),
                "performance": class_data.get("performance"),
                "is_published": bool(class_data.get("is_published", 0)),
                "class_type": class_data.get("class_type", "regular"),
            }

            if supabase_id:
                # Update existing
                supabase.table("classes").update(remote_data).eq("id", supabase_id).execute()
                results["updated"] += 1
            else:
                # Create new
                response = supabase.table("classes").insert(remote_data).execute()
                supabase_id = response.data[0]["id"]
                results["created"] += 1

            # Mark as synced
            conn.execute("""
                UPDATE classes
                SET sync_status = 'synced',
                    supabase_id = ?,
                    supabase_teacher_id = ?,
                    last_synced_at = ?
                WHERE id = ?
            """, (supabase_id, supabase_user_id, datetime.utcnow().isoformat(), local_id))
            conn.commit()

            # Sync assignments for this class
            push_class_assignments(conn, supabase, local_id, supabase_id)

        except Exception as e:
            print(f"Error syncing class {local_id}: {e}")
            conn.execute("""
                UPDATE classes SET sync_status = 'error' WHERE id = ?
            """, (local_id,))
            conn.commit()
            results["errors"] += 1

    conn.close()
    return results


def push_class_assignments(conn, supabase: Client, local_class_id: int, supabase_class_id: str):
    """Push assignments for a class"""
    cursor = conn.execute("""
        SELECT * FROM assignments WHERE class_id = ? AND sync_status = 'pending'
    """, (local_class_id,))

    for row in cursor.fetchall():
        assignment = dict(row)
        local_id = assignment["id"]
        supabase_id = assignment.get("supabase_id")

        try:
            remote_data = {
                "class_id": supabase_class_id,
                "type": assignment["type"],
                "start_surah": assignment["start_surah"],
                "end_surah": assignment["end_surah"],
                "start_ayah": assignment.get("start_ayah"),
                "end_ayah": assignment.get("end_ayah"),
            }

            if supabase_id:
                supabase.table("assignments").update(remote_data).eq("id", supabase_id).execute()
            else:
                response = supabase.table("assignments").insert(remote_data).execute()
                supabase_id = response.data[0]["id"]

            conn.execute("""
                UPDATE assignments
                SET sync_status = 'synced', supabase_id = ?
                WHERE id = ?
            """, (supabase_id, local_id))
            conn.commit()

        except Exception as e:
            print(f"Error syncing assignment {local_id}: {e}")


def push_pending_mistakes(supabase_user_id: str) -> Dict[str, int]:
    """Push pending mistakes from app.db to Supabase"""
    conn = get_app_db()
    supabase = get_supabase()

    results = {"created": 0, "updated": 0, "errors": 0}

    cursor = conn.execute("""
        SELECT * FROM mistakes
        WHERE sync_status = 'pending'
        AND supabase_student_id = ?
    """, (supabase_user_id,))

    for row in cursor.fetchall():
        mistake = dict(row)
        local_id = mistake["id"]
        supabase_id = mistake.get("supabase_id")

        try:
            remote_data = {
                "student_id": supabase_user_id,
                "surah_number": mistake["surah_number"],
                "ayah_number": mistake["ayah_number"],
                "word_index": mistake["word_index"],
                "word_text": mistake["word_text"],
                "char_index": mistake.get("char_index"),
                "error_count": mistake.get("error_count", 1),
            }

            if supabase_id:
                supabase.table("mistakes").update(remote_data).eq("id", supabase_id).execute()
                results["updated"] += 1
            else:
                response = supabase.table("mistakes").insert(remote_data).execute()
                supabase_id = response.data[0]["id"]
                results["created"] += 1

            conn.execute("""
                UPDATE mistakes
                SET sync_status = 'synced',
                    supabase_id = ?,
                    supabase_student_id = ?,
                    last_synced_at = ?
                WHERE id = ?
            """, (supabase_id, supabase_user_id, datetime.utcnow().isoformat(), local_id))
            conn.commit()

        except Exception as e:
            print(f"Error syncing mistake {local_id}: {e}")
            conn.execute("UPDATE mistakes SET sync_status = 'error' WHERE id = ?", (local_id,))
            conn.commit()
            results["errors"] += 1

    conn.close()
    return results


# ============ PULL: Supabase → Local ============

def pull_classes(supabase_user_id: str, since: Optional[str] = None) -> Dict[str, int]:
    """Pull classes from Supabase to app.db"""
    conn = get_app_db()
    supabase = get_supabase()

    results = {"created": 0, "updated": 0}

    # Query Supabase for user's classes
    query = supabase.table("classes").select("*").eq("teacher_id", supabase_user_id)
    if since:
        query = query.gte("updated_at", since)

    response = query.execute()

    for remote_class in response.data:
        supabase_id = remote_class["id"]

        # Check if exists locally
        cursor = conn.execute("SELECT id FROM classes WHERE supabase_id = ?", (supabase_id,))
        local_row = cursor.fetchone()

        if local_row:
            # Update existing
            conn.execute("""
                UPDATE classes SET
                    date = ?, day = ?, notes = ?, performance = ?,
                    is_published = ?, class_type = ?,
                    sync_status = 'synced', last_synced_at = ?
                WHERE supabase_id = ?
            """, (
                remote_class["date"],
                remote_class["day"],
                remote_class.get("notes"),
                remote_class.get("performance"),
                1 if remote_class.get("is_published") else 0,
                remote_class.get("class_type", "regular"),
                datetime.utcnow().isoformat(),
                supabase_id
            ))
            results["updated"] += 1
        else:
            # Create new local record
            conn.execute("""
                INSERT INTO classes (
                    date, day, notes, performance, is_published, class_type,
                    supabase_id, supabase_teacher_id, sync_status, last_synced_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)
            """, (
                remote_class["date"],
                remote_class["day"],
                remote_class.get("notes"),
                remote_class.get("performance"),
                1 if remote_class.get("is_published") else 0,
                remote_class.get("class_type", "regular"),
                supabase_id,
                supabase_user_id,
                datetime.utcnow().isoformat()
            ))
            results["created"] += 1

        conn.commit()

    conn.close()
    return results


def pull_mistakes(supabase_user_id: str, since: Optional[str] = None) -> Dict[str, int]:
    """Pull mistakes from Supabase to app.db"""
    conn = get_app_db()
    supabase = get_supabase()

    results = {"created": 0, "updated": 0}

    query = supabase.table("mistakes").select("*").eq("student_id", supabase_user_id)
    if since:
        query = query.gte("updated_at", since)

    response = query.execute()

    for remote_mistake in response.data:
        supabase_id = remote_mistake["id"]

        cursor = conn.execute("SELECT id FROM mistakes WHERE supabase_id = ?", (supabase_id,))
        local_row = cursor.fetchone()

        if local_row:
            conn.execute("""
                UPDATE mistakes SET
                    surah_number = ?, ayah_number = ?, word_index = ?,
                    word_text = ?, char_index = ?, error_count = ?,
                    sync_status = 'synced', last_synced_at = ?
                WHERE supabase_id = ?
            """, (
                remote_mistake["surah_number"],
                remote_mistake["ayah_number"],
                remote_mistake["word_index"],
                remote_mistake["word_text"],
                remote_mistake.get("char_index"),
                remote_mistake.get("error_count", 1),
                datetime.utcnow().isoformat(),
                supabase_id
            ))
            results["updated"] += 1
        else:
            conn.execute("""
                INSERT INTO mistakes (
                    surah_number, ayah_number, word_index, word_text,
                    char_index, error_count, supabase_id, supabase_student_id,
                    sync_status, last_synced_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)
            """, (
                remote_mistake["surah_number"],
                remote_mistake["ayah_number"],
                remote_mistake["word_index"],
                remote_mistake["word_text"],
                remote_mistake.get("char_index"),
                remote_mistake.get("error_count", 1),
                supabase_id,
                supabase_user_id,
                datetime.utcnow().isoformat()
            ))
            results["created"] += 1

        conn.commit()

    conn.close()
    return results


# ============ FULL SYNC ============

def full_sync(supabase_user_id: str, user_role: str = "student") -> Dict[str, Any]:
    """
    Perform full bidirectional sync for a user.
    Called on login and periodically.

    Args:
        supabase_user_id: The Supabase UUID of the logged-in user
        user_role: 'teacher' or 'student' - determines what to sync
    """
    results = {
        "profiles": {},
        "teacher_students": {},
        "push": {"classes": {}, "mistakes": {}},
        "pull": {"classes": {}, "mistakes": {}},
    }

    # Always sync profiles first (one-way from Supabase)
    results["profiles"] = pull_profiles()

    # Sync teacher-student relationships if teacher
    if user_role == "teacher":
        results["teacher_students"] = pull_teacher_students(supabase_user_id)

    # Push local changes first
    results["push"]["classes"] = push_pending_classes(supabase_user_id)
    results["push"]["mistakes"] = push_pending_mistakes(supabase_user_id)

    # Then pull remote changes
    results["pull"]["classes"] = pull_classes(supabase_user_id)
    results["pull"]["mistakes"] = pull_mistakes(supabase_user_id)

    return results


# ============ HELPER: Mark for Sync ============

def mark_for_sync(table: str, local_id: int, supabase_user_id: str):
    """Mark a record as pending sync after local write"""
    conn = get_app_db()

    if table == "classes":
        conn.execute("""
            UPDATE classes
            SET sync_status = 'pending', supabase_teacher_id = ?, updated_at = ?
            WHERE id = ?
        """, (supabase_user_id, datetime.utcnow().isoformat(), local_id))
    elif table == "mistakes":
        conn.execute("""
            UPDATE mistakes
            SET sync_status = 'pending', supabase_student_id = ?, updated_at = ?
            WHERE id = ?
        """, (supabase_user_id, datetime.utcnow().isoformat(), local_id))
    elif table == "assignments":
        conn.execute("""
            UPDATE assignments
            SET sync_status = 'pending', updated_at = ?
            WHERE id = ?
        """, (datetime.utcnow().isoformat(), local_id))

    conn.commit()
    conn.close()
