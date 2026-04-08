# Session Log: Role Refactor — Unified Listener/Reciter Model (v2.0.0)

**Date:** 2026-04-06
**Session:** 001
**Version:** v2.0.0

## Objective

Major architectural refactor to remove the hard teacher/student role distinction. Replace with a unified model where anyone can be a Listener (evaluator) or Reciter (reader). "Classes" become "Sessions". Ownership-based permissions replace role-based. No data deletion from Supabase — all migrations are additive.

## Summary

Completed all 5 phases of the v2.0.0 role refactor across Supabase, backend, web frontend, and Flutter mobile. Removed teacher/student role selection at signup, unified navigation (no role banner/switcher), renamed Classes to Sessions, implemented ownership-based permissions (listener_id / teacher_id dual-write), and updated all sync logic to be role-agnostic.

## Work Completed

### Phase 1: Supabase Migration
- Created `docs/supabase_migration_v2.sql` — 11-step SQL migration
- Adds `listener_id` column to classes, backfills from `teacher_id`
- Updates `handle_new_user()` trigger for role-free signup
- Creates `is_class_teacher()` SECURITY DEFINER function checking both columns
- Updates 16 RLS policies to use the new function

### Phase 2: Backend (FastAPI)
- `auth/models.py` — Removed `role` from SignupRequest
- `auth/utils.py` — `is_verified` hardcoded to True
- `auth/dependencies.py` — `get_current_verified_user` is passthrough
- `auth/routes.py` — `contacts_router` replaces `students_router`/`teachers_router`
- `main.py` — SQLite listener_id migration, `view` param, `/api/sessions/` aliases, ownership checks
- `sync_service.py` — Dual-write listener_id, role-agnostic sync

### Phase 3: Web Frontend (React/TypeScript)
- `Signup.tsx` — Removed role picker, always cyan gradient
- `App.tsx` — Routes use `/sessions`, legacy redirects for `/teacher/*` and `/student/*`
- `Layout.tsx` — Unified tabs (Dashboard, Sessions, Reader), no role switcher
- `Dashboard.tsx` — Full unified dashboard with contacts, listening/reciting sessions
- `Classroom.tsx` — Ownership-based `isListener` check instead of role
- `Settings.tsx` — Removed role badge
- `supabase-api.ts` — `view: 'listener' | 'reciter'`, dual-write, `.or()` queries
- `api.ts` — New contact exports, legacy aliases
- `local-api.ts` — `view` param replaces `role`
- Report components — "Classes" to "Sessions", "Listener Notes"
- `types/index.ts` — ContactListItem, ContactLookup types

### Phase 4: Flutter Mobile
- `app_user.dart` — Role defaults to teacher, isVerified always true
- `auth_service.dart` — Optional role in signUp
- `auth_provider.dart` — isTeacher/isStudent always true
- `providers.dart` — viewModeProvider defaults teacher, removed dead viewMode checks
- `database_helper.dart` — Version 5 migration: ALTER TABLE + backfill listener_id
- `class_repository.dart` — Dual-write listener_id, OR queries for both columns
- `supabase_sync_helper.dart` — Role-agnostic sync, always push+pull everything, dual-write
- `signup_screen.dart` — Removed role picker UI
- `main.dart` — Unified nav (Sessions), removed role banner, role-agnostic sync calls
- `settings_screen.dart` — Removed view switcher, show fullName instead of role badge
- `dashboard_screen.dart` — Unified dashboard, "Contacts" + "Sessions" labels
- `classes_screen.dart` — Always shows listener view, "Sessions" labels
- `quran_reader_screen.dart` — Always show mistakes (no role gating)

### Phase 5: Version Bump
- Bumped 6 files to v2.0.0
- Updated CLAUDE.md version history

## Issues Encountered

