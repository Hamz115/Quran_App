# Session Log: Flutter QPC v2 Migration

**Date:** 2026-02-26
**Session:** 002
**Version:** v1.2.1

## Objective

Migrate Flutter mobile app Quran rendering from QPC v1 (JSON page files) to QPC v2 (SQLite databases with explicit line-structured layout). Mirrors the web migration completed in v1.2.0.

## Summary

Replaced the 604 bundled JSON page files with 2 SQLite databases (qpc-v2-15-lines.db for layout, qpc-v2.db for word/glyph data). Rewrote models, data service, and rendering widget to use line-based structure with explicit line_type (surah_name, ayah, basmallah). Replaced v1 TTF fonts with v2 TTFs. Removed page 586 overflow hack. Updated all field references across classroom and reader screens.

## Work Completed

### Step 1: Bundle v2 Databases
- Copied qpc-v2-15-lines.db and qpc-v2.db from quran_backend/ to quran_mobile/assets/databases/

### Step 2: Constants + DatabaseHelper
- Added qpcLayoutDbName and qpcWordsDbName constants
- Added qpcLayoutDatabase and qpcWordsDatabase getters with asset copy pattern
- Extracted shared `_initBundledDatabase()` method to reduce duplication
- Updated close() to close all 4 databases

### Step 3: QuranPageLine Model (NEW)
- Created new model with lineNumber, lineType, isCentered, surahNumber, words

### Step 4: QuranPageWord Model Rewrite
- Replaced codeV1 with text, surahNum with surah, ayahNum with ayah, wordPosition with word
- Replaced charType with isEnd boolean
- Added fromDbRow() factory, removed fromJson()
- Kept isAyahEnd getter as alias

### Step 5: QuranPageData Model Rewrite
- Simplified to pageNumber + List<QuranPageLine>
- Removed wordsByLine, lineNumbers, surahStarts, SurahStart class

### Step 6: QuranPageDataService Rewrite
- Replaced JSON loading with SQLite queries against v2 databases
- Layout DB provides line structure, Words DB provides glyph data
- isEnd computed page-wide (max word position per surah:ayah across all lines)
- Kept LRU cache (max 10 pages)

### Step 7: MushafPageWidget Rewrite
- Switched to line-based iteration (line.lineType dispatching)
- Removed page 586 overflow hack (v2 has clean 15-line pages)
- Updated all field references (text, surah, ayah, word, isEnd)
- Updated char-level mistake rendering: colors whole letter+harakat group instead of glowing isolated harakat

### Step 8: Classroom Screen Updates
- Updated all word field references in _showWordPopup, _removeMistake

### Step 9: Replace v1 Fonts with v2 Fonts
- User provided v2 TTF fonts in `QPC V2 Font.ttf/` directory (p1.ttf through p604.ttf)
- Renamed from `p{N}.ttf` to `QCF_P{NNN}.ttf` format (zero-padded)
- Replaced all 604 fonts in quran_mobile/assets/fonts/qpc/
- v2 fonts significantly larger (~619KB vs ~80KB for v1)
- Font service unchanged — same naming convention

### Step 10: Cleanup
- Removed assets/quran-pages/ from pubspec.yaml
- Deleted quran_mobile/assets/quran-pages/ directory (604 JSON files + all_pages.json)

## Issues Encountered

- v2 font files named `p{N}.ttf` without zero-padding needed renaming to `QCF_P{NNN}.ttf`
- isEnd computation initially done per-line; fixed to page-wide to handle ayahs spanning multiple lines

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_mobile/assets/databases/qpc-v2-15-lines.db` | Created | v2 page layout database |
| `quran_mobile/assets/databases/qpc-v2.db` | Created | v2 word/glyph database |
| `quran_mobile/assets/fonts/qpc/*.ttf` | Replaced | 604 v1 TTFs replaced with v2 TTFs |
| `quran_mobile/lib/config/constants.dart` | Modified | Added v2 DB name constants |
| `quran_mobile/lib/core/database/database_helper.dart` | Modified | Added v2 DB getters, shared init method |
| `quran_mobile/lib/data/models/quran_page_line.dart` | Created | New line model for v2 |
| `quran_mobile/lib/data/models/quran_page_word.dart` | Rewritten | v2 field names + fromDbRow |
| `quran_mobile/lib/data/models/quran_page_data.dart` | Rewritten | Line-based structure |
| `quran_mobile/lib/core/services/quran_page_data_service.dart` | Rewritten | SQLite queries instead of JSON |
| `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` | Rewritten | Line-type dispatching |
| `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` | Modified | Updated word field refs |
| `quran_mobile/lib/presentation/providers/quran_page_provider.dart` | Modified | Updated comment |
| `quran_mobile/pubspec.yaml` | Modified | Removed quran-pages asset |
| `quran_mobile/assets/quran-pages/` | Deleted | 604 JSON files no longer needed |

## Next Steps

- [ ] Build and test on Android emulator
- [ ] Verify pages 1, 2, 187, 586 render correctly
- [ ] Test classroom mistake marking/removal
- [ ] Test character-level mistakes with new styling

## Notes

- Font loading (qpc_font_service.dart) unchanged — same TTF naming convention
- arabic_text_utils.dart unchanged — char grouping logic stays the same
- surah_header_widget.dart and bismillah_widget.dart unchanged — same API
- Mistake model/repository unchanged — storage schema stays the same
- Continues from web migration: docs/Logs/2026-02-26-001-qpc-v2-web-migration-v1.2.0.md
