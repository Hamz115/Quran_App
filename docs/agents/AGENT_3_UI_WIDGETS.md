# Agent 3: UI Widgets — Report Dashboard & Classes Screen Rewrite

**Phases:** D + E
**Depends on:** Agent 2 (Foundation) must complete Phases B+C first — models, helpers, providers must exist
**Blocks:** Agent 2 Phase G (character-level rendering) starts after this agent finishes. Agent 4 (Docs) needs to know when this finishes.

## Inter-Agent Communication

**This agent MUST actively communicate with other agents:**
- Before starting → confirm with Agent 2 that Phases B+C are done and get the list of exported files/classes
- If you find a model class is missing a field you need → message Agent 2 to add it (don't modify Agent 2's files yourself)
- If a helper function from `report_helpers.dart` doesn't work as expected → message Agent 2 with the issue
- When done → message Agent 2: "UI widgets complete. You can start Phase G now."
- When done → message Agent 4: "Phases D+E complete. Files created/modified: [list]"
- If Agent 2 messages you about Phase G touching `classroom_screen.dart` → coordinate to avoid conflicts

## Objective

Build the 6 Flutter report widgets and rewrite the classes screen to match the web's Phase 16.2 inline report dashboard. Teacher selects a student via pills at the top, and a full report panel loads below with filters, summary stats, and 3 tabs (Classes, Mistakes, Performance).

## Reference

- **Full plan:** `docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md` → "New Widgets & Files", "Phase D", "Phase E"
- **Web components to mirror (read these for exact UI structure):**
  - `quran_frontend/src/pages/TeacherClasses.tsx` — Student pills + ReportPanel embed (lines 653-684)
  - `quran_frontend/src/components/teacher-classes/ReportPanel.tsx` — Orchestrator
  - `quran_frontend/src/components/teacher-classes/ReportFilterBar.tsx` — Month pills + surah/juz
  - `quran_frontend/src/components/teacher-classes/ReportSummaryStrip.tsx` — 5-stat strip
  - `quran_frontend/src/components/teacher-classes/ReportClassesTab.tsx` — Classes table
  - `quran_frontend/src/components/teacher-classes/ReportMistakesTab.tsx` — Bar chart + repeated list
  - `quran_frontend/src/components/teacher-classes/ReportPerformanceTab.tsx` — Perf chart + stats sidebar
- **Foundation from Agent 2 (must exist before starting):**
  - `quran_mobile/lib/data/models/student_report.dart` — All report model classes
  - `quran_mobile/lib/data/models/report_filters.dart` — ReportFilters, PerformanceStats
  - `quran_mobile/lib/core/services/report_helpers.dart` — Pure functions
  - `quran_mobile/lib/presentation/providers/report_provider.dart` — All report providers
- **Existing Flutter patterns to follow:**
  - `quran_mobile/lib/config/app_colors.dart` — Color palette (use `AppColors.xxx(isDarkMode)`)
  - `quran_mobile/lib/presentation/providers/theme_provider.dart` — `ref.watch(themeProvider)` for dark mode
  - `quran_mobile/lib/presentation/widgets/glassmorphic_card.dart` — Reusable card widget
  - `quran_mobile/lib/config/constants.dart` — `AppConstants.surahNames`

## Tasks

### Phase D: Report Widgets

All widgets go in `quran_mobile/lib/presentation/screens/classes/report/`

- [x] **D1.** Create `report_summary_strip.dart`
  - Simplest widget — start here to establish patterns
  - Takes `ReportSummary` as input
  - Horizontal `Row` of 5 stat cards (use `Expanded` for equal width)
  - Stats: Classes (cyan), Total Mistakes, Unique, Repeated (red), Avg Performance (green)
  - Each card: large bold number/text + small uppercase label below
  - Dark mode via `ref.watch(themeProvider)` → use `AppColors` palette
  - Match web's `ReportSummaryStrip.tsx` layout

- [x] **D2.** Create `report_filter_bar.dart`
  - Takes `ReportFilters` + `onFiltersChange` callback
  - **Row 1: Month pills**
    - "All" pill + last 3 months (e.g. "February 2026", "January 2026", "December 2025")
    - "Older months..." as a `DropdownButton` or `PopupMenuButton`
    - Active pill: cyan background. Inactive: slate
    - Use `SingleChildScrollView` with `Row` or `Wrap`
  - **Row 2: Surah + Juz filters**
    - Surah From dropdown (1-114 with names from `AppConstants.surahNames`)
    - Surah To dropdown
    - Juz dropdown (1-30)
    - "Clear all" text button
  - Generate month list dynamically (last 12 months from today)
  - Match web's `ReportFilterBar.tsx` logic

- [x] **D3.** Create `report_classes_tab.dart`
  - Takes `List<StudentClass>` + `expandedClassId` + `onToggleExpand` callback
  - `ListView.builder` of class rows sorted by date (newest first)
  - Each row shows: date + day, portion tags (colored by type), mistake count (badge), performance (badge), notes (truncated)
  - Tap chevron to expand → show inline detail: class-level mistakes (as pills) + teacher notes
  - Tap row to navigate to classroom screen
  - Portion tag colors: Hifz=blue, Sabqi=cyan, Manzil/Revision=slate
  - Performance badge colors: Excellent=green, Very Good=cyan, Good=amber, Needs Work=red
  - Match web's `ReportClassesTab.tsx` with `ClassRow` sub-component

