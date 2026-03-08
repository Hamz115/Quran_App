# Session Log: Reader Mistakes by Class + Classroom Polish

**Date:** 2026-03-07
**Session:** 002

## Objective

Add a "Mistakes by Class" section below the Quran page in the Reader (both Tauri and Flutter), mirroring the Classroom experience. Users can see all mistakes on the current page grouped by class, and click/tap a badge to flash-highlight the word on the page. Also polish the Flutter Classroom and Reader UX.

## Summary

Implemented mistakes-by-class sections in both Tauri QuranReader and Flutter QuranReaderScreen. Fixed the missing `class_day` field in the Supabase API. Added flash-highlight animation to MushafPageWidget in Flutter. Fixed Flutter Reader to query Supabase directly for class date/day (local SQLite had no occurrence data). Added click-to-flash in Flutter Classroom. Replaced the tiny surah PopupMenu with a full bottom sheet picker. Removed the annoying bottom overlay from the Classroom.

## Work Completed

### 1. Fix supabase-api.ts — Add class_day to occurrences
- Added `class_day` to `MistakeWithOccurrences` interface
- Updated Supabase query to select `classes (date, day)`
- Updated mapping to include `class_day`
- Files modified: `quran_frontend/src/lib/supabase-api.ts`

### 2. Tauri QuranReader — Mistakes section + click-to-highlight
- Switched from `getMistakes` to `getMistakesWithOccurrences`
- Added `highlightedWordKey` state with flash-on-click
- Added mistakes-by-class section below the page with clickable badges
- Removed `max-w-[500px]` constraint so section spans full width (matches Classroom)
- Files modified: `quran_frontend/src/pages/QuranReader.tsx`

### 3. Flutter MushafPageWidget — Flash animation
- Added `highlightedWordKey` parameter
- Implemented `_FlashingWordWrapper` StatefulWidget with scale + glow animation
- Files modified: `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart`

### 4. Flutter QuranReader — Mistakes section + click-to-highlight
- Added `readerMistakeOccurrencesProvider` — queries Supabase directly (not local SQLite) to get class date/day via JOIN
- Converted `_PageLoader` to `ConsumerStatefulWidget` with ScrollController
- Added `_MistakesByClassSection` widget with grouped badges
- Implemented scroll-to-top + flash on badge tap
- Replaced surah `PopupMenuButton` with full bottom sheet picker (scrollable, auto-scrolls to current surah, shows page numbers)
- Files modified: `quran_mobile/lib/presentation/screens/reader/quran_reader_screen.dart`, `quran_mobile/lib/presentation/providers/providers.dart`

### 5. Flutter Classroom — Click-to-flash + remove overlay
- Added `_highlightedWordKey` state and `_flashWord()` method
- Passed `highlightedWordKey` to `MushafPageWidget`
- Added `onTap` callback to `_MistakeBadgeWidget` — tapping a badge flashes the word on the page
- Removed bottom page nav overlay (was toggled on tap, annoying in classroom context)
- Files modified: `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart`

### 6. Version bump to v1.8.0
- Bumped version in all 6 required files
- Files modified: `tauri.conf.json`, `package.json`, `Settings.tsx`, `pubspec.yaml`, `website/index.html`, `CLAUDE.md`

## Issues Encountered

- **Flutter Reader showed "Unlinked" instead of class dates**: Local SQLite `getMistakesWithOccurrences()` had no occurrence data synced. Fixed by switching `readerMistakeOccurrencesProvider` to query Supabase directly.
- **Tauri mistakes section too narrow**: Was constrained to `max-w-[500px]`. Removed constraint to match Classroom's full-width layout.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/src/lib/supabase-api.ts` | Modified | Add class_day to MistakeWithOccurrences |
| `quran_frontend/src/pages/QuranReader.tsx` | Modified | Mistakes-by-class section + flash highlight, full-width |
| `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` | Modified | Add highlightedWordKey + flash animation |
| `quran_mobile/lib/presentation/screens/reader/quran_reader_screen.dart` | Modified | Mistakes section + scroll-to-top + flash + surah bottom sheet |
| `quran_mobile/lib/presentation/providers/providers.dart` | Modified | readerMistakeOccurrencesProvider (Supabase direct) |
| `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` | Modified | Click-to-flash on badges + remove bottom overlay |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | Version bump to 1.8.0 |
| `quran_frontend/package.json` | Modified | Version bump to 1.8.0 |
| `quran_frontend/src/pages/Settings.tsx` | Modified | Version bump to v1.8.0 |
| `quran_mobile/pubspec.yaml` | Modified | Version bump to 1.8.0+1 |
| `website/index.html` | Modified | Version bump to v1.8.0 |
| `CLAUDE.md` | Modified | Version history + current version v1.8.0 |
| `docs/Logs/2026-03-07-002-reader-mistakes-by-class-v1.8.0.md` | Created | This session log |

## Next Steps

- [ ] Test click-to-flash in Flutter Classroom with real data
- [ ] Test surah bottom sheet picker in Flutter Reader
- [ ] Verify Supabase query returns correct class dates in Flutter Reader

## Notes

- Tauri (web) uses `getMistakesWithOccurrences` which routes through local sidecar → Supabase, so class dates work fine
- Flutter Reader queries Supabase directly for occurrences since local SQLite doesn't sync occurrence data
- Flutter Classroom bottom overlay removed — page navigation now handled solely by swiping
- The `_FlashingWordWrapper` in MushafPageWidget is shared by both Classroom and Reader
