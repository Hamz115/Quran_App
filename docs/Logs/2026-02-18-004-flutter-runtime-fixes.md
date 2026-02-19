# Session Log: Flutter Runtime Fixes — QPC Fonts, Classes UX, Report Layout

**Date:** 2026-02-18
**Session:** 004
**Duration:** ~1 hour
**Author:** Claude (Opus 4.6)

## Objective

Fix three categories of runtime issues discovered when testing the Flutter app after the Phase 18 agent team build:
1. QPC fonts not loading on web (Quran Reader broken)
2. Classes tab UX issues (report layout, row interaction, button placement)
3. Summary strip label truncation on mobile screens

## Summary

Rewrote the QPC font service to always load from bundled assets (eliminating the backend HTTP dependency for web), fixed the Classes tab so arrow chevrons toggle expand while row taps navigate into the Classroom screen, moved the "New Class" button from a FAB to an inline header button, shortened summary strip labels for mobile, and fixed portions column overflow in the classes table.

## Work Completed

### 1. QPC Font Service — Fully Offline (Critical Fix)

**Problem:** On Flutter web, the Quran Reader showed raw glyph codes instead of Mushaf text because `QpcFontService` tried to download fonts from `http://localhost:8000/api` (backend not running). Fonts were already bundled in `assets/fonts/qpc/` but the `kIsWeb` branch bypassed the local assets path.

**Fix:** Removed ALL `kIsWeb` branching. Both web and mobile now load fonts from `rootBundle` (bundled assets). Removed Dio HTTP dependency from font loading.

- `qpc_font_service.dart` — Rewrote to always use `rootBundle.load('assets/fonts/qpc/QCF_P$padded.ttf')`
- `quran_page_provider.dart` — Removed `kIsWeb` import and `baseUrl` logic, now `QpcFontService()` with no args

### 2. Classes Tab — Row Interaction Split

**Problem:** Entire class row was a dropdown toggle. User wanted: chevron arrow = expand/collapse details, rest of row = navigate into the Classroom screen.

**Fix:** Split the row interaction:
- Chevron wrapped in `GestureDetector(behavior: HitTestBehavior.opaque)` — only toggles expand
- Row body wrapped in `InkWell` — navigates to `ClassroomScreen`
- Added `onTapClass` callback chain: `ReportClassesTab` → `ReportPanel` → `ClassesScreen` → `Navigator.push`

**ID Bridge:** The report data uses Supabase UUID strings while `ClassroomScreen` originally took `int classId`. Created `classFromStringIdProvider` that handles both int IDs (local SQLite) and UUID strings (Supabase fetch).

- `report_classes_tab.dart` — Added `onTapClass` callback, split chevron/row interaction
- `report_panel.dart` — Added `onTapClass` passthrough
- `classes_screen.dart` — Added `_navigateToClass()`, passes callback to ReportPanel
- `classroom_screen.dart` — Changed `classId` from `int` to `String`
- `providers.dart` — Added `classFromStringIdProvider`

### 3. "New Class" Button — Moved to Header

**Problem:** FAB at bottom was obstructing the report content and user wanted it at the top.

**Fix:** Removed `floatingActionButton` from Scaffold. Added inline button in the header row next to the "Classes" title.

- `classes_screen.dart` — Replaced FAB with inline header button

### 4. Summary Strip Labels — Shortened for Mobile

**Problem:** Labels like "Total Mistakes" and "Avg Performance" were too long and getting truncated on mobile screens.

**Fix:** Shortened labels: `'Total Mistakes'` → `'Mistakes'`, `'Avg Performance'` → `'Avg Perf'`

- `report_summary_strip.dart` — Updated label strings

### 5. Portions Column Overflow — Fixed

**Problem:** Portion tags in the classes table had a `Row` with two `Text` widgets that could overflow the available width.

**Fix:** Replaced `Row` with a single `Text` widget using `maxLines: 1` + `TextOverflow.ellipsis`.

- `report_classes_tab.dart` — Simplified portion tag widget

## Issues Encountered

- **Supabase UUID vs Local SQLite int IDs:** Report data uses Supabase UUID strings, but `ClassroomScreen` and `classProvider` used int IDs. Resolved by creating `classFromStringIdProvider` that tries `int.tryParse()` first, falls back to Supabase fetch.
- **GestureDetector inside InkWell:** Needed `HitTestBehavior.opaque` on the chevron's `GestureDetector` so it wins the gesture arena for its region, preventing the parent `InkWell` from also firing.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_mobile/lib/core/services/qpc_font_service.dart` | Modified | Removed kIsWeb/Dio, always use rootBundle |
| `quran_mobile/lib/presentation/providers/quran_page_provider.dart` | Modified | Removed kIsWeb/baseUrl, simplified QpcFontService() |
| `quran_mobile/lib/presentation/providers/providers.dart` | Modified | Added `classFromStringIdProvider` |
| `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` | Modified | `classId: int` → `String`, use new provider |
| `quran_mobile/lib/presentation/screens/classes/classes_screen.dart` | Modified | FAB → header button, added navigation callback |
| `quran_mobile/lib/presentation/screens/classes/report/report_panel.dart` | Modified | Added `onTapClass` passthrough |
| `quran_mobile/lib/presentation/screens/classes/report/report_classes_tab.dart` | Modified | Split chevron/row interaction, fixed portions overflow |
| `quran_mobile/lib/presentation/screens/classes/report/report_summary_strip.dart` | Modified | Shortened labels for mobile |

## Next Steps

- [ ] Test all fixes with `flutter run -d chrome` and verify:
  - Quran Reader renders proper Mushaf text with QPC fonts
  - Clicking class row navigates to ClassroomScreen
  - Clicking chevron expands/collapses the detail dropdown
  - "New Class" button appears in header
  - Summary strip labels fit on mobile
  - Portion tags don't overflow
- [ ] Test on actual mobile device (Android/iOS)
- [ ] Commit all fixes

## Notes

- The `classFromStringIdProvider` creates a clean bridge between the two ID systems (local SQLite int vs Supabase UUID). This pattern can be reused anywhere the app needs to look up a class from either source.
- The `rootBundle` approach for QPC fonts works on both Flutter web and mobile because font files are declared in `pubspec.yaml` as assets, making them available through the asset bundle on all platforms.
