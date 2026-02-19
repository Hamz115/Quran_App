# Session Log: Mobile Mistake Display Fixes

**Date:** 2026-02-19
**Session:** 005

## Objective

Fix multiple bugs preventing mistake badges and character-level mistake rendering from working correctly in the Flutter app, with priority on the mobile/phone experience.

## Summary

Fixed 4 critical bugs in the Flutter mistake system: (1) stale `classMistakeIdsProvider` not refreshing after adding mistakes, (2) `loadMistakes()` web path destroying character-level data via broken grouping and missing `charIndex`, (3) `addMistake()` failing to create `mistake_occurrences` rows because UUID classIds couldn't be parsed as integers, (4) web create-class sections defaulting to disabled for sabqi/revision.

## Work Completed

### Fix 1: Stale classMistakeIdsProvider
- **Problem:** `classMistakeIdsProvider` was a `FutureProvider.family` that cached its result. After `addMistake()` inserted a new `mistake_occurrences` row, nobody invalidated the provider. On pages with no prior mistakes, the stale empty set caused `SizedBox.shrink()` — nothing displayed.
- **Fix:** Added `ref.watch(mistakesProvider)` dependency inside `classMistakeIdsProvider` so it auto-refreshes when global mistakes list changes.
- **File:** `providers.dart:87`

### Fix 2: Character-level mistakes not rendering (web/Supabase path)
- **Problem:** `loadMistakes()` web path had two bugs:
  1. Grouped all mistakes by `surah-ayah-word` key (without `char_index`), collapsing distinct character-level mistakes into one entry
  2. Never read `char_index` from the Supabase response, so `isCharacterLevel` was always false
- **Fix:** Removed broken grouping — each Supabase row is a distinct mistake. Now reads `char_index` and `error_count` directly from the row.
- **File:** `providers.dart:573-586`

### Fix 3: mistake_occurrences never created for Supabase classes
- **Problem:** `addMistake()` accepted `int? classId` and the caller did `int.tryParse(widget.classId)`. But classIds from Supabase are UUIDs (not integers), so `int.tryParse("uuid-string")` returned null. With null classId, the `if (classId != null)` guard skipped creating the `mistake_occurrences` row entirely. Consequence: "Mistakes in this class" section was always empty.
- **Fix:** Added `String? classIdString` parameter to `addMistake()`. On the web/Supabase path, uses `classIdString` directly (the UUID) to insert into `mistake_occurrences`, bypassing the broken int-based class lookup. Also fixed both return statements to include `charIndex`.
- **Files:** `providers.dart:598-689`, `classroom_screen.dart:852-873`

### Fix 4: Web create-class sections defaulting to disabled
- **Problem:** In `TeacherClasses.tsx`, sabqi and revision `PortionConfig` defaulted to `enabled: false` in 4 places (useState, resetForm, initPerStudentConfigs, getActiveStudentConfig fallback).
- **Fix:** Changed all 4 places to `enabled: true`.
- **File:** `quran_frontend/src/pages/TeacherClasses.tsx`

## Issues Encountered

- The UUID vs integer classId mismatch was a systemic architectural issue — Supabase returns UUID strings but the Flutter mistake system assumed integer IDs everywhere. Required adding a new `classIdString` parameter rather than changing the existing `classId` (which is still needed for the local SQLite path on native mobile).

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_mobile/lib/presentation/providers/providers.dart` | Modified | Added `ref.watch(mistakesProvider)` to `classMistakeIdsProvider`; removed broken grouping in `loadMistakes()` web path; added `classIdString` param to `addMistake()`; fixed UUID-based `mistake_occurrences` insert; added missing `charIndex` to returned Mistake objects |
| `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` | Modified | Pass `classIdString: widget.classId` to both `addMistake()` calls |
| `quran_frontend/src/pages/TeacherClasses.tsx` | Modified | Default all 3 section toggles to enabled |

## Next Steps

- [ ] Test mistake flow end-to-end on phone: add mistake → verify badge appears immediately
- [ ] Test character-level mistake: select letter/haraka → verify Amiri rendering with glow
- [ ] Test previous class mistakes: open class with prior mistakes → verify they show
- [ ] Test on native Android (SQLite path) to verify local int classId still works

## Notes

- Phone/mobile experience is the priority — most users will use the app on their phone
- The web path (`kIsWeb == true`) uses Supabase UUIDs for all IDs; native mobile uses local SQLite integers
- `classMistakeIdsProvider` now auto-refreshes on both add AND remove operations
- The `classIdString` parameter is used on the web path; `classId` (int) is used on the local SQLite path
