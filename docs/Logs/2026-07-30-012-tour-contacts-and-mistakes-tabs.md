# Session Log: Tour Contacts and Mistakes Tabs

**Date:** 2026-07-30  
**Session:** 012  
**Author:** Kyle

## Request

Extend the guided QuranTrack tutorial because it explained adding contacts and recording mistakes inside a session, but never visited the dedicated **Contacts** or **Mistakes & Recitation Review** tabs.

## Cause

The 32-step tour route model only supported dashboard, session creation, classroom, Quran Reader, Settings, cleanup, and completion. There were no `contacts` or `mistakes` screens in `TourStepDef`, no route mappings for those screens, and no stable tutorial targets on either page.

## Changes

- Added `contacts` and `mistakes` to the tour screen type and route resolver.
- Added two Contacts steps:
  - **Contacts Overview** — active contacts, recorded sessions, and selected-contact mistake count.
  - **Manage Each Reciter** — roster search, contact selection, current portion, session/report actions, and safe removal semantics.
- Added two Mistakes steps:
  - **Mistakes & Recitation Review** — reciter-only occurrence/repetition/surah metrics.
  - **Inspect Your Mistake History** — word details, linked sessions, listener attribution, and exact-word **Open in Quran** behavior.
- Added stable `data-tour` targets that work for both populated and empty accounts.
- Updated the completion message to include contact management and mistake-history review.
- Increased the guided tour from 32 to 36 steps.
- Added a regression test requiring both routes, all four targets, and both pages to remain connected to the tour.

## Validation

- Production frontend build: passed.
- Targeted ESLint: passed without output.
- Regression tests: **27/27 passed**.
- `git diff --check`: passed; only repository line-ending notices were emitted.

## Files

- `quran_frontend/src/lib/tour.ts`
- `quran_frontend/src/contexts/TourContext.tsx`
- `quran_frontend/src/pages/Contacts.tsx`
- `quran_frontend/src/pages/Mistakes.tsx`
- `quran_backend/tests/test_listener_reciter_schema_sql.py`
