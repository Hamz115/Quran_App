# Session Log: Flutter Teacher/Student View Toggle

**Date:** 2026-03-04
**Session:** 002

## Objective

Add a Teacher/Student View toggle to the Flutter app, mirroring the web app's navbar dropdown. Teachers can switch between Teacher View and Student View to see their own progress, classes they're enrolled in as students, and their own mistakes highlighted in the Quran Reader.

## Summary

Added `viewModeProvider` to providers.dart with a clear toggle in Settings (teachers only). Created `enrolledClassesProvider` to fetch classes where the teacher is enrolled as a student. Fixed Dashboard to show correct data in Student View. Banner is a visual indicator only.

## Work Completed

### 1. Add viewModeProvider
- Added `viewModeProvider` StateProvider to `providers.dart`
- Defaults to user's actual auth role, toggleable by teachers

### 2. View Mode Toggle in Settings
- Added "VIEW MODE" section in Settings (only visible to teachers)
- Clear toggle switch with descriptive text
- Resets `mistakesProvider._studentId` to null on switch

### 3. enrolledClassesProvider (data fix)
- New provider fetches classes from Supabase `class_students` table where `student_id = user.id`
- Returns `ClassSession` objects with assignments, sorted by date descending
- Dashboard uses this in Student View instead of `classesProvider` (which shows teacher-created classes)

### 4. Dashboard Data Fix
- Student View now uses `enrolledClassesProvider` for Recent Classes and class count
- Stats show enrolled class count, not teacher-created class count
- Pull-to-refresh also invalidates `enrolledClassesProvider`

### 5. Banner Cleanup
- Removed GestureDetector and swap icon from banner
- Banner is now a visual indicator only (shows current mode)

### 6. Screen Updates
- Dashboard, Classes, Quran Reader all use `viewModeProvider` for role decisions
- Quran Reader shows teacher's own mistakes in Student View

## Issues Encountered

- Initial implementation had tappable banner — too subtle for non-technical users, moved to Settings
- Student View was showing teacher's teaching data — fixed by creating `enrolledClassesProvider`

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_mobile/lib/presentation/providers/providers.dart` | Modified | Added `viewModeProvider` + `enrolledClassesProvider` |
| `quran_mobile/lib/main.dart` | Modified | viewModeProvider for nav + banner as visual indicator |
| `quran_mobile/lib/presentation/screens/settings/settings_screen.dart` | Modified | Added VIEW MODE toggle section |
| `quran_mobile/lib/presentation/screens/dashboard/dashboard_screen.dart` | Modified | Use enrolledClassesProvider in Student View |
| `quran_mobile/lib/presentation/screens/classes/classes_screen.dart` | Modified | Use viewModeProvider for isTeacher |
| `quran_mobile/lib/presentation/screens/reader/quran_reader_screen.dart` | Modified | Use viewModeProvider for isTeacher check |
| Version files (6 total) | Modified | Bumped to v1.6.0 |
| `docs/Logs/2026-03-04-002-flutter-view-toggle-v1.6.0.md` | Created | Session log |

## Next Steps

- [ ] Test on device: login as teacher, toggle in Settings, verify Student View shows own data
- [ ] Verify student login is unaffected (no toggle in Settings)

## Notes

- Auth system unchanged — only UI view mode is toggled
- Providers that need the real role (e.g., `teacherStudentsProvider`, `supabaseSyncHelper`) still use `authProvider`
- `enrolledClassesProvider` fetches from Supabase (cross-device), not local SQLite
- When switching to Student View, `mistakesProvider._studentId` is reset to null so it loads the teacher's own mistakes
