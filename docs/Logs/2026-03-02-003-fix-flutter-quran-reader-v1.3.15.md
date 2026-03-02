# Session Log: Fix Flutter Quran Reader SQLite Type Cast Crash

**Date:** 2026-03-02
**Session:** 003

## Objective

Fix the "type 'String' is not a subtype of type 'int?' in type cast" error that crashes the Flutter Quran reader on page load.

## Summary

The Flutter Quran reader crashed on every page because the bundled SQLite databases have mixed types — some integer columns store values as text (especially nulls and the first row). All hard `as int` / `as int?` casts were replaced with safe parsers that handle both int and String values.

## Root Cause

The `qpc-v2-15-lines.db` layout database has inconsistent column types due to SQLite's dynamic typing:
- `first_word_id`: row 1 stored as `text`, rest as `integer`
- `last_word_id`: row 1 stored as `text`, rest as `integer`
- `surah_number`: most rows stored as `text` instead of `integer`

Dart's `as int` cast crashes when the value is actually a String like `"1"` instead of `1`.

## Work Completed

### Safe int parsing helpers
- Added `_toInt(dynamic)` and `_toIntOrNull(dynamic)` to `quran_page_data_service.dart`
- Added `_toInt(dynamic)` static method to `QuranPageWord`
- These handle both `int` and `String` values from SQLite

### Fixed all hard casts in quran_page_data_service.dart
- `row['first_word_id'] as int?` → `_toIntOrNull(row['first_word_id'])`
- `row['last_word_id'] as int?` → `_toIntOrNull(row['last_word_id'])`
- `row['surah_number'] as int?` → `_toIntOrNull(row['surah_number'])`
- `row['line_number'] as int` → `_toInt(row['line_number'])`
- `row['is_centered'] as int?` → `_toIntOrNull(row['is_centered'])`
- `row['id'] as int` → `_toInt(row['id'])`
- `row['word'] as int` → `_toInt(row['word'])`

### Fixed QuranPageWord.fromDbRow
- All `row['field'] as int` → `_toInt(row['field'])`
- `row['text_uthmani'] as String` → `(row['text_uthmani'] ?? '') as String`

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_mobile/lib/core/services/quran_page_data_service.dart` | Modified | Safe int parsing for all SQLite casts |
| `quran_mobile/lib/data/models/quran_page_word.dart` | Modified | Safe int parsing in fromDbRow factory |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | Version → 1.3.15 |
| `quran_frontend/package.json` | Modified | Version → 1.3.15 |
| `quran_frontend/src/pages/Settings.tsx` | Modified | Version → v1.3.15 |
| `quran_mobile/pubspec.yaml` | Modified | Version → 1.3.15+1 |
| `website/index.html` | Modified | Version → 1.3.15 |
| `CLAUDE.md` | Modified | Version table + current version |
| `docs/Logs/2026-03-02-003-fix-flutter-quran-reader-v1.3.15.md` | Created | Session log |

## Testing This Release

### Flutter mobile auto-update test
- v1.3.14 is already installed on the phone
- v1.3.15 should trigger the in-app update dialog automatically on launch
- This tests the full OTA update flow (GitHub Releases → ota_update package → APK install)
- If the user doesn't need to manually download from the website, the auto-updater works

### Windows antivirus false positive test
- v1.3.14 was flagged by Chrome/Windows as "virus detected" — couldn't even finish the download
- VirusTotal showed 0 security vendors flagged the URL, so it's likely a false positive
- Suspected cause: `taskkill /F /IM quran-backend.exe` in the Rust sidecar kill code triggers heuristic detection
- v1.3.15 tests whether this is a one-off fluke or a persistent issue
- If v1.3.15 is also blocked, the taskkill approach needs to be replaced with a graceful shutdown (e.g. HTTP endpoint)

## Next Steps

- [ ] Verify Quran reader works on all 604 pages
- [ ] Confirm Flutter auto-update works (v1.3.14 → v1.3.15 without manual download)
- [ ] Confirm Windows installer is NOT flagged as virus (one-off vs persistent)
- [ ] If persistent: replace taskkill with graceful sidecar shutdown endpoint
- [ ] Configure Flutter release signing

## Notes

- SQLite is dynamically typed — column declarations are just hints, not constraints
- Always use safe parsing when reading from SQLite in Dart, never hard cast
- The web API path is unaffected since JSON always has correct types
