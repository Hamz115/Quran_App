#!/usr/bin/env python3
"""Export QuranTrack's read-only SQLite Quran data as versioned static JSON.

The hosted web/PWA build cannot depend on a localhost FastAPI process. This script
creates the same response shapes used by quran_pages_server.py under the frontend's
public directory so Vite/S3/CloudFront can serve them directly.
"""
from __future__ import annotations

import json
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "quran_backend"
OUTPUT = ROOT / "quran_frontend" / "public" / "quran-data" / "v1"
LAYOUT_DB = BACKEND / "qpc-v2-15-lines.db"
WORDS_DB = BACKEND / "qpc-v2.db"
QURAN_DB = BACKEND / "quran.db"


def connect(path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    return connection


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )


def export_page(page_number: int) -> dict:
    with connect(LAYOUT_DB) as connection:
        layout_rows = connection.execute(
            "SELECT line_number, line_type, is_centered, first_word_id, "
            "last_word_id, surah_number FROM pages WHERE page_number = ? "
            "ORDER BY line_number",
            (page_number,),
        ).fetchall()
    if not layout_rows:
        raise RuntimeError(f"Page {page_number} has no layout")

    ranges = [
        (int(row["first_word_id"]), int(row["last_word_id"]))
        for row in layout_rows
        if row["line_type"] == "ayah"
        and row["first_word_id"] != ""
        and row["last_word_id"] != ""
    ]
    words_by_id: dict[int, sqlite3.Row] = {}
    if ranges:
        conditions = " OR ".join("(id BETWEEN ? AND ?)" for _ in ranges)
        parameters = [value for pair in ranges for value in pair]
        with connect(WORDS_DB) as connection:
            words = connection.execute(
                "SELECT id, surah, ayah, word, text, text_uthmani FROM words WHERE "
                + conditions
                + " ORDER BY id",
                parameters,
            ).fetchall()
        words_by_id = {int(word["id"]): word for word in words}

    max_word_position: dict[tuple[int, int], int] = {}
    for word in words_by_id.values():
        key = (int(word["surah"]), int(word["ayah"]))
        max_word_position[key] = max(max_word_position.get(key, 0), int(word["word"]))

    lines = []
    for row in layout_rows:
        line = {
            "line_number": row["line_number"],
            "line_type": row["line_type"],
            "is_centered": bool(row["is_centered"]),
            "surah_number": int(row["surah_number"]) if row["surah_number"] != "" else None,
            "words": [],
        }
        if row["line_type"] == "ayah" and row["first_word_id"] != "" and row["last_word_id"] != "":
            for word_id in range(int(row["first_word_id"]), int(row["last_word_id"]) + 1):
                word = words_by_id.get(word_id)
                if word:
                    key = (int(word["surah"]), int(word["ayah"]))
                    line["words"].append(
                        {
                            "id": word["id"],
                            "surah": word["surah"],
                            "ayah": word["ayah"],
                            "word": word["word"],
                            "text": word["text"],
                            "text_uthmani": word["text_uthmani"],
                            "is_end": int(word["word"]) == max_word_position[key],
                        }
                    )
        lines.append(line)
    return {"page_number": page_number, "lines": lines}


def export_surahs() -> None:
    with connect(QURAN_DB) as connection:
        surahs = connection.execute(
            "SELECT number, name, englishName, englishNameTranslation, "
            "numberOfAyahs, revelationType FROM surahs ORDER BY number"
        ).fetchall()
        write_json(OUTPUT / "surahs.json", {"data": [dict(row) for row in surahs]})

        for surah in surahs:
            ayahs = connection.execute(
                "SELECT surahNumber * 1000 + ayahNumber AS number, text, "
                "ayahNumber AS numberInSurah FROM ayahs WHERE surahNumber = ? "
                "ORDER BY ayahNumber",
                (surah["number"],),
            ).fetchall()
            result = dict(surah)
            result["ayahs"] = [dict(row) for row in ayahs]
            write_json(OUTPUT / "surahs" / f"{int(surah['number']):03d}.json", {"data": result})


def main() -> None:
    for required in (LAYOUT_DB, WORDS_DB, QURAN_DB):
        if not required.exists():
            raise FileNotFoundError(required)

    export_surahs()
    page_dir = OUTPUT / "pages"
    for page_number in range(1, 605):
        write_json(page_dir / f"{page_number:03d}.json", export_page(page_number))

    files = list(OUTPUT.rglob("*.json"))
    total_bytes = sum(path.stat().st_size for path in files)
    print(
        json.dumps(
            {
                "output": str(OUTPUT),
                "pages": 604,
                "surahs": 114,
                "json_files": len(files),
                "bytes": total_bytes,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
