# Session Log: QPC v2 Web Migration

**Date:** 2026-02-26
**Session:** 001
**Version:** v1.2.0

## Objective

Migrate the web Quran rendering from QPC v1 (604 JSON page files + v1 fonts) to QPC v2 (2 SQLite databases + v2 fonts). This eliminates overflow lines, provides explicit layout metadata, and supports multi-glyph words.

## Summary

Migrated the entire web Quran rendering pipeline from QPC v1 to v2. Rewrote the backend endpoint to query two v2 SQLite databases, updated frontend types and API, and rewrote both QuranReader.tsx and Classroom.tsx to use line-structured data with explicit surah/bismillah detection from the database. Replaced all 604 v1 fonts with v2 fonts, rebuilt the Tauri PyInstaller sidecar with v2 databases, and cleaned up all v1 remnants.

## Work Completed

### Migration Script
- Created `quran_backend/scripts/migrate_uthmani_text.py` to populate `text_uthmani` column in v2 words DB from v1 JSON files

### Backend Rewrite
- Rewrote `GET /api/quran/page/{N}` to query v2 SQLite DBs
- Returns line-structured JSON with `line_type`, `is_centered`, `surah_number`
- Added v2 DB connection helpers

### Frontend Types
- New types: `QuranPageWord`, `QuranPageLine`, `QuranPageData` in `quran-api.ts`
- New function `getQuranPage()` replacing `getQuranPageWords()`
- Updated `api.ts` re-exports

### QuranReader.tsx Rewrite
- Line-structured rendering using `pageData.lines`
- Surah headers from `line.line_type === 'surah_name'`
- Bismillah from `line.line_type === 'basmallah'`
- Removed overflow handling (no more lines 16-18)
- Removed previous page font loading
- Removed `surahsStartingOnPage()` and `getSurahStartForLine()`

### Classroom.tsx Rewrite
- Same rendering changes as QuranReader
- Updated mistake field mapping (surahNum → surah, etc.)
- Word popup still uses text_uthmani from enriched v2 DB
- Tuned char-level mistake Uthmani text styling: size `0.95em`, weight `400`, color `rgba(30,41,59,0.92)` to visually blend with surrounding QPC glyphs (Amiri only supports 400/700 weights)
- Fixed portion selector only showing when >1 portions — now shows edit/delete buttons for single portions too
- Fixed edit/delete button styling in light mode (was grey-on-grey, now proper contrast)
- Centered letter buttons in word popup (added `flex items-center justify-center`)
- Redesigned harakat mistake display: instead of isolated glow on haraka character, now colors the entire letter+harakat group together (no box, just color tint) — much cleaner and distinguishable from letter mistakes (which use background+border)

## Issues Encountered

- **3 words missing text_uthmani**: Words at (8:6:13), (13:37:21), (2:181:15) exist in v2 but not in v1 JSON. These are ayah end markers where v2 has one extra word count. Not a problem — end markers don't need text_uthmani.
- **Unused imports after rewrite**: `Fragment` was no longer needed (v2 uses `line.line_type` instead of `<Fragment>` wrappers). Fixed by removing unused imports.
- **Sidecar serving old v1 data**: The compiled `quran-backend.exe` still had old v1 code, causing `data.lines is not iterable` errors. Fixed by running backend directly via venv, then rebuilding the sidecar.
- **System Python version conflict**: Running `python main.py` with system Python gave pydantic/fastapi errors. Fixed by using `venv/Scripts/python main.py`.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_backend/scripts/migrate_uthmani_text.py` | Created | Migration script for text_uthmani |
| `quran_backend/main.py` | Modified | Rewrote /api/quran/page/{N} for v2 SQLite |
| `quran_frontend/src/lib/quran-api.ts` | Modified | New v2 types + getQuranPage() |
| `quran_frontend/src/api.ts` | Modified | Updated re-exports |
| `quran_frontend/src/pages/QuranReader.tsx` | Modified | Line-structured v2 rendering |
| `quran_frontend/src/pages/Classroom.tsx` | Modified | Line-structured v2 rendering + mistake field updates |
| `quran_backend/qpc-v2-15-lines.db` | Added | V2 layout database (copied from root) |
| `quran_backend/qpc-v2.db` | Added | V2 words database (copied from root) |
| `quran_frontend/public/fonts/qpc/*.woff2` | Replaced | All 604 v1 fonts replaced with v2 fonts (renamed p1→QCF_P001 format) |
| `quran_backend/QuranTrackBackend.spec` | Modified | Updated datas to bundle v2 DBs instead of quran-pages/ |
| `quran_frontend/src-tauri/quran-backend-x86_64-pc-windows-msvc.exe` | Rebuilt | Sidecar rebuilt with v2 code and databases |
| `quran_backend/quran-pages/` | Deleted | Removed 604 v1 JSON page files (no longer needed) |

## Next Steps

- [x] ~~Verify font rendering with v2 fonts~~ — Working perfectly
- [x] ~~Test page 586 (no more overflow)~~ — Clean 15 lines
- [x] ~~Clean up v1 JSON files after verification~~ — Deleted
- [x] ~~Rebuild Tauri sidecar~~ — Done
- [ ] Test page 187 (At-Tawbah, no bismillah)
- [ ] Test classroom mistake workflow
- [ ] Flutter migration (separate session)

## Notes

- V2 layout DB has `pages` table with `page_number`, `line_number`, `line_type`, `is_centered`, `first_word_id`, `last_word_id`, `surah_number`
- V2 words DB has `words` table with `id`, `location`, `surah`, `ayah`, `word`, `text` (+ `text_uthmani` after migration)
- 83,668 total words, 9,046 page-line entries
- Line types: 'surah_name', 'ayah', 'basmallah'
- `first_word_id`/`last_word_id` are empty strings for non-ayah lines
- **QPC v2 does NOT provide per-letter/harakat glyphs** — each word is a single pre-rendered glyph in the page font. The font-switch to Amiri for char-level mistake highlighting remains the correct approach.
- User confirmed v2 rendering is "PERFECT exactly like the actual QURAN"
