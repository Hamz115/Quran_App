# Session Log: Add "By Page" Selector to Flutter Class Creation

**Date:** 2026-02-20
**Session:** 004

## Objective

Add a "By Page" portion selection mode to Flutter's `create_class_screen.dart`, matching the web app's page-based portion selection. Currently Flutter only has "By Surah" and "By Juz" modes.

## Summary

Added a third "By Page" mode chip to the Flutter portion selector. When active, shows From Page / To Page number inputs (1-604 range) that auto-fill the underlying surah fields from `pageStarts` data. Surah and ayah fields become read-only in page mode (same as Juz mode).

## Work Completed

### Add Page Fields to PortionData
- Added `startPage` and `endPage` nullable int fields to `PortionData` class
- No changes to class creation API submission (still uses surah/ayah data)

### Add "By Page" Mode Chip
- Added "By Page" as the first mode chip (matching web order: Page / Surah / Juz)
- Updated `isActive` logic for all 3 chips to check exact mode string
- When switching to page mode, calculates initial pages from current surah using `getPageForSurah`/`getLastPageForSurah`

### Add Page Number Inputs
- New `_buildPageInput` widget with `TextFormField`, `keyboardType: TextInputType.number`
- Shows From Page / To Page when mode == 'page'
- On change: updates surah fields from `pageStarts` data, ensures endPage >= startPage
- Surah dropdowns and ayah inputs become read-only in page mode

### Updated Import
- Added `pageStarts`, `totalPages`, `getPageForSurah`, `getLastPageForSurah` to `quran_data.dart` import

## Issues Encountered

- (updating as work progresses)

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_mobile/lib/presentation/screens/classes/create_class_screen.dart` | Modified | Added "By Page" mode with page number inputs |
| `docs/Logs/2026-02-20-004-flutter-page-selector.md` | Created | Session log |

## Next Steps

- [ ] Teacher/Student role switcher in Flutter
- [ ] Web: edit/delete portions
- [ ] Flutter: edit/delete portions

## Notes

- Flutter's `TextFormField` with `initialValue` is uncontrolled — no snap-back issues like the web had
- `pageStarts` data in `quran_data.dart` maps page number → [surahNumber, ayahNumber]
- Page mode auto-fills surahs but clears ayahs (full pages assumed)
- Continuing from session 003 (input UX fix)
