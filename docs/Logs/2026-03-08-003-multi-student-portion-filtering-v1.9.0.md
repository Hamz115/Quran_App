# Session Log: Multi-Student Portion Filtering — Fix Data Flow

**Date:** 2026-03-08
**Session:** 003

## Objective

Fix per-student portion filtering that wasn't working despite session 002's changes. The pill UI was showing but all students' portions were displayed regardless of selection. Root cause: `mapClassData()` in supabase-api.ts was stripping `student_id` from assignments after fetching, and Flutter's local SQLite had no `student_id` column on the assignments table.

## Summary

Found and fixed the real blocking bugs: (1) `mapClassData()` discarded `student_id` from fetched assignments so the Classroom filter always saw null, (2) Flutter SQLite schema lacked `student_id` column on assignments, (3) Flutter sync/repository code didn't pass `student_id` when saving assignments locally or pushing to Supabase.

## Work Completed

### 1. Fix mapClassData() — include student_id (WEB ROOT CAUSE)
- `supabase-api.ts` line 360-367: Added `student_id: a.student_id || null` to assignment mapping
- This was the actual blocker — `getClass()` fetches `assignments(*)` which includes `student_id`, but `mapClassData()` was dropping it before the data reached Classroom.tsx

### 2. Flutter SQLite migration — add student_id column
- Bumped DB version from 3 → 4
- Added migration: `ALTER TABLE assignments ADD COLUMN student_id TEXT`
- Added `student_id TEXT` to CREATE TABLE for fresh installs

### 3. Flutter class_repository — pass student_id
- `createClassFromServer()`: Added `student_id` to assignment insert
- `upsertFromSupabase()`: Added `student_id` to assignment insert

### 4. Flutter sync helper — push student_id
- `supabase_sync_helper.dart`: Added `student_id` to assignment push payload

### 5. Flutter classFromStringIdProvider — map student_id
- `providers.dart` line 736-744: Added `studentId: a['student_id']` to Assignment mapping

## Issues Encountered

- **mapClassData() stripping student_id**: The `getClass()` query uses `assignments(*)` which fetches ALL columns including `student_id`, but the mapping function only extracted 6 fields, omitting `student_id`. This caused the Classroom filter `if (!a.student_id) return true` to always pass, showing all assignments as "class-wide."
- **Flutter SQLite missing column**: The assignments table had no `student_id` column, so even if Supabase data was correct, syncing to local DB would lose the field.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/src/lib/supabase-api.ts` | Modified | Add `student_id` to `mapClassData()` assignment mapping |
| `quran_mobile/lib/core/database/database_helper.dart` | Modified | Bump DB v3→v4, add `student_id` column to assignments |
| `quran_mobile/lib/data/repositories/class_repository.dart` | Modified | Pass `student_id` in createClassFromServer and upsertFromSupabase |
| `quran_mobile/lib/core/sync/supabase_sync_helper.dart` | Modified | Include `student_id` when pushing assignments to Supabase |
| `quran_mobile/lib/presentation/providers/providers.dart` | Modified | Map `studentId` in classFromStringIdProvider |

## Next Steps

- [ ] Rebuild and test: create a new class with 3 students, verify per-student filtering
- [ ] Verify existing classes (created before fix) — these will still show all portions since Supabase data has null student_id

## Notes

- Continuation of session 002. Same version v1.9.0.
- The class in the user's screenshot was created before the `createClass` fix, so all assignments in Supabase have `student_id = null`. New classes created after this fix will work correctly.
- The user should delete and recreate the test class to verify the full flow.
