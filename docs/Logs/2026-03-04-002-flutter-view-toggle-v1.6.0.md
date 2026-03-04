# Session Log: Flutter Teacher/Student View Toggle

**Date:** 2026-03-04
**Session:** 002

## Objective

Add a Teacher/Student View toggle to the Flutter app, mirroring the web app's navbar dropdown. Teachers can switch between Teacher View and Student View to see their own progress, classes they're enrolled in as students, and their own mistakes highlighted in the Quran Reader.

## Summary

Added `viewModeProvider` to providers.dart, made the role banner tappable for teachers (with swap icon), and updated Dashboard, Classes, and Quran Reader screens to use `viewModeProvider` instead of auth role for UI decisions.

## Work Completed

### 1. Add viewModeProvider
- Added `viewModeProvider` StateProvider to `providers.dart`
- Defaults to user's actual auth role, toggleable by teachers

### 2. Tappable Role Banner in main.dart
- Wrapped banner in GestureDetector (only for teachers)
- Added swap icon indicator
- Resets `_currentIndex` to 0 and `mistakesProvider._studentId` to null on switch
- Uses `viewModeProvider` for all UI decisions (nav items, screens, banner)

### 3. Update Dashboard Screen
- Changed `isTeacher` to use `viewModeProvider` instead of `authProvider`

### 4. Update Classes Screen
- Changed `isTeacher` to use `viewModeProvider` instead of `authProvider`

### 5. Update Quran Reader Screen
- Changed `isTeacher` check (line 67-69) to use `viewModeProvider`
- Teachers in Student View now see their own mistakes on Quran pages

## Issues Encountered

- None

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_mobile/lib/presentation/providers/providers.dart` | Modified | Added `viewModeProvider` StateProvider |
| `quran_mobile/lib/main.dart` | Modified | Tappable banner + viewModeProvider usage + reset logic |
| `quran_mobile/lib/presentation/screens/dashboard/dashboard_screen.dart` | Modified | Use viewModeProvider for isTeacher |
| `quran_mobile/lib/presentation/screens/classes/classes_screen.dart` | Modified | Use viewModeProvider for isTeacher |
| `quran_mobile/lib/presentation/screens/reader/quran_reader_screen.dart` | Modified | Use viewModeProvider for isTeacher check |
| `docs/Logs/2026-03-04-002-flutter-view-toggle-v1.6.0.md` | Created | Session log |

## Next Steps

- [ ] Test on device: login as teacher, toggle views, verify Quran Reader shows mistakes in Student View
- [ ] Verify student login is unaffected (no swap icon, static banner)

## Notes

- Auth system unchanged — only UI view mode is toggled
- Providers that need the real role (e.g., `teacherStudentsProvider`, `supabaseSyncHelper`) still use `authProvider`
- When switching to Student View, `mistakesProvider._studentId` is reset to null so it loads the teacher's own mistakes
