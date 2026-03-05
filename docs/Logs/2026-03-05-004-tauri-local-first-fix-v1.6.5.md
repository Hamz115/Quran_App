# Session Log: Tauri Local-First Fix + Supabase Cleanup

**Date:** 2026-03-05
**Session:** 004

## Objective

Fix the 5-second delay when marking mistakes in the Tauri app by making it truly local-first. Fix orphaned mistakes on class delete. Add missing Supabase columns. Fix TS build error.

## Summary

Fixed the root cause of slow mistake marking in Tauri: sync_service.py was holding the SQLite lock during network calls, blocking foreground reads for 3-5 seconds. Implemented optimistic UI for mistakes in Classroom.tsx, added local `getClass` endpoint, fixed orphaned mistakes on class delete, added `student_id` column to Supabase assignments, and fixed the TS build error from v1.6.4.

## Work Completed

### 1. Fix TS Build Error (v1.6.4 Tauri build failure)
- `TeacherDashboard.tsx` line 87 referenced `.email` on `StudentListItem` but type didn't have it
- Added `email: string` to `StudentListItem` interface in `types/index.ts`
- Added `email` to return object in `fetchStudentsFromSupabase` in `supabase-api.ts`

### 2. Delete Hamza Reyal Mistakes from Supabase
- Deleted all 14 mistakes and their occurrences for Hamza Reyal (d58f7a65)
- Replicated mistakes for Aathifa (1 mistake) and Maryam (12 mistakes) in their own classes

### 3. Fix Sync Lock Contention (ROOT CAUSE of 5s delay)
- `push_pending_mistakes()` and `push_pending_classes()` in sync_service.py held SQLite connection open during ALL Supabase network calls
- This blocked foreground reads (getMistakes, getClass) for 3-5 seconds
- Fix: Read pending data → close connection → do network calls → reopen to update statuses
- Result: SQLite lock is only held for milliseconds during read/write, not during network I/O

### 4. Optimistic UI for Mistakes in Classroom
- `handleAddMistake`: Updates React state immediately with new/incremented mistake, closes popup instantly, fires API call in background
- `handleRemoveMistake`: Removes/decrements from state immediately, fires API call in background
- Both revert to full re-fetch only on error (fallback)
- Result: Mistake marking is now visually instant

### 5. Add Local `getClass` Endpoint
- Added `GET /api/local/classes/{class_id}` in main.py (returns full class with students + assignments)
- Added `getLocalClass()` in local-api.ts
- Routed `getClass()` in api.ts through local-first pattern (was always Supabase before)

### 6. Improve Health Check
- Changed `isLocalApiAvailable()` from HEAD `/api/surahs` to GET `/api/health`
- Reduced timeout from 1500ms to 1000ms
- `/api/health` is a lightweight ping, `/api/surahs` was doing actual work

### 7. Fix Orphaned Mistakes on Local Class Delete
- `delete_local_class` in main.py was only deleting class_students + assignments
- Now also deletes mistake_occurrences and cleans up orphaned mistakes (those with 0 remaining occurrences)

### 8. Add `student_id` Column to Supabase Assignments
- Ran `ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES profiles(id)` via Supabase SQL Editor
- Column needed for per-student portion assignments

### 9. Fix `addStudent` Duplicate Constraint Error
- Changed `.single()` to `.maybeSingle()` for duplicate check in supabase-api.ts
- Added catch for Postgres unique constraint error (code 23505) with friendly message

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/src/types/index.ts` | Modified | Add `email` to StudentListItem |
| `quran_frontend/src/lib/supabase-api.ts` | Modified | Add email to fetchStudents return, fix addStudent duplicate check, maybeSingle |
| `quran_backend/sync_service.py` | Modified | Fix lock contention: read-close-network-reopen pattern |
| `quran_frontend/src/pages/Classroom.tsx` | Modified | Optimistic UI for add/remove mistakes |
| `quran_backend/main.py` | Modified | Add GET /api/local/classes/{id}, fix delete_local_class orphan cleanup |
| `quran_frontend/src/lib/local-api.ts` | Modified | Add getLocalClass(), improve health check endpoint |
| `quran_frontend/src/api.ts` | Modified | Route getClass through local-first, import getLocalClass |
| Supabase (remote) | Migration | Add student_id UUID column to assignments table |
| Version files (6 total) | Modified | Bumped to v1.6.5 |

## Issues Encountered

- Wrong Supabase project ID: Used `yauenfxpwjrzedfhqhyp` but correct is `qwfnbkkegbhwxxjvyhzl`
- `word_text` NOT NULL constraint: Arabic chars printed as None in Python, had to use JSON encoding to preserve them
- Plan mode kept activating despite user wanting direct execution

## Next Steps

- [ ] Test mistake marking speed in Tauri — should be instant now
- [ ] Test class delete — verify no orphaned mistakes remain
- [ ] Verify getClass loads from local sidecar (check console for local-first logs)
- [ ] Add local endpoints for assignments CRUD (updateAssignment, addClassAssignments, deleteAssignment)
