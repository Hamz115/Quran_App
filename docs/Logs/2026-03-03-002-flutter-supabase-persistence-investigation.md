# Session Log: Flutter Supabase Persistence Investigation

**Date:** 2026-03-03
**Session:** 002

## Objective

Investigate why data created in the Flutter app (classes, students) disappears after restarting the app. Thoroughly trace the data flow from Supabase initialization, auth, class creation, student addition, and data loading to identify persistence issues.

## Summary

The root cause is a **dual-path architecture bug**: the Flutter mobile app uses `kIsWeb` checks throughout to decide between Supabase (web) and local SQLite (mobile). On Android/iOS, `kIsWeb` is always `false`, so the app stores classes/mistakes in a local SQLite database and NEVER reads from or writes to Supabase. However, `teacherStudentsProvider` and `addStudentByEmail` always use Supabase (no `kIsWeb` check), creating an inconsistency where students are in Supabase but classes are local-only.

## Work Completed

### Full investigation of 8 areas (see detailed findings below)

## Issues Encountered

- **Critical**: Class creation on mobile writes to local SQLite, not Supabase
- **Critical**: Class loading on mobile reads from local SQLite, not Supabase
- **Critical**: Teacher students are fetched from Supabase but classes are local - architectural mismatch

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| N/A | N/A | Research-only session |

## Next Steps

- [ ] Decide architectural direction: all-Supabase or local-with-sync
- [ ] Fix class creation to write to Supabase on mobile
- [ ] Fix class loading to read from Supabase on mobile

## Notes

This is a research-only session - no files were edited. See full findings in the investigation report.
