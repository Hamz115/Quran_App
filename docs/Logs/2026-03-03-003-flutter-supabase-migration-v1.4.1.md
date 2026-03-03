# Session Log: Flutter Supabase Migration — Remove kIsWeb Branching

**Date:** 2026-03-03
**Session:** 003

## Objective

Remove all `kIsWeb` branches for data operations in the Flutter mobile app, making it always use Supabase directly. This fixes the critical bug where data created on mobile is stored only in local SQLite (syncing to a dead FastAPI backend) and is lost on reinstall / invisible to the web app.

## Summary

Migrated 4 Flutter files to always use Supabase for data operations (classes, mistakes, assignments). Added `supabaseId` field to Assignment model. Kept `kIsWeb` only for Quran text data (bundled SQLite on mobile vs static data on web).

## Work Completed

### 1. Add `supabaseId` to Assignment model
- Added `final String? supabaseId` field
- Updated constructor, `copyWith`, `props`, `fromMap`
- Files: `quran_mobile/lib/data/models/assignment.dart`

### 2. Migrate providers.dart — Remove kIsWeb branching
- Removed `kIsWeb` from all 20 data providers, keeping only Supabase path
- Kept `kIsWeb` for `surahListProvider` and `surahWithAyahsProvider` (Quran text)
- Renamed `_webStudentId` → `_studentId`, `setWebStudentId()` → `setStudentId()`
- Removed `ClassRepository` and `MistakeRepository` params from notifiers
- Stored `supabaseId` on Assignment objects during `loadClasses()`
- Files: `quran_mobile/lib/presentation/providers/providers.dart`

### 3. Migrate classroom_screen.dart — 5 kIsWeb branches
- Always watch `teacherStudentsProvider` for student selector
- Remove `kIsWeb &&` guard from student auto-select
- Always show student selector for teachers in settings sheet
- Use `m.supabaseId` for mistake ID matching instead of conditional
- Use `assignment.supabaseId` for edit/delete operations
- Renamed `setWebStudentId` → `setStudentId` at 2 call sites
- Removed `kIsWeb` import
- Files: `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart`

### 4. Migrate create_class_screen.dart — 1 kIsWeb branch
- Navigation: always use `newClass.supabaseId ?? newClass.id.toString()`
- Removed `kIsWeb` import
- Files: `quran_mobile/lib/presentation/screens/classes/create_class_screen.dart`

## Issues Encountered

- (to be filled as issues arise)

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_mobile/lib/data/models/assignment.dart` | Modified | Added `supabaseId` field |
| `quran_mobile/lib/presentation/providers/providers.dart` | Modified | Removed kIsWeb branching, Supabase-only data ops |
| `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` | Modified | Removed 5 kIsWeb branches |
| `quran_mobile/lib/presentation/screens/classes/create_class_screen.dart` | Modified | Removed 1 kIsWeb branch |
| `docs/Logs/2026-03-03-003-flutter-supabase-migration-v1.4.1.md` | Created | Session log |

## Next Steps

- [ ] Run `flutter analyze` to verify 0 errors
- [ ] Test on Android device as teacher
- [ ] Verify class creation persists across app restart
- [ ] Version bump and release

## Notes

- Continuation of investigation from `2026-03-03-002-flutter-supabase-persistence-investigation.md`
- Only Quran text data keeps `kIsWeb` branching (bundled SQLite on mobile vs static on web)
- Infrastructure providers (`connectivityStreamProvider`, `syncStateProvider`) left as-is
