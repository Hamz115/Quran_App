"""
NUKE ALL DATA - Clears everything from Supabase AND local SQLite.
Deletes: auth users, profiles, classes, assignments, mistakes,
         mistake_occurrences, class_students, teacher_students.

Usage:
    python nuke_all_data.py
"""

import sqlite3
import requests
from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv(Path(__file__).parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
DB_PATH = Path(__file__).parent / "app.db"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

def nuke_supabase():
    print("=" * 50)
    print("NUKING SUPABASE")
    print("=" * 50)

    # Order matters - delete children before parents (foreign keys)
    tables = [
        "mistake_occurrences",
        "mistakes",
        "assignments",
        "class_students",
        "classes",
        "teacher_students",
        "profiles",
    ]

    for table in tables:
        # DELETE all rows: neq filter on id to match everything
        url = f"{SUPABASE_URL}/rest/v1/{table}?id=neq.00000000-0000-0000-0000-000000000000"
        resp = requests.delete(url, headers=HEADERS)
        if resp.status_code in (200, 204):
            print(f"  Cleared: {table}")
        else:
            print(f"  {table}: {resp.status_code} - {resp.text}")

    # Delete all auth users
    print("\n  Deleting auth users...")
    list_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    resp = requests.get(list_url, headers=HEADERS)
    if resp.status_code == 200:
        users = resp.json().get("users", [])
        print(f"  Found {len(users)} auth users")
        for user in users:
            uid = user["id"]
            email = user.get("email", "unknown")
            del_url = f"{SUPABASE_URL}/auth/v1/admin/users/{uid}"
            del_resp = requests.delete(del_url, headers=HEADERS)
            if del_resp.status_code in (200, 204):
                print(f"    Deleted: {email}")
            else:
                print(f"    Failed to delete {email}: {del_resp.status_code} - {del_resp.text}")
    else:
        print(f"  Failed to list users: {resp.status_code} - {resp.text}")

    print("\n  Supabase: DONE")


def nuke_local():
    print("\n" + "=" * 50)
    print("NUKING LOCAL SQLite (app.db)")
    print("=" * 50)

    if not DB_PATH.exists():
        print("  app.db not found - nothing to clear")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Get all tables
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [row[0] for row in cur.fetchall()]

    # Order: children first
    delete_order = [
        "mistake_occurrences",
        "mistakes",
        "assignments",
        "class_students",
        "classes",
        "teacher_student_relationships",
        "refresh_tokens",
        "users",
        "sync_log",
        "test_mistakes",
        "test_questions",
        "tests",
    ]

    for table in delete_order:
        if table in tables:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            count = cur.fetchone()[0]
            cur.execute(f"DELETE FROM {table}")
            print(f"  Cleared: {table} ({count} rows)")

    # Clear any remaining tables not in the list
    for table in tables:
        if table not in delete_order:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            count = cur.fetchone()[0]
            if count > 0:
                cur.execute(f"DELETE FROM {table}")
                print(f"  Cleared: {table} ({count} rows)")

    conn.commit()
    conn.close()
    print("\n  Local SQLite: DONE")


if __name__ == "__main__":
    print("\n*** WARNING: This will DELETE ALL DATA ***")
    print("Supabase: auth users, profiles, classes, mistakes - EVERYTHING")
    print("Local: app.db - ALL tables emptied")
    confirm = input("\nType 'NUKE' to confirm: ")
    if confirm != "NUKE":
        print("Aborted.")
        exit(1)

    nuke_supabase()
    nuke_local()

    print("\n" + "=" * 50)
    print("ALL DATA NUKED. Clean slate.")
    print("=" * 50)
