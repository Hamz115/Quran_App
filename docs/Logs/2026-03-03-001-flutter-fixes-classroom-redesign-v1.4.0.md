# Session Log: Flutter Fixes + Classroom Redesign

**Date:** 2026-03-03
**Session:** 001

## Objective

Fix broken/missing features in the Flutter app (Add Student, Start New Class, student selector in CreateClassScreen) and redesign the classroom page to use full-screen Quran with a bottom sheet for controls.

## Summary

Implemented student selector + validation in CreateClassScreen, wired Add Student button with email lookup, wired Start New Class button, and redesigned the classroom to be full-screen Quran with solid top bar and settings bottom sheet. Fixed "By Page" portion bug where it expanded to entire surah. Fixed teacher mistakes leaking into Quran reader.

## Work Completed

### Phase 1A: Student Selector in CreateClassScreen
- Added `_selectedStudentId` state variable
- Added student dropdown at top of form using `teacherStudentsProvider`
- Blocked class creation without student selection
- Re-runs prefill when student changes

### Phase 1B: Add Student Button
- Added `addStudentByEmail()` function in providers.dart
- Wired dashboard button to show email input bottom sheet
- Email lookup, duplicate check, relationship insert

### Phase 1C: Start New Class Button
- Wired dashboard button to open CreateClassScreen as modal

### Phase 2: Classroom Redesign
- Full-screen Quran with solid top bar (back, date, section pill, mistake count, gear icon)
- Top bar uses Column layout — Quran starts BELOW it, no overlap
- Bottom page nav overlay (toggle on tap, auto-hide 4s) with RTL arrows, surah name, jump dialog
- All controls (section tabs, portions, performance, notes, legend) in "Classroom Settings" DraggableScrollableSheet via gear icon
- Settings sheet updates parent state immediately (Quran page updates behind sheet)

### Bug Fix: "By Page" Portion Expanding to Whole Surah
- When "By Page" mode was used, `startAyah`/`endAyah` were null, so `getPageRange()` expanded to the entire surah
- Fixed `_createClass()` to convert page boundaries into exact surah:ayah using `pageStarts` data

### Bug Fix: Teacher Mistakes in Quran Reader
- `mistakesProvider` retained student mistakes after classroom visit
- Quran Reader now passes empty mistakes list for teachers, only students see their mistakes

### Phase 3: Version Bump
- Bumped all 6 files to v1.4.0

### Bug Fix: Report Tab Buttons Overflowing
- `_TabButton` Row in `report_panel.dart` overflowed by 1-18px when label + count badge exceeded 1/3 screen width
- Wrapped the inner Row in `FittedBox(fit: BoxFit.scaleDown)` so it scales to fit

### Bug Fix: Quran Text Not Filling Width on Larger Screens
- On tablets/larger screens, pages without surah headers had narrow text that didn't fill the available width
- Root cause: `MushafPageWidget._buildLine()` used `FittedBox(fit: BoxFit.scaleDown)` which only scales DOWN, never up
- When QPC text at fontSize 24 was narrower than the container, FittedBox kept it at natural size
- Fixed by changing to `BoxFit.contain` which scales both up AND down to fill available space

## Issues Encountered

- Top bar gradient overlay covered first line of Quran text: Fixed by switching from `Stack`+`Positioned` to `Column` layout with solid background
- "By Page" portion stored null ayahs, causing `getPageRange()` to expand to whole surah: Fixed by converting pages to exact surah:ayah in `_createClass()`
- Teacher's Quran reader showed student mistakes after classroom visit: Fixed by checking `isTeacher` and passing empty list
- Quran text not filling width on larger screens: Fixed by changing `FittedBox` from `BoxFit.scaleDown` to `BoxFit.contain`
- Report tab buttons overflowed on narrow screens: Wrapped inner Row in `FittedBox(fit: BoxFit.scaleDown)`

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_mobile/lib/presentation/screens/classes/create_class_screen.dart` | Modified | Added student dropdown + validation + page-to-ayah conversion fix |
| `quran_mobile/lib/presentation/providers/providers.dart` | Modified | Added `addStudentByEmail()` function |
| `quran_mobile/lib/presentation/screens/dashboard/dashboard_screen.dart` | Modified | Wired Add Student + Start New Class buttons |
| `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` | Modified | Full-screen classroom redesign with solid top bar |
| `quran_mobile/lib/presentation/screens/reader/quran_reader_screen.dart` | Modified | Hide mistakes for teachers |
| `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` | Modified | Fix text width: `BoxFit.scaleDown` → `BoxFit.contain` |
| `quran_mobile/lib/presentation/screens/classes/report/report_panel.dart` | Modified | Fix tab button overflow with FittedBox |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | Version bump to 1.4.0 |
| `quran_frontend/package.json` | Modified | Version bump to 1.4.0 |
| `quran_frontend/src/pages/Settings.tsx` | Modified | Version bump to 1.4.0 |
| `quran_mobile/pubspec.yaml` | Modified | Version bump to 1.4.0 |
| `website/index.html` | Modified | Version bump to 1.4.0 |
| `CLAUDE.md` | Modified | Version history update |

## Next Steps

- [ ] Test on physical device
- [ ] Verify all flows work end-to-end

## Notes

- Classroom top bar uses Column layout (solid background) so Quran text is never covered
- Bottom page nav is the only overlay (inside the Quran's Expanded area)
- Settings bottom sheet captures parent state via closure so changes reflect immediately
- "By Page" portions now store precise surah:ayah boundaries derived from `pageStarts` array
- `BoxFit.contain` ensures QPC text fills available width on all screen sizes (scales up AND down)
