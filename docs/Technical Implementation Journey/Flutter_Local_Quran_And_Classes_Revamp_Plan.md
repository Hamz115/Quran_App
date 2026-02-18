# Flutter Local Quran & Classes Revamp — Implementation Plan

**Date:** 2026-02-18
**Status:** Planning
**Scope:** Two major Flutter changes — offline QPC fonts + classes tab revamp

---

## Table of Contents

1. [Overview](#overview)
2. [Part 1: Bundle QPC Fonts Locally](#part-1-bundle-qpc-fonts-locally)
3. [Part 2: Classes Tab Revamp](#part-2-classes-tab-revamp)
4. [New Dart Models](#new-dart-models)
5. [New Widgets & Files](#new-widgets--files)
6. [Supabase Queries](#supabase-queries)
7. [Implementation Roadmap](#implementation-roadmap)
8. [File Change Summary](#file-change-summary)

---

## Overview

### Problem Statement

The Flutter mobile app has two critical gaps:

1. **Backend dependency for fonts** — `QpcFontService` downloads 604 TTF files from `$baseUrl/fonts/qpc/$pageNum` (the FastAPI backend). On a real mobile device, there is no backend running. The Quran reader breaks without it.

2. **Flat classes screen** — The Flutter `ClassesScreen` is a simple month-grouped table showing the teacher's own classes. It has no student selector, no report panel, no filters, no summary stats, and no tabbed view. The web app (Phase 16.2) has all of this.

### What Already Works Locally

| Data Source | Status | How |
|---|---|---|
| `quran.db` (Quran text) | Already bundled | `assets/databases/`, opened via `sqflite` |
| Page JSON (604 files) | Already bundled | `assets/quran-pages/`, loaded via `rootBundle` |
| QPC fonts (604 TTFs) | **NOT bundled** — downloaded from HTTP | `QpcFontService._downloadFontMobile()` |

### Architecture: Current vs Target

```
CURRENT (requires backend):
┌──────────────┐    HTTP GET /fonts/qpc/N    ┌──────────────┐
│  Flutter App  │ ──────────────────────────> │ FastAPI      │
│               │ <──────────────────────────  │ Backend      │
│  QpcFont-     │     TTF bytes               │ fonts/qpc/   │
│  Service      │                             └──────────────┘
└──────────────┘

TARGET (fully offline):
┌──────────────────────────────────────────┐
│  Flutter App                             │
│  ┌──────────┐    rootBundle.load()       │
│  │ QpcFont-  │ ──────────────────>       │
│  │ Service   │ <──────────────────       │
│  └──────────┘    ByteData (TTF)          │
│                  assets/fonts/qpc/       │
│                  QCF_P001.ttf ... 604    │
└──────────────────────────────────────────┘
```

---

## Part 1: Bundle QPC Fonts Locally

### Current Font Loading Flow

```
qpc_font_service.dart : ensureFontsForPage(pageNum)
  → _loadFont(pageNum)  (+ adjacent pages)
    → kIsWeb?
        YES → _downloadFontWeb()     → Dio HTTP GET → FontLoader
        NO  → _downloadFontMobile()  → check disk cache → Dio HTTP GET → write to disk → FontLoader
```

**File:** `quran_mobile/lib/core/services/qpc_font_service.dart`

The mobile path (`_downloadFontMobile`) does:
1. Check `_cacheDir` (via `qpc_font_io_mobile.dart:getFontCacheDir()` → `getApplicationDocumentsDirectory()/qpc_fonts/`)
2. Look for `QCF_P{NNN}.ttf` on disk
3. If not cached → `Dio.get('$baseUrl/fonts/qpc/$pageNum')` → write to disk
4. Return font bytes → `FontLoader` registers the font family `QPC-Page-N`

### Target Font Loading Flow

```
qpc_font_service.dart : ensureFontsForPage(pageNum)
  → _loadFont(pageNum)  (+ adjacent pages)
    → kIsWeb?
        YES → _downloadFontWeb()        → Dio HTTP GET → FontLoader  (unchanged)
        NO  → _loadFontFromAssets()      → rootBundle.load() → FontLoader  (NEW)
```

### Changes Required

#### 1. Copy font files into Flutter assets

```
quran_backend/fonts/qpc/QCF_P001.ttf  →  quran_mobile/assets/fonts/qpc/QCF_P001.ttf
quran_backend/fonts/qpc/QCF_P002.ttf  →  quran_mobile/assets/fonts/qpc/QCF_P002.ttf
...
quran_backend/fonts/qpc/QCF_P604.ttf  →  quran_mobile/assets/fonts/qpc/QCF_P604.ttf
```

**604 files, 92MB total.** This is acceptable for a Quran app — many Quran apps bundle full audio (500MB+). Fonts are essential for correct rendering.

#### 2. Update `pubspec.yaml`

Add the font asset directory:

```yaml
flutter:
  assets:
    - assets/databases/
    - assets/images/
    - assets/quran-pages/
    - assets/fonts/qpc/     # NEW: 604 QPC TTF font files
    - .env
```

#### 3. Rewrite `_downloadFontMobile()` → `_loadFontFromAssets()`

In `qpc_font_service.dart`, replace the mobile path:

```dart
/// Mobile: load font from bundled assets (no network needed).
Future<Uint8List> _loadFontFromAssets(int pageNum) async {
  final padded = pageNum.toString().padLeft(3, '0');
  final assetPath = 'assets/fonts/qpc/QCF_P$padded.ttf';
  final byteData = await rootBundle.load(assetPath);
  return byteData.buffer.asUint8List();
}
```

The `_loadFont` method changes from:
```dart
final fontBytes = kIsWeb
    ? await _downloadFontWeb(pageNum)
    : await _downloadFontMobile(pageNum);
```
to:
```dart
final fontBytes = kIsWeb
    ? await _downloadFontWeb(pageNum)
    : await _loadFontFromAssets(pageNum);
```

#### 4. Simplify/remove `qpc_font_io_mobile.dart`

The disk cache functions (`getFontCacheDir`, `readFileIfExists`, `writeFile`) are no longer needed for font loading. They can be removed or left as-is if other code uses them. The conditional import in `qpc_font_service.dart` can also be removed since we no longer need `font_io`.

#### 5. Remove `baseUrl` dependency from `QpcFontService` (mobile only)

On mobile, `QpcFontService` no longer needs `baseUrl` or `Dio` for font loading. However, we keep them for the web path. The constructor signature stays the same, but the `Dio` instance is only used on web.

#### 6. Update `quran_page_provider.dart`

The provider currently passes `apiClient.baseUrl` to `QpcFontService`. On mobile, this is no longer needed but harmless. No change strictly required, but we could simplify:

```dart
final qpcFontServiceProvider = Provider<QpcFontService>((ref) {
  // baseUrl only matters for web (mobile loads from assets)
  final baseUrl = kIsWeb ? 'http://localhost:8000/api' : '';
  return QpcFontService(baseUrl: baseUrl);
});
```

### App Size Impact

| Before | After | Delta |
|---|---|---|
| ~15MB (estimated) | ~107MB | +92MB |

This is within normal range for Quran apps. The fonts are essential for rendering — without them, the app cannot display Quran text. Users downloading a Quran app expect significant size.

### Testing Checklist

- [ ] Build APK with bundled fonts
- [ ] Open Quran reader on page 1 — verify QPC glyphs render
- [ ] Swipe through several pages — fonts load without network
- [ ] Turn on airplane mode — confirm everything still works
- [ ] Check page 586 (overflow glyphs needing previous page's font)
- [ ] Verify font family names match (`QPC-Page-1`, `QPC-Page-2`, etc.)

---

## Part 2: Classes Tab Revamp

### Current Flutter Classes Screen

**File:** `quran_mobile/lib/presentation/screens/classes/classes_screen.dart` (738 lines)

Current structure:
- Header: "Classes" / "My Classes" title
- FAB: "New Class" button (teachers only)
- Body: month-grouped flat table with columns: Wk, Date, Day, Hifz, Sabqi, Manzil, Perf, Notes, Delete
- No student selector
- No report panel
- No filters
- No summary statistics
- No tabbed view

### Target Design (matching web Phase 16.2)

**Web file:** `quran_frontend/src/pages/TeacherClasses.tsx`

The web's teacher classes page:
1. **Header** — "Classes" title + "New Class" button
2. **Student pills** — horizontal scrollable list of student names (fetched from `teacher_students` table)
3. **Report panel** (for selected student) containing:
   - Student info line + Export button
   - **Filter bar** — month pills (All, Feb 2026, Jan 2026, Dec 2025, Older...) + surah range + juz selector + clear all
   - **Summary strip** — 5 stats: Classes, Total Mistakes, Unique, Repeated, Avg Performance
   - **Tab bar** — Classes | Mistakes | Performance
   - **Tab content:**
     - **Classes tab** — table with expandable rows (date, portions, mistakes, performance, notes + expanded detail)
     - **Mistakes tab** — two panels: "Mistakes by Surah" (bar chart) + "Repeated Mistakes" (ranked list)
     - **Performance tab** — bar chart (performance over time) + stats sidebar (streak, best streak, mistakes/class, trend)

### Data Source

The Flutter app uses **Supabase directly** (same as the web app). The report data query mirrors `supabase-api.ts:getStudentReport()`:

1. Fetch student profile from `profiles`
2. Fetch classes via `class_students` → `classes` → `assignments`
3. Fetch mistakes via `mistakes` → `mistake_occurrences`
4. Build per-class mistake mapping
5. Compute summary stats, mistakes by surah, repeated mistakes, performance trend

### Key Provider Changes

#### Fix `teacherStudentsProvider` (currently returns `[]` on mobile)

**File:** `quran_mobile/lib/presentation/providers/providers.dart:64`

Current code:
```dart
final teacherStudentsProvider = FutureProvider<List<({String id, String name})>>((ref) async {
  if (!kIsWeb) return [];  // ← THIS IS THE PROBLEM
  ...
});
```

Fix: Remove the `kIsWeb` guard. The Supabase query works identically on mobile:
```dart
final teacherStudentsProvider = FutureProvider<List<({String id, String name})>>((ref) async {
  final user = ref.read(authProvider).user;
  if (user == null) return [];
  final supabase = Supabase.instance.client;
  final response = await supabase
      .from('teacher_students')
      .select('student_id, student:profiles!student_id(id, name)')
      .eq('teacher_id', user.id);
  return (response as List).map((row) {
    final student = row['student'] as Map<String, dynamic>?;
    return (
      id: (student?['id'] ?? row['student_id']).toString(),
      name: (student?['name'] ?? 'Student').toString(),
    );
  }).toList();
});
```

#### New Provider: `studentReportProvider`

A new `FutureProvider.family<StudentReport, String>` that fetches the full report for a student ID. This mirrors the web's `getStudentReport()` function.

```dart
final studentReportProvider = FutureProvider.family<StudentReport, String>((ref, studentId) async {
  final supabase = Supabase.instance.client;

  // 1. Fetch student profile
  final profile = await supabase.from('profiles').select().eq('id', studentId).single();

  // 2. Fetch classes via class_students
  final classStudents = await supabase
      .from('class_students')
      .select('class_id, classes(id, date, day, notes, performance, assignments(*))')
      .eq('student_id', studentId);

  // 3. Fetch mistakes with occurrences
  final mistakes = await supabase
      .from('mistakes')
      .select('*, mistake_occurrences(id, class_id, occurred_at)')
      .eq('student_id', studentId);

  // 4. Build and return StudentReport
  return _buildStudentReport(profile, classStudents, mistakes);
});
```

---

## New Dart Models

Mirror the web's `report-types.ts` interfaces:

### File: `quran_mobile/lib/data/models/student_report.dart`

```dart
/// Mirrors report-types.ts: StudentReport
class StudentReport {
  final StudentInfo student;
  final ReportSummary summary;
  final List<StudentClass> classes;
  final List<MistakeBySurah> mistakesBySurah;
  final List<RepeatedMistake> repeatedMistakes;
  final List<PerformanceDataPoint> performanceTrend;
}

class StudentInfo {
  final String id;
  final String name;
  final String email;
  final String studentId;
  final String addedAt;
}

class ReportSummary {
  final int totalClasses;
  final int totalMistakes;
  final int uniqueMistakes;
  final int repeatedMistakes;
  final String avgPerformance;
}

class StudentClass {
  final String id;
  final String date;
  final String day;
  final String? notes;
  final String? performance;
  final List<ClassAssignment> assignments;
  final List<ClassMistake> mistakes;
  final int mistakeCount;
}

class ClassAssignment {
  final String type;
  final int startSurah;
  final int endSurah;
  final int? startAyah;
  final int? endAyah;
}

class ClassMistake {
  final String id;
  final int surahNumber;
  final String surahName;
  final int ayahNumber;
  final String wordText;
  final int errorCount;
}

class MistakeBySurah {
  final int surahNumber;
  final String surahName;
  final int totalMistakes;
  final int uniqueMistakes;
}

class RepeatedMistake {
  final String id;
  final int surahNumber;
  final String surahName;
  final int ayahNumber;
  final String wordText;
  final int errorCount;
}

class PerformanceDataPoint {
  final String date;
  final String performance;
}
```

### File: `quran_mobile/lib/data/models/report_filters.dart`

```dart
/// Mirrors report-types.ts: ReportFilters + PerformanceStats
enum DatePreset { oneMonth, twoMonths, sixMonths, all }

class ReportFilters {
  final String dateFrom;
  final String dateTo;
  final DatePreset datePreset;
  final int? surahFrom;
  final int? surahTo;
  final int? juz;

  const ReportFilters({
    this.dateFrom = '',
    this.dateTo = '',
    this.datePreset = DatePreset.all,
    this.surahFrom,
    this.surahTo,
    this.juz,
  });

  ReportFilters copyWith({...});
}

class PerformanceStats {
  final int currentStreak;
  final int bestStreak;
  final String bestStreakRange;
  final double mistakesPerClass;
  final List<double> mistakeSparkline;
  final String trend; // 'improving', 'declining', 'stable'
}
```

---

## New Widgets & Files

### Directory Structure

```
quran_mobile/lib/
├── data/models/
│   ├── student_report.dart       # NEW: Report data models
│   └── report_filters.dart       # NEW: Filter + stats models
│
├── core/services/
│   └── report_helpers.dart       # NEW: Pure functions (filtering, stats, formatting)
│
├── presentation/
│   ├── providers/
│   │   ├── providers.dart        # MODIFY: fix teacherStudentsProvider
│   │   └── report_provider.dart  # NEW: studentReportProvider + filteredReportProvider
│   │
│   └── screens/classes/
│       ├── classes_screen.dart    # REWRITE: student pills + report panel
│       ├── create_class_screen.dart  # KEEP (minor: add student selection later)
│       └── report/               # NEW DIRECTORY
│           ├── report_panel.dart         # Report orchestrator (state, tabs)
│           ├── report_filter_bar.dart    # Month pills, surah/juz selectors
│           ├── report_summary_strip.dart # 5-stat horizontal strip
│           ├── report_classes_tab.dart   # Classes table with expandable rows
│           ├── report_mistakes_tab.dart  # Mistakes by surah + repeated list
│           └── report_performance_tab.dart # Bar chart + stats sidebar
```

### Widget Details

#### `classes_screen.dart` (REWRITE)

New structure:
```
Scaffold
├── AppBar: "Classes" + New Class button
├── Student Pills (horizontal scroll)
│   └── For each student: chip/pill button
│       Active = cyan/blue, Inactive = slate
└── ReportPanel(studentId: selectedStudent)
```

**State:**
- `selectedStudentId` — currently selected student (auto-select first)
- Students list from `teacherStudentsProvider`

#### `report_panel.dart`

Mirrors web's `ReportPanel.tsx`:
- Fetches report via `studentReportProvider(studentId)`
- Manages filter state (`ReportFilters`)
- Manages active tab state (`classes`, `mistakes`, `performance`)
- Computes `filteredReport` and `performanceStats`
- Renders: filter bar → summary strip → tab bar → tab content

#### `report_filter_bar.dart`

Mirrors web's `ReportFilterBar.tsx`:
- Row 1: Month pills — "All" + last 3 months + "Older months..." dropdown
- Row 2: Surah from/to dropdowns + Juz dropdown + "Clear all" button
- Uses `Wrap` for responsive layout on mobile

#### `report_summary_strip.dart`

Mirrors web's `ReportSummaryStrip.tsx`:
- Horizontal row of 5 stat cards
- Uses `Row` with `Expanded` children
- Each card: large number + small label below

#### `report_classes_tab.dart`

Mirrors web's `ReportClassesTab.tsx`:
- `ListView` of class rows (sorted newest first)
- Each row: date, portions (colored tags), mistake count (badge), performance (badge), notes
- Tap to expand → show class-level mistakes + teacher notes
- Tap row itself to navigate to classroom

#### `report_mistakes_tab.dart`

Mirrors web's `ReportMistakesTab.tsx`:
- Two sections (stacked vertically on mobile, side-by-side on tablet):
  1. **Mistakes by Surah** — horizontal bar chart with surah names
  2. **Repeated Mistakes** — numbered list with Arabic word, location, error count

#### `report_performance_tab.dart`

Mirrors web's `ReportPerformanceTab.tsx`:
- Two sections (stacked on mobile):
  1. **Bar chart** — performance over time (color-coded bars)
  2. **Stats cards** — current streak, best streak, mistakes/class, trend

### Pure Helper Functions

#### `core/services/report_helpers.dart`

Port from web's `report-helpers.ts`:

```dart
// Constants
const Map<String, int> perfMap = {
  'Excellent': 4, 'Very Good': 3, 'Good': 2, 'Needs Work': 1,
};
const List<String> perfLabels = ['', 'Needs Work', 'Good', 'Very Good', 'Excellent'];

// Badge colors
Color perfBadgeColor(String perf) { ... }
Color mistakeCountColor(int count) { ... }
Color portionTagColor(String type) { ... }

// Formatting
String formatDate(String dateStr) { ... }
({String from, String to}) getDatePresetRange(DatePreset preset) { ... }

// Statistics
PerformanceStats computePerformanceStats(List<StudentClass> classes) { ... }

// Filtering
StudentReport applyReportFilters(StudentReport report, ReportFilters filters) { ... }
```

---

## Supabase Queries

The Flutter report fetches mirror the web's `getStudentReport()` from `supabase-api.ts:835-995`:

### Query 1: Student Profile

```dart
final profile = await supabase
    .from('profiles')
    .select('id, name, email, student_id, created_at')
    .eq('id', studentId)
    .single();
```

### Query 2: Classes (via class_students join)

```dart
final classStudents = await supabase
    .from('class_students')
    .select('''
      class_id,
      classes (
        id, date, day, notes, performance, teacher_id, is_published,
        assignments (*)
      )
    ''')
    .eq('student_id', studentId);
```

### Query 3: Mistakes with Occurrences

```dart
final mistakes = await supabase
    .from('mistakes')
    .select('*, mistake_occurrences(id, class_id, occurred_at)')
    .eq('student_id', studentId);
```

### Post-Processing (in Dart)

Same logic as web's `getStudentReport()`:
1. Build `classMistakeMap` — Map<String, List<ClassMistake>> keyed by class_id
2. Build classes list with per-class mistakes and mistake_count
3. Compute summary: total_classes, total_mistakes, unique_mistakes, repeated_mistakes, avg_performance
4. Group mistakes by surah → `mistakes_by_surah`
5. Filter mistakes with error_count > 1 → `repeated_mistakes`
6. Extract performance trend → `performance_trend`

---

## Implementation Roadmap

### Phase A: Offline QPC Fonts

- [ ] **A1.** Copy 604 TTF files from `quran_backend/fonts/qpc/` to `quran_mobile/assets/fonts/qpc/`
- [ ] **A2.** Add `assets/fonts/qpc/` to `pubspec.yaml` assets
- [ ] **A3.** Rewrite `QpcFontService._downloadFontMobile()` → `_loadFontFromAssets()` using `rootBundle.load()`
- [ ] **A4.** Remove Dio dependency from mobile font path (keep for web)
- [ ] **A5.** Simplify `qpc_font_io_mobile.dart` (remove or mark as unused)
- [ ] **A6.** Update `quran_page_provider.dart` — simplify `baseUrl` for mobile
- [ ] **A7.** Test: build APK, open reader, verify fonts render offline

### Phase B: Data Models & Helpers

- [ ] **B1.** Create `data/models/student_report.dart` — all report model classes
- [ ] **B2.** Create `data/models/report_filters.dart` — ReportFilters + PerformanceStats
- [ ] **B3.** Create `core/services/report_helpers.dart` — pure functions ported from `report-helpers.ts`
- [ ] **B4.** Write unit tests for `applyReportFilters()` and `computePerformanceStats()`

### Phase C: Providers

- [ ] **C1.** Fix `teacherStudentsProvider` — remove `if (!kIsWeb) return []` guard
- [ ] **C2.** Create `presentation/providers/report_provider.dart`:
  - `studentReportProvider` — fetches full report from Supabase
  - `reportFiltersProvider` — StateProvider for current filters
  - `filteredReportProvider` — computed from report + filters
  - `performanceStatsProvider` — computed from filtered classes

### Phase D: Report Widgets

- [ ] **D1.** Create `report_summary_strip.dart` — simplest widget, start here
- [ ] **D2.** Create `report_filter_bar.dart` — month pills + surah/juz selectors
- [ ] **D3.** Create `report_classes_tab.dart` — classes table with expandable rows
- [ ] **D4.** Create `report_mistakes_tab.dart` — bar chart + repeated list
- [ ] **D5.** Create `report_performance_tab.dart` — bar chart + stats sidebar
- [ ] **D6.** Create `report_panel.dart` — orchestrator (assembles all widgets + tab bar)

### Phase E: Classes Screen Rewrite

- [ ] **E1.** Rewrite `classes_screen.dart`:
  - Add student pills at top (from `teacherStudentsProvider`)
  - Auto-select first student
  - Embed `ReportPanel` below pills
  - Keep FAB for "New Class"
- [ ] **E2.** Student view: show student's own report (no student selector)
- [ ] **E3.** Handle empty states (no students, no report data)
- [ ] **E4.** Test full flow: select student → see report → switch tabs → apply filters

### Phase F: Polish

- [ ] **F1.** Dark mode — verify all new widgets respect `themeProvider`
- [ ] **F2.** Responsive — test on small phones, tablets
- [ ] **F3.** Pull-to-refresh on report data
- [ ] **F4.** Loading skeletons for report panel
- [ ] **F5.** Error handling + retry for Supabase queries

---

## File Change Summary

### Modified Files

| File | Change |
|---|---|
| `quran_mobile/pubspec.yaml` | Add `assets/fonts/qpc/` to assets list |
| `quran_mobile/lib/core/services/qpc_font_service.dart` | Replace `_downloadFontMobile()` with `_loadFontFromAssets()` |
| `quran_mobile/lib/core/services/qpc_font_io_mobile.dart` | Remove or simplify (no longer needed for fonts) |
| `quran_mobile/lib/presentation/providers/providers.dart` | Fix `teacherStudentsProvider` to work on mobile |
| `quran_mobile/lib/presentation/providers/quran_page_provider.dart` | Simplify `baseUrl` for mobile |
| `quran_mobile/lib/presentation/screens/classes/classes_screen.dart` | Full rewrite — student pills + report panel |

### New Files

| File | Purpose |
|---|---|
| `quran_mobile/assets/fonts/qpc/QCF_P001.ttf` ... `QCF_P604.ttf` | 604 bundled QPC font files |
| `quran_mobile/lib/data/models/student_report.dart` | Report data models |
| `quran_mobile/lib/data/models/report_filters.dart` | Filter + stats models |
| `quran_mobile/lib/core/services/report_helpers.dart` | Pure helper functions |
| `quran_mobile/lib/presentation/providers/report_provider.dart` | Report providers (Supabase + computed) |
| `quran_mobile/lib/presentation/screens/classes/report/report_panel.dart` | Report orchestrator |
| `quran_mobile/lib/presentation/screens/classes/report/report_filter_bar.dart` | Filter bar widget |
| `quran_mobile/lib/presentation/screens/classes/report/report_summary_strip.dart` | Summary strip widget |
| `quran_mobile/lib/presentation/screens/classes/report/report_classes_tab.dart` | Classes tab widget |
| `quran_mobile/lib/presentation/screens/classes/report/report_mistakes_tab.dart` | Mistakes tab widget |
| `quran_mobile/lib/presentation/screens/classes/report/report_performance_tab.dart` | Performance tab widget |

### Deleted/Unused

| File | Reason |
|---|---|
| `qpc_font_io_mobile.dart` functions | Disk cache no longer needed (fonts are assets) |

---

## Appendix: Web Component → Flutter Widget Mapping

| Web (React) | Flutter (Dart) | Notes |
|---|---|---|
| `TeacherClasses.tsx` student pills | `classes_screen.dart` top section | Horizontal `ListView` of `ChoiceChip` |
| `ReportPanel.tsx` | `report_panel.dart` | `ConsumerStatefulWidget` with tab state |
| `ReportFilterBar.tsx` | `report_filter_bar.dart` | `Wrap` + `ChoiceChip` for month pills |
| `ReportSummaryStrip.tsx` | `report_summary_strip.dart` | `Row` of `Expanded` stat cards |
| `ReportClassesTab.tsx` | `report_classes_tab.dart` | `ListView` with `ExpansionTile` |
| `ReportMistakesTab.tsx` | `report_mistakes_tab.dart` | `Column` with bar chart + list |
| `ReportPerformanceTab.tsx` | `report_performance_tab.dart` | Custom paint bar chart + stat cards |
| `report-helpers.ts` | `report_helpers.dart` | Pure Dart functions |
| `report-types.ts` | `student_report.dart` + `report_filters.dart` | Dart classes |
| `supabase-api.ts:getStudentReport()` | `report_provider.dart:studentReportProvider` | Riverpod FutureProvider |
