# Listener/Reciter UI Terminology Polish

**Date:** 2026-07-25 AST  
**Scope:** React/Tauri and Flutter user-facing terminology after the live v3 schema rollout

## Goal

Complete the visible terminology transition from the legacy teacher/student/class language to listener/reciter/session language without renaming compatibility fields, routes, database columns, or internal model identifiers that still support staged clients.

## Changes

### React/Tauri

- Renamed visible dashboard, contact, session, classroom, Quran reader, report, export, settings, empty-state, confirmation, and error copy.
- Standardized the main terms as:
  - teacher → listener
  - student → reciter or contact, depending on context
  - class → session
  - Student ID → User Code
  - Teacher Notes → Listener Notes
- Updated HTML-print, CSV, and Word report headings and metadata to use reciter/listener language.
- Left compatibility identifiers such as `teacher_id`, `student_id`, legacy route redirects, table/view names, type names, and existing API function names intact.

### Flutter

- Updated dashboard, session creation/listing, classroom and Quran-reader controls, report tabs/cards, notes, empty states, errors, and action labels.
- Standardized visible class wording to session wording while preserving internal `ClassSession`, provider, and SQLite compatibility names.

### Regression Coverage

- Extended `quran_backend/tests/test_listener_reciter_schema_sql.py` with a focused active-UI copy test.
- The test rejects a set of legacy phrases in the active React and Flutter session/report workflows while permitting required internal compatibility identifiers.

## Validation

- React production build: **passed** (`npm run build`).
- Backend/schema/copy regression tests: **6/6 passed**.
- `git diff --check`: **passed**; only repository line-ending conversion notices were emitted.
- Complete Flutter test suite on the Windows laptop: **all tests passed**.
- Targeted Flutter analysis of ten modified files completed with **no compile errors**. It still reports the repository's existing deprecation/unused-code warnings and exits non-zero because warnings are enabled.
- BrowserOps visual/runtime review completed against the real local Vite app using task:
  - `20260725-224634-qurantrack-listener-reciter-ui-polish`
  - Dashboard evidence: `screenshots/002-initial-polished-dashboard.png`
  - Session/report evidence: `screenshots/005-polished-session-modal.png`
- Browser review confirmed visible labels including `Add Contact`, `New Session`, `Listening`, `Reciting`, `Select Reciters`, `Reciter since`, and `Sessions`.
- A final source scan and regression test also covered the legacy single-user sessions page and Quran-reader session grouping fallback.

## Safety and Compatibility

- No Supabase migration was applied.
- No production data was modified.
- Quran/QPC databases, fonts, glyphs, words, and page data were untouched.
- No release artifacts were rebuilt during this copy-only pass.
