# Session Log: Classroom Mistakes Grouping + Page Toggle

**Date:** 2026-03-03
**Session:** 005

## Objective

Port the web's grouped previous class mistakes display to Flutter, and add a page-level filter toggle for current class mistakes.

## Summary

Changed the Flutter classroom mistakes panel to group previous class mistakes by class (with date headers) instead of one flat list. Added an "All / Page" toggle that filters both current AND previous class mistakes to only those on the currently viewed Quran page.

## Work Completed

### Group Previous Class Mistakes by Class
- Modified `previousClassMistakesProvider` to return `List<PreviousClassMistakeGroup>` instead of flat `List<PreviousMistakeInfo>`
- Each group has a class date, day, and its own list of deduplicated mistakes
- Groups sorted by date descending (most recent first)
- UI renders each group with a left amber border and header like "SATURDAY — 01/03"
- Removed confusing count from group headers (only error counts in badges remain)
- Removed individual date badges from each mistake (now shown in group header)

### Add "All / Page" Toggle for All Mistakes
- Added `_showPageOnly` state variable to `_ClassroomScreenState`
- Added `_buildToggleChip` widget for the toggle pills
- "All" (default): shows all mistakes across all pages
- "Page": filters both current class AND previous class mistakes to only those on the currently viewed Quran page using `getPageNumber()`
- Empty state text changes based on toggle: "No mistakes in this class" vs "No mistakes on this page"

### New Data Model
- Added `PreviousClassMistakeGroup` class in providers.dart with `classDate`, `classDay`, `mistakes` fields

## Issues Encountered

- Page/All toggle initially only filtered current class mistakes, not previous — fixed to filter both
- Group header showed "(15)" count which was confused with per-badge error counts — removed from header

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_mobile/lib/presentation/providers/providers.dart` | Modified | Added `PreviousClassMistakeGroup` model, rewrote `previousClassMistakesProvider` to return grouped data |
| `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` | Modified | Added `_showPageOnly` state, `_buildToggleChip`, rewrote `_buildMistakesSummary` with grouped display + page toggle |

## Next Steps

- [ ] Test grouped mistakes display on phone
- [ ] Verify page toggle filters correctly

## Notes

- Mirrors the web Classroom.tsx behavior where previous mistakes are grouped by class date with section headers
- `getPageNumber()` from `quran_data.dart` used for page-level filtering
