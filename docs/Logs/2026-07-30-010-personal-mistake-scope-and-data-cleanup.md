# Session Log: Personal Mistake Scope and Data Cleanup

**Date:** 2026-07-30  
**Session:** 010  
**Author:** Kyle

## Reported behavior

Hamza's listener-only account showed 30 total mistake occurrences, 4 repeated mistakes, and 6 affected surahs in **Mistakes & Recitation Review**, despite never being enrolled as a reciter. The personal Quran Reader could also display mistakes belonging to Hamza's reciters.

## Root cause

Two distinct issues were confirmed:

1. `QuranReader.tsx` called `getMistakesWithOccurrences(surahNum)` without a reciter ID. Supabase RLS intentionally lets a listener read reciter mistake rows, so the unfiltered personal Reader query returned rows beyond the signed-in account.
2. Hamza's account had 26 historical/unlinked mistake rows totaling 30 occurrences, while `class_reciters` confirmed zero reciter enrollments. These rows were old development/test artifacts and had no `mistake_occurrences` links. They exactly produced the 30 / 4 / 6 overview Hamza reported.

## Fix

- Made `getMistakes()` and `getMistakesWithOccurrences()` default to the authenticated user's ID whenever no explicit reciter is supplied.
- Applied the reciter condition directly to both current-schema and legacy-schema Supabase queries.
- Made `QuranReader.tsx` explicitly pass `user.id` for defense in depth.
- Confirmed `Mistakes.tsx` already explicitly passes `user.id`.
- Added a regression test covering all three scope protections.

## Data correction

After confirming Hamza had zero `class_reciters` enrollments and all 26 rows were unlinked artifacts:

- Deleted 26 Supabase mistake rows attributed to Hamza (30 total occurrences).
- Deleted 20 corresponding synced local SQLite snapshots.
- No genuine reciter history for Reyal, Maryam, Yahya, or any other account was modified.

Post-cleanup verification:

- Hamza remote mistake rows: **0**
- Hamza remote reciter enrollments: **0**
- Hamza local mistake snapshots: **0**

## Validation

- Frontend production build: passed.
- Regression tests: **25/25 passed**.
- Targeted ESLint for `QuranReader.tsx` and `Mistakes.tsx`: passed.
- `supabase-api.ts` retains pre-existing repository-wide `no-explicit-any` lint debt; the production TypeScript build passes and this change introduced no new lint pattern.
