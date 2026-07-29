"""Lightweight Quran reference-data server for the Mini PC web frontend.

This intentionally serves only bundled, read-only Quran data. It avoids loading the
full desktop sidecar and its Supabase sync dependencies for the browser deployment.
"""
from pathlib import Path
import sqlite3

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent
QPC_LAYOUT_DB = BASE_DIR / "qpc-v2-15-lines.db"
QPC_WORDS_DB = BASE_DIR / "qpc-v2.db"
QURAN_DB = BASE_DIR / "quran.db"

app = FastAPI(title="QuranTrack Quran Pages API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


def connect(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "layout_db": QPC_LAYOUT_DB.exists(),
        "words_db": QPC_WORDS_DB.exists(),
        "quran_db": QURAN_DB.exists(),
    }


@app.get("/api/quran/page/{page_number}")
def get_quran_page(page_number: int):
    if page_number < 1 or page_number > 604:
        raise HTTPException(status_code=404, detail="Page must be between 1 and 604")

    with connect(QPC_LAYOUT_DB) as conn:
        layout_rows = conn.execute(
            "SELECT line_number, line_type, is_centered, first_word_id, "
            "last_word_id, surah_number FROM pages WHERE page_number = ? "
            "ORDER BY line_number",
            (page_number,),
        ).fetchall()
    if not layout_rows:
        raise HTTPException(status_code=404, detail="Page layout not found")

    ranges = [
        (int(row["first_word_id"]), int(row["last_word_id"]))
        for row in layout_rows
        if row["line_type"] == "ayah"
        and row["first_word_id"] != ""
        and row["last_word_id"] != ""
    ]
    words_by_id = {}
    if ranges:
        conditions = " OR ".join("(id BETWEEN ? AND ?)" for _ in ranges)
        parameters = [value for pair in ranges for value in pair]
        with connect(QPC_WORDS_DB) as conn:
            words = conn.execute(
                "SELECT id, surah, ayah, word, text, text_uthmani FROM words WHERE "
                + conditions + " ORDER BY id",
                parameters,
            ).fetchall()
        words_by_id = {word["id"]: word for word in words}

    max_word_position = {}
    for word in words_by_id.values():
        key = (word["surah"], word["ayah"])
        max_word_position[key] = max(max_word_position.get(key, 0), word["word"])

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
                    line["words"].append({
                        "id": word["id"],
                        "surah": word["surah"],
                        "ayah": word["ayah"],
                        "word": word["word"],
                        "text": word["text"],
                        "text_uthmani": word["text_uthmani"],
                        "is_end": word["word"] == max_word_position[(word["surah"], word["ayah"])],
                    })
        lines.append(line)
    return {"page_number": page_number, "lines": lines}


@app.get("/api/surahs")
def get_surahs():
    with connect(QURAN_DB) as conn:
        rows = conn.execute(
            "SELECT number, name, englishName, englishNameTranslation, "
            "numberOfAyahs, revelationType FROM surahs ORDER BY number"
        ).fetchall()
    return {"data": [dict(row) for row in rows]}


@app.get("/api/surahs/{surah_number}")
def get_surah(surah_number: int):
    if surah_number < 1 or surah_number > 114:
        raise HTTPException(status_code=404, detail="Surah not found")
    with connect(QURAN_DB) as conn:
        surah = conn.execute(
            "SELECT number, name, englishName, englishNameTranslation, "
            "numberOfAyahs, revelationType FROM surahs WHERE number = ?",
            (surah_number,),
        ).fetchone()
        ayahs = conn.execute(
            "SELECT surahNumber * 1000 + ayahNumber AS number, text, "
            "ayahNumber AS numberInSurah FROM ayahs WHERE surahNumber = ? "
            "ORDER BY ayahNumber",
            (surah_number,),
        ).fetchall()
    if not surah:
        raise HTTPException(status_code=404, detail="Surah not found")
    result = dict(surah)
    result["ayahs"] = [dict(row) for row in ayahs]
    return {"data": result}
