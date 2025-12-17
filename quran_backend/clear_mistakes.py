"""
Clear all mistakes from the database (for testing purposes).
This only removes mistakes and mistake_occurrences - users, classes, and assignments are preserved.

Usage:
    python clear_mistakes.py
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "app.db"

def clear_all_mistakes():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Get counts before clearing
    cur.execute("SELECT COUNT(*) FROM mistakes")
    mistakes_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM mistake_occurrences")
    occurrences_count = cur.fetchone()[0]

    print(f"Found {mistakes_count} mistakes and {occurrences_count} occurrences")

    if mistakes_count == 0:
        print("No mistakes to clear!")
        conn.close()
        return

    # Clear mistake_occurrences first (foreign key)
    cur.execute("DELETE FROM mistake_occurrences")
    print(f"Deleted {cur.rowcount} mistake occurrences")

    # Clear mistakes
    cur.execute("DELETE FROM mistakes")
    print(f"Deleted {cur.rowcount} mistakes")

    conn.commit()
    conn.close()

    print("\nAll mistakes cleared successfully!")
    print("Users, classes, and assignments are preserved.")

if __name__ == "__main__":
    clear_all_mistakes()