- None — all changes were additive, no build errors encountered

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `docs/supabase_migration_v2.sql` | Created | 11-step Supabase SQL migration |
| `quran_backend/auth/models.py` | Modified | Remove role from SignupRequest |
| `quran_backend/auth/utils.py` | Modified | Hardcode is_verified to True |
| `quran_backend/auth/dependencies.py` | Modified | Passthrough verification |
| `quran_backend/auth/routes.py` | Modified | contacts_router replaces student/teacher routers |
| `quran_backend/main.py` | Modified | listener_id migration, view param, session aliases |
| `quran_backend/sync_service.py` | Modified | Dual-write listener_id, role-agnostic |
| `quran_frontend/src/App.tsx` | Modified | /sessions routes, legacy redirects |
| `quran_frontend/src/api.ts` | Modified | Contact exports, legacy aliases |
| `quran_frontend/src/components/Layout.tsx` | Modified | Unified tabs, no role switcher |
| `quran_frontend/src/components/teacher-classes/ExportModal.tsx` | Modified | Sessions/Listener labels |
| `quran_frontend/src/components/teacher-classes/ReportPanel.tsx` | Modified | Sessions label |
| `quran_frontend/src/components/teacher-classes/ReportSummaryStrip.tsx` | Modified | Sessions label |
| `quran_frontend/src/contexts/AuthContext.tsx` | Modified | Role-free auth |
| `quran_frontend/src/lib/local-api.ts` | Modified | view param replaces role |
| `quran_frontend/src/lib/supabase-api.ts` | Modified | listener/reciter view, dual-write |
| `quran_frontend/src/pages/Classroom.tsx` | Modified | Ownership-based isListener |
| `quran_frontend/src/pages/Dashboard.tsx` | Modified | Unified dashboard |
| `quran_frontend/src/pages/Settings.tsx` | Modified | Remove role badge, version bump |
| `quran_frontend/src/pages/Signup.tsx` | Modified | Remove role picker |
| `quran_frontend/src/pages/TeacherClasses.tsx` | Modified | /sessions navigation |
| `quran_frontend/src/types/index.ts` | Modified | Contact types |
| `quran_mobile/lib/core/auth/auth_service.dart` | Modified | Optional role |
| `quran_mobile/lib/core/database/database_helper.dart` | Modified | Version 5 migration |
| `quran_mobile/lib/core/sync/supabase_sync_helper.dart` | Modified | Role-agnostic sync |
| `quran_mobile/lib/data/models/app_user.dart` | Modified | Role defaults |
| `quran_mobile/lib/data/repositories/class_repository.dart` | Modified | Dual-write, OR queries |
| `quran_mobile/lib/main.dart` | Modified | Unified nav, no banner |
| `quran_mobile/lib/presentation/providers/auth_provider.dart` | Modified | Always true |
| `quran_mobile/lib/presentation/providers/providers.dart` | Modified | Remove dead viewMode checks |
| `quran_mobile/lib/presentation/screens/auth/signup_screen.dart` | Modified | Remove role picker |
| `quran_mobile/lib/presentation/screens/classes/classes_screen.dart` | Modified | Unified, Sessions labels |
| `quran_mobile/lib/presentation/screens/dashboard/dashboard_screen.dart` | Modified | Unified dashboard |
| `quran_mobile/lib/presentation/screens/reader/quran_reader_screen.dart` | Modified | Always show mistakes |
| `quran_mobile/lib/presentation/screens/settings/settings_screen.dart` | Modified | Remove view switcher |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | Version 2.0.0 |
| `quran_frontend/package.json` | Modified | Version 2.0.0 |
| `quran_mobile/pubspec.yaml` | Modified | Version 2.0.0 |
| `website/index.html` | Modified | Version 2.0.0 download URLs |
| `CLAUDE.md` | Modified | Version history table |

### Phase 6: Supabase Migration Executed
- Ran `docs/supabase_migration_v2.sql` in Supabase SQL Editor via Playwright browser automation (personal Chrome profile)
- All 11 steps executed successfully: "Success. No rows returned"
- Verification query confirmed 17 RLS policies in place with correct new names
- New policies: "Listeners can manage own sessions", "Participants can view their sessions", "Session owners can manage assignments", "Contacts can manage reciter mistakes", "Users can view their contacts profiles", etc.

## Next Steps

- [x] Run `docs/supabase_migration_v2.sql` in Supabase SQL Editor
- [ ] Test signup flow (no role selection)
- [ ] Test session creation and ownership-based permissions
- [ ] Test sync between Tauri and Flutter
- [ ] Tag v2.0.0 and push to trigger release build

## Notes

- **Supabase table names are unchanged** (classes, teacher_students) — renaming breaks RLS, FK, triggers
- **Dual-write pattern**: Both `teacher_id` and `listener_id` are written for backward compatibility
- **Ownership check**: `listener_id === user.id || teacher_id === user.id` instead of `user.role === 'teacher'`
- **No data deletion**: All Supabase migrations are additive (ALTER TABLE ADD COLUMN, not DROP)
- **Legacy aliases**: All renamed functions/types have backward-compatible aliases
- **viewModeProvider** kept in Flutter but always defaults to teacher — screens no longer reference it
