"""
Migrate text_uthmani from v1 JSON page files into qpc-v2.db words table.

The v2 words DB only has QPC glyph codes (text column). This script adds a
text_uthmani column with the Arabic text from the v1 JSON files, matched by
(surah, ayah, word_position).

Usage:
    python scripts/migrate_uthmani_text.py
"""

import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
V2_WORDS_DB = BASE_DIR / "qpc-v2.db"
QURAN_PAGES_DIR = BASE_DIR / "quran-pages"


def main():
    if not V2_WORDS_DB.exists():
        print(f"ERROR: {V2_WORDS_DB} not found")
        return

    if not QURAN_PAGES_DIR.exists():
        print(f"ERROR: {QURAN_PAGES_DIR} not found")
        return

    conn = sqlite3.connect(V2_WORDS_DB)
    cursor = conn.cursor()

    # Check if column already exists
    cursor.execute("PRAGMA table_info(words)")
    columns = [row[1] for row in cursor.fetchall()]
    if "text_uthmani" not in columns:
        print("Adding text_uthmani column...")
        cursor.execute("ALTER TABLE words ADD COLUMN text_uthmani TEXT")
        conn.commit()
    else:
        print("text_uthmani column already exists, updating values...")

    # Build lookup from v1 JSON: (surah, ayah, word_pos) -> text_uthmani
    print("Reading v1 JSON page files...")
    lookup = {}
    for page_num in range(1, 605):
        page_file = QURAN_PAGES_DIR / f"page_{page_num:03d}.json"
        if not page_file.exists():
            print(f"  WARNING: {page_file} not found, skipping")
            continue

        with open(page_file, "r", encoding="utf-8") as f:
            words = json.load(f)

        for word in words:
            key = (word["s"], word["a"], word["p"])
            lookup[key] = word["t"]

    print(f"  Loaded {len(lookup)} word texts from JSON files")

    # Update v2 words DB
    print("Updating v2 words DB...")
    updated = 0
    missing = 0

    # Get all words from v2
    cursor.execute("SELECT id, surah, ayah, word FROM words")
    all_words = cursor.fetchall()

    # Batch update
    batch = []
    for word_id, surah, ayah, word_pos in all_words:
        key = (surah, ayah, word_pos)
        text = lookup.get(key)
        if text is not None:
            batch.append((text, word_id))
            updated += 1
        else:
            missing += 1

    if batch:
        cursor.executemany("UPDATE words SET text_uthmani = ? WHERE id = ?", batch)
        conn.commit()

    print(f"  Updated: {updated}")
    print(f"  Missing (no v1 match): {missing}")

    # Verify
    cursor.execute("SELECT COUNT(*) FROM words WHERE text_uthmani IS NOT NULL")
    populated = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM words")
    total = cursor.fetchone()[0]
    print(f"\nVerification: {populated}/{total} words have text_uthmani")

    conn.close()
    print("Done!")


if __name__ == "__main__":
    main()