- [x] **D4.** Create `report_mistakes_tab.dart`
  - Takes `List<MistakeBySurah>` + `List<RepeatedMistake>`
  - Two sections stacked vertically (mobile-first):
  - **Section 1: Mistakes by Surah**
    - Header: "Mistakes by Surah" + "{N} surahs" badge
    - Horizontal bar chart: surah name (right-aligned) → colored bar (proportional to max) → count + "(N unique)"
    - Bar gradient: cyan to teal
    - Sorted by total_mistakes descending
  - **Section 2: Repeated Mistakes**
    - Header: "Repeated Mistakes" + "{N} words" badge
    - Numbered list: rank circle → Arabic word (Amiri font, RTL) → surah:ayah → error count "Nx"
  - Match web's `ReportMistakesTab.tsx`

- [x] **D5.** Create `report_performance_tab.dart`
  - Takes `List<PerformanceDataPoint>` + `PerformanceStats`
  - Two sections stacked vertically:
  - **Section 1: Bar chart — Performance Over Time**
    - Y-axis: Excellent, Very Good, Good, Needs Work
    - X-axis: dates (day + month short format)
    - Color-coded bars: green (Excellent), cyan (Very Good), amber (Good), red (Needs Work)
    - Use `CustomPaint` or simple `Container` bars in a `Row`
    - Legend row at bottom
  - **Section 2: Stats sidebar (stacked as cards on mobile)**
    - Current Streak: "N classes" (green)
    - Best Streak: "N classes" + date range
    - Mistakes/Class: average + sparkline (tiny bar chart)
    - Trend: arrow + "Improving" / "Declining" / "Stable"
  - Match web's `ReportPerformanceTab.tsx`

- [x] **D6.** Create `report_panel.dart`
  - The orchestrator widget — assembles everything
  - `ConsumerStatefulWidget` (needs local state for tabs, filters, expanded class)
  - **State:**
    - `activeTab`: `classes` | `mistakes` | `performance` (default: `classes`)
    - `filters`: `ReportFilters` (from provider or local state)
    - `expandedClassId`: `String?` (for classes tab)
  - **Watches:** `studentReportProvider(studentId)` for data
  - **Computes:** `filteredReport` via `applyReportFilters()`, `performanceStats` via `computePerformanceStats()`
  - **Layout (top to bottom):**
    1. Student info line + Export button (future, can be placeholder)
    2. `ReportFilterBar`
    3. `ReportSummaryStrip`
    4. Tab bar (3 tabs with count badges)
    5. Tab content (switch on `activeTab`)
  - Loading state: `CircularProgressIndicator`
  - Error state: red error card
  - Empty state: "No data" message

### Phase E: Classes Screen Rewrite

- [x] **E1.** Rewrite `quran_mobile/lib/presentation/screens/classes/classes_screen.dart`
  - **Teacher view:**
    - Header: "Classes" title
    - Student pills: horizontal scrollable list from `teacherStudentsProvider`
    - Auto-select first student when list loads
    - Below pills: `ReportPanel(studentId: selectedStudent)`
    - FAB: "New Class" button (keep existing `_showCreateClassSheet`)
  - **Student view:**
    - No student pills (student sees their own report)
    - Show `ReportPanel(studentId: currentUserId)` directly
  - Remove all the old month-grouped table code (`_buildMonthGroupedTable`, `_buildMonthSection`, `_buildTableRow`, etc.)
  - Keep the `CreateClassScreen` import and bottom sheet logic

- [x] **E2.** Handle empty states
  - No students added yet → "No students added yet" message with guidance
  - Student selected but no report data → "No classes found" within ReportPanel
  - Loading states for both student list and report data

- [x] **E3.** Handle student pill selection
  - Tap a pill → update `selectedStudentId` → ReportPanel rebuilds with new data
  - Active pill styling: cyan/blue background, white text
  - Inactive: slate background, slate text
  - Smooth transition when switching students

- [x] **E4.** Verify full flow works
  - Select student → report loads → switch tabs → apply month filter → apply surah filter → clear filters
  - Expand a class row → see class-level mistakes
  - Dark mode toggle → all widgets update colors

## Files Created

| File | Purpose |
|---|---|
| `quran_mobile/lib/presentation/screens/classes/report/report_panel.dart` | Report orchestrator |
| `quran_mobile/lib/presentation/screens/classes/report/report_filter_bar.dart` | Filter bar (months + surah/juz) |
| `quran_mobile/lib/presentation/screens/classes/report/report_summary_strip.dart` | 5-stat summary strip |
| `quran_mobile/lib/presentation/screens/classes/report/report_classes_tab.dart` | Classes table with expandable rows |
| `quran_mobile/lib/presentation/screens/classes/report/report_mistakes_tab.dart` | Mistakes by surah + repeated list |
| `quran_mobile/lib/presentation/screens/classes/report/report_performance_tab.dart` | Performance chart + stats |

## Files Modified

| File | Change |
|---|---|
| `quran_mobile/lib/presentation/screens/classes/classes_screen.dart` | FULL REWRITE — student pills + ReportPanel |

## Key Constraints

- **All widgets must support dark mode** — use `ref.watch(themeProvider)` + `AppColors.xxx(isDarkMode)`
- **Mobile-first layout** — no side-by-side panels that break on small screens. Stack vertically on phone, side-by-side on tablet
- Use `AppConstants.surahNames` for all surah name lookups — do NOT hardcode names
- Arabic text rendering: use `fontFamily: 'Amiri'` with `TextDirection.rtl` for word display
- Follow existing widget patterns: `ConsumerWidget` or `ConsumerStatefulWidget` from Riverpod
- The `GlassmorphicCard` widget is available for card containers
- Color coding is consistent across all tabs:
  - Hifz = blue, Sabqi = cyan, Manzil = slate
  - Excellent = green, Very Good = cyan, Good = amber, Needs Work = red
  - Use helper functions from `report_helpers.dart` for badge colors

## Done Signal

When all tasks are complete, notify Agent 4 (Docs) to update the session log, changelog, and implementation plan with checked-off tasks.
