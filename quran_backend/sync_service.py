"""
Supabase Sync Service for QuranTrack

Handles bidirectional sync between local app.db (SQLite) and Supabase (PostgreSQL).

Sync Strategy:
- Local writes go to app.db first (instant)
- Background sync pushes to Supabase
- Pulls remote changes on app start and periodically

Tables synced:
- profiles (users)
- listener_reciters (relationships; legacy teacher_students fallback)
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


def is_schema_compat_error(exc: Exception) -> bool:
    message = str(exc)
    return any(token in message for token in (
        "listener_reciters", "class_reciters", "reciter_id", "user_code",
        "listener_id", "relationship", "PGRST200", "PGRST204", "42P01", "42703",
    ))


def execute_with_legacy_fallback(primary, legacy):
    try:
        return primary()
    except Exception as exc:
        if not is_schema_compat_error(exc):
            raise
        return legacy()


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
                    email = ?, name = ?, role = ?, user_code = ?,
                    updated_at = ?, last_synced_at = ?
                WHERE id = ?
            """, (
                profile.get("email"),
                profile.get("name"),
                profile.get("role"),
                profile.get("user_code") or profile.get("student_id"),
                profile.get("updated_at"),
                datetime.utcnow().isoformat(),
                supabase_id
            ))
            results["updated"] += 1
        else:
            # Create new local record
            conn.execute("""
                INSERT INTO profiles (id, email, name, role, student_id, user_code, created_at, updated_at, last_synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                supabase_id,
                profile.get("email"),
                profile.get("name"),
                profile.get("role"),
                profile.get("student_id"),
                profile.get("user_code") or profile.get("student_id"),
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
    Pull listener-reciter relationships from Supabase to app.db.
    Only pulls relationships for the given listener.
    """
    conn = get_app_db()
    supabase = get_supabase()

    results = {"created": 0, "updated": 0}

    response = execute_with_legacy_fallback(
        lambda: supabase.table("listener_reciters").select("*").eq("listener_id", teacher_id).execute(),
        lambda: supabase.table("teacher_students").select("*").eq("teacher_id", teacher_id).execute(),
    )

    for rel in response.data:
        teacher_id = rel.get("listener_id") or rel["teacher_id"]
        student_id = rel.get("reciter_id") or rel["student_id"]

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

        cursor = conn.execute(
            "SELECT id FROM listener_reciters WHERE listener_id = ? AND reciter_id = ?",
            (teacher_id, student_id)
        )
        if cursor.fetchone():
            conn.execute("""
                UPDATE listener_reciters SET last_synced_at = ?
                WHERE listener_id = ? AND reciter_id = ?
            """, (datetime.utcnow().isoformat(), teacher_id, student_id))
        else:
            conn.execute("""
                INSERT INTO listener_reciters (id, listener_id, reciter_id, created_at, last_synced_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                rel.get("id"),
                teacher_id,
                student_id,
                rel.get("created_at"),
                datetime.utcnow().isoformat()
            ))

        conn.commit()

    conn.close()
    return results


# ============ PUSH: Local → Supabase ============

def push_pending_classes(supabase_user_id: str) -> Dict[str, int]:
    """Push pending classes from app.db to Supabase.

    IMPORTANT: Reads all pending data first, closes the connection,
    then does network calls. This prevents SQLite lock contention
    that blocks foreground reads while background sync runs.
    """
    supabase = get_supabase()
    results = {"created": 0, "updated": 0, "errors": 0}

    # Step 1: Read pending data and release the connection immediately
    conn = get_app_db()
    cursor = conn.execute("""
        SELECT * FROM classes
        WHERE sync_status = 'pending'
        AND (supabase_teacher_id = ? OR teacher_id IS NOT NULL)
    """, (supabase_user_id,))
    pending_rows = [dict(row) for row in cursor.fetchall()]
    conn.close()

    if not pending_rows:
        return results

    # Step 2: Do all network calls WITHOUT holding the SQLite lock
    sync_results = []  # (local_id, supabase_id, success, assignments_to_push)
    for class_data in pending_rows:
        local_id = class_data["id"]
        supabase_id = class_data.get("supabase_id")

        try:
            remote_data = {
                "listener_id": supabase_user_id,
                "teacher_id": supabase_user_id,  # Compatibility dual-write
                "date": class_data["date"],
                "day": class_data["day"],
                "notes": class_data.get("notes"),
                "performance": class_data.get("performance"),
                "is_published": True,  # All sessions visible now
            }

            if supabase_id:
                supabase.table("classes").update(remote_data).eq("id", supabase_id).execute()
                results["updated"] += 1
            else:
                response = supabase.table("classes").insert(remote_data).execute()
                supabase_id = response.data[0]["id"]
                results["created"] += 1

            sync_results.append((local_id, supabase_id, True))

        except Exception as e:
            print(f"Error syncing class {local_id}: {e}")
            sync_results.append((local_id, None, False))
            results["errors"] += 1

    # Step 3: Reopen connection briefly to update sync statuses
    conn = get_app_db()
    for local_id, supabase_id, success in sync_results:
        if success:
            conn.execute("""
                UPDATE classes
                SET sync_status = 'synced',
                    supabase_id = ?,
                    supabase_teacher_id = ?,
                    last_synced_at = ?
                WHERE id = ?
            """, (supabase_id, supabase_user_id, datetime.utcnow().isoformat(), local_id))
            # Sync assignments and students for this class
            push_class_assignments(conn, supabase, local_id, supabase_id)
            push_class_students(conn, supabase, local_id, supabase_id)
        else:
            conn.execute("UPDATE classes SET sync_status = 'error' WHERE id = ?", (local_id,))
    conn.commit()
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


def push_class_students(conn, supabase: Client, local_class_id: int, supabase_class_id: str):
    """Push class_reciters enrollments for a class to Supabase."""
    cursor = conn.execute("""
        SELECT student_id FROM class_students WHERE class_id = ?
    """, (local_class_id,))

    for row in cursor.fetchall():
        student_id = row["student_id"] if isinstance(row, dict) else row[0]
        try:
            # Check if already exists
            existing = execute_with_legacy_fallback(
                lambda: supabase.table("class_reciters").select("id").eq(
                    "class_id", supabase_class_id
                ).eq("reciter_id", student_id).execute(),
                lambda: supabase.table("class_students").select("id").eq(
                    "class_id", supabase_class_id
                ).eq("student_id", student_id).execute(),
            )
            if not existing.data:
                execute_with_legacy_fallback(
                    lambda: supabase.table("class_reciters").insert({
                        "class_id": supabase_class_id,
                        "reciter_id": student_id,
                    }).execute(),
                    lambda: supabase.table("class_students").insert({
                        "class_id": supabase_class_id,
                        "student_id": student_id,
                    }).execute(),
                )
        except Exception as e:
            print(f"Error syncing class_student {local_class_id}/{student_id}: {e}")


def push_pending_mistakes(supabase_user_id: str) -> Dict[str, int]:
    """Push pending mistakes from app.db to Supabase.

    IMPORTANT: Reads all pending data first, closes the connection,
    then does network calls. This prevents SQLite lock contention
    that blocks foreground reads while background sync runs.
    """
    supabase = get_supabase()
    results = {"created": 0, "updated": 0, "errors": 0}

    # Step 1: Read pending data and release the connection immediately
    conn = get_app_db()
    cursor = conn.execute("""
        SELECT * FROM mistakes
        WHERE sync_status = 'pending'
        AND supabase_student_id = ?
    """, (supabase_user_id,))
    pending_rows = [dict(row) for row in cursor.fetchall()]
    conn.close()

    if not pending_rows:
        return results

    # Step 2: Do all network calls WITHOUT holding the SQLite lock
    sync_results = []  # (local_id, supabase_id, success)
    for mistake in pending_rows:
        local_id = mistake["id"]
        supabase_id = mistake.get("supabase_id")

        try:
            remote_data = {
                "reciter_id": supabase_user_id,
                "surah_number": mistake["surah_number"],
                "ayah_number": mistake["ayah_number"],
                "word_index": mistake["word_index"],
                "word_text": mistake["word_text"],
                "char_index": mistake.get("char_index"),
                "error_count": mistake.get("error_count", 1),
            }

            if supabase_id:
                legacy_remote_data = dict(remote_data)
                legacy_remote_data["student_id"] = legacy_remote_data.pop("reciter_id")
                execute_with_legacy_fallback(
                    lambda: supabase.table("mistakes").update(remote_data).eq("id", supabase_id).execute(),
                    lambda: supabase.table("mistakes").update(legacy_remote_data).eq("id", supabase_id).execute(),
                )
                results["updated"] += 1
            else:
                legacy_remote_data = dict(remote_data)
                legacy_remote_data["student_id"] = legacy_remote_data.pop("reciter_id")
                response = execute_with_legacy_fallback(
                    lambda: supabase.table("mistakes").insert(remote_data).execute(),
                    lambda: supabase.table("mistakes").insert(legacy_remote_data).execute(),
                )
                supabase_id = response.data[0]["id"]
                results["created"] += 1

            sync_results.append((local_id, supabase_id, True))

        except Exception as e:
            print(f"Error syncing mistake {local_id}: {e}")
            sync_results.append((local_id, None, False))
            results["errors"] += 1

    # Step 3: Reopen connection briefly to update sync statuses and sync occurrences
    conn = get_app_db()
    for local_id, supabase_id, success in sync_results:
        if success:
            conn.execute("""
                UPDATE mistakes
                SET sync_status = 'synced',
                    supabase_id = ?,
                    supabase_student_id = ?,
                    supabase_reciter_id = ?,
                    last_synced_at = ?
                WHERE id = ?
            """, (supabase_id, supabase_user_id, supabase_user_id, datetime.utcnow().isoformat(), local_id))
            # Sync mistake_occurrences for this mistake
            push_mistake_occurrences(conn, supabase, local_id, supabase_id)
        else:
            conn.execute("UPDATE mistakes SET sync_status = 'error' WHERE id = ?", (local_id,))
    conn.commit()
    conn.close()
    return results


def push_mistake_occurrences(conn, supabase: Client, local_mistake_id: int, supabase_mistake_id: str):
    """Push mistake_occurrences for a mistake to Supabase."""
    cursor = conn.execute("""
        SELECT mo.class_id, mo.occurred_at, c.supabase_id as class_supabase_id
        FROM mistake_occurrences mo
        LEFT JOIN classes c ON mo.class_id = c.id
        WHERE mo.mistake_id = ?
    """, (local_mistake_id,))

    for row in cursor.fetchall():
        occ = dict(row)
        class_supabase_id = occ.get("class_supabase_id")
        if not class_supabase_id:
            continue  # Class not yet synced, skip this occurrence

        try:
            # Check if this occurrence already exists
            existing = supabase.table("mistake_occurrences").select("id").eq(
                "mistake_id", supabase_mistake_id
            ).eq("class_id", class_supabase_id).execute()
            if not existing.data:
                supabase.table("mistake_occurrences").insert({
                    "mistake_id": supabase_mistake_id,
                    "class_id": class_supabase_id,
                }).execute()
        except Exception as e:
            print(f"Error syncing mistake_occurrence {local_mistake_id}/{class_supabase_id}: {e}")


# ============ PULL: Supabase → Local ============

def pull_classes(supabase_user_id: str, since: Optional[str] = None) -> Dict[str, int]:
    """Pull classes from Supabase to app.db"""
    conn = get_app_db()
    supabase = get_supabase()

    results = {"created": 0, "updated": 0}

    # Query Supabase for user's classes
    query = supabase.table("classes").select("*").eq("listener_id", supabase_user_id)
    if since:
        query = query.gte("updated_at", since)

    response = execute_with_legacy_fallback(
        lambda: query.execute(),
        lambda: supabase.table("classes").select("*").eq("teacher_id", supabase_user_id).execute(),
    )

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

    query = supabase.table("mistakes").select("*").eq("reciter_id", supabase_user_id)
    if since:
        query = query.gte("updated_at", since)

    response = execute_with_legacy_fallback(
        lambda: query.execute(),
        lambda: supabase.table("mistakes").select("*").eq("student_id", supabase_user_id).execute(),
    )

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
                    char_index, error_count, supabase_id, supabase_student_id, supabase_reciter_id,
                    sync_status, last_synced_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)
            """, (
                remote_mistake["surah_number"],
                remote_mistake["ayah_number"],
                remote_mistake["word_index"],
                remote_mistake["word_text"],
                remote_mistake.get("char_index"),
                remote_mistake.get("error_count", 1),
                supabase_id,
                supabase_user_id,
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
        user_role: Legacy param, ignored — all users sync everything now
    """
    results = {
        "profiles": {},
        "teacher_students": {},
        "push": {"classes": {}, "mistakes": {}},
        "pull": {"classes": {}, "mistakes": {}},
    }

    # Always sync profiles first (one-way from Supabase)
    results["profiles"] = pull_profiles()

    # Always sync contacts (no role check — everyone can have contacts)
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
            SET sync_status = 'pending', supabase_teacher_id = ?, supabase_listener_id = ?, updated_at = ?
            WHERE id = ?
        """, (supabase_user_id, supabase_user_id, datetime.utcnow().isoformat(), local_id))
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
