# Session Log: Class Creation & Sync Fixes

**Date:** 2026-04-08
**Session:** 001
**Version:** v2.0.1

## Objective

Fix class creation failing from Tauri app, fix Supabase sync (class_students, mistake_occurrences never synced), fix Flutter v2.0.0 role refactor issues.

## Summary

Fixed class creation flow end-to-end: Promise.allSettled for resilient data loading, backend `view` parameter support, `class_students` and `mistake_occurrences` sync to Supabase, `listener_id` in local API responses, profiles `student_id` column fix. Also fixed 4 Flutter issues: missing `listener_id` in class push, `student_id` column references, dashboard stats queries.

## Work Completed

### Backend Fixes (main.py)
- Added `view` parameter to `get_local_classes` endpoint (frontend sends `?view=listener`)
- Added `listener_id` to both list and single class API responses
- Fixed `user_role == "teacher"` → `resolved == 'listener'` (was causing NameError)
- Fixed `SELECT student_id FROM profiles` → `SELECT name FROM profiles` (column doesn't exist)
- Both list and single-class endpoints fixed

### Backend Fixes (sync_service.py)
- Removed `class_type` from Supabase push (column doesn't exist in Supabase)
- Added `push_class_students()` — syncs class enrollment to Supabase
- Added `push_mistake_occurrences()` — syncs mistake-class links to Supabase
- Both called during `push_pending_classes` and `push_pending_mistakes` flows

### Frontend Fixes (React/TypeScript)
- `Promise.allSettled` in TeacherClasses.tsx `refreshData()` and Dashboard.tsx `loadData()`
- Added `/dashboard` redirect route in App.tsx for tour navigation

### Flutter Fixes
- Added `listener_id` to background class push in providers.dart
- Dashboard stats query: `teacher_id` → `or(teacher_id, listener_id)`
- Class student names query: same `or()` fix
- Fix unpublished classes: same `or()` fix
- Report provider: removed non-existent `student_id` from profiles select
- Report provider: `studentId` fallback uses `profile['id']` instead of `profile['student_id']`

### Browser Testing
- Full end-to-end test with Playwright agent-browser
- Login → Create session → Mark 3 mistakes → Verify in Listening tab → Verify in Reciting tab
- All working correctly, sync confirmed in Supabase

## Issues Encountered

- **Port 8000 in use**: Tauri sidecar was running, had to kill it to run backend separately
- **Missing Python packages**: venv mismatch (shell used wrong Python), installed via system Python
- **profiles.student_id**: Column doesn't exist, was causing 500 errors in both list and single class endpoints
- **class_students never synced**: Function didn't exist in sync_service.py
- **mistake_occurrences never synced**: Function didn't exist, causing empty mistake counts in reports

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_backend/main.py` | Modified | Added `view` param, `listener_id` in responses, fixed profiles query, fixed user_role check |
| `quran_backend/sync_service.py` | Modified | Added push_class_students(), push_mistake_occurrences(), removed class_type |
| `quran_frontend/src/pages/TeacherClasses.tsx` | Modified | Promise.allSettled for resilient data loading |
| `quran_frontend/src/pages/Dashboard.tsx` | Modified | Promise.allSettled for resilient data loading |
| `quran_frontend/src/App.tsx` | Modified | Added /dashboard redirect route |
| `quran_mobile/lib/presentation/providers/providers.dart` | Modified | listener_id in class push, or() queries for dashboard stats |
| `quran_mobile/lib/presentation/providers/report_provider.dart` | Modified | Removed student_id from profiles select |

## Next Steps

- [ ] Version bump to v2.0.1 and release
- [ ] Test Flutter app on device with new fixes
- [ ] Verify Reciting tab shows newly created session mistakes on Flutter

## Notes

- The ReportPanel always fetches directly from Supabase (not local-first), so all data must be synced to Supabase for reports to work
- The `class_students` and `mistake_occurrences` sync gaps were the root cause of missing data in reports
- Browser testing confirmed full flow works: create session → mark mistakes → see them in reports
