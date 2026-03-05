# Session Log: Flutter Student View Fixes + Settings UI

**Date:** 2026-03-05
**Session:** 003

## Objective

Fix Flutter Student View showing teacher's mistake data instead of empty, and replace the toggle switch with clickable view options matching the web/Tauri UI.

## Summary

Fixed three dashboard providers (statsProvider, topMistakesProvider, mistakeCountsBySurahProvider) to return empty data when a teacher is in Student View, since the teacher has no own mistakes as a student. Replaced the Settings toggle switch with two tappable "Teacher View" / "Student View" options with checkmark on the active one, matching the web/Tauri pattern.

## Work Completed

### 1. Fix Student View Showing Teacher's Mistake Data
- `statsProvider` — returns empty stats when teacher is in Student View
- `topMistakesProvider` — returns empty list when teacher is in Student View
- `mistakeCountsBySurahProvider` — returns empty map when teacher is in Student View
- All check `viewModeProvider` + actual auth role to determine behavior

### 2. Replace Toggle with Clickable View Options
- Removed Switch toggle from Settings
- Added two ListTile options: "Teacher View" (cyan) and "Student View" (teal)
- Active option shows checkmark icon and highlighted background
- Matches web/Tauri "Switch View" dropdown pattern
- Section header changed from "VIEW MODE" to "SWITCH VIEW"

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_mobile/lib/presentation/providers/providers.dart` | Modified | statsProvider, topMistakesProvider, mistakeCountsBySurahProvider return empty in Student View |
| `quran_mobile/lib/presentation/screens/settings/settings_screen.dart` | Modified | Replace toggle with two tappable view options |

## Next Steps

- [ ] Test Student View: verify all sections empty (stats, surahs, mistakes, classes)
- [ ] Test switching back to Teacher View: verify data reappears
