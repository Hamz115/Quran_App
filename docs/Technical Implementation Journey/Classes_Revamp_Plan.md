# Classes Revamp — Technical Implementation Plan

> **Goal**: Inline the `StudentReport` page into `TeacherClasses` as a slide-out panel, extract its logic into reusable components under `src/components/teacher-classes/`, remove the standalone route, and update all navigation.

---

## 1. Current Architecture Analysis

### 1.1 Files Involved

| File | Lines | Role |
|------|-------|------|
| `src/pages/StudentReport.tsx` | 1–1066 | Standalone report page (to be decomposed) |
| `src/pages/TeacherClasses.tsx` | 1–1594 | Main teacher classes page (to gain report panel) |
| `src/App.tsx` | 1–72 | Route config (route to remove) |
| `src/pages/TeacherDashboard.tsx` | 1–472 | Navigation links (to update) |
| `src/api.ts` | 1–170 | Re-exports (add `getStudentReport`) |
| `src/lib/report-types.ts` | 1–108 | Shared interfaces (no changes) |
| `src/lib/report-export.ts` | 1–527 | Export utilities (no changes) |
| `src/lib/supabase-api.ts` | 835+ | `getStudentReport()` API function (no changes) |
| `src/lib/quran-utils.ts` | 1–95 | `surahNames`, `getSurahRangeForJuz` (no changes) |
| `src/components/` | 3 files | `Layout.tsx`, `ProtectedRoute.tsx`, `FittedLine.tsx` (no changes) |

### 1.2 StudentReport.tsx Breakdown

```
Lines  1–11   Imports (React, router, theme, API, types, export utils)
Lines 13–20   PERF_MAP constant — maps performance strings to numeric scores
Lines 22–22   PERF_LABELS constant — index-to-label array
Lines 24–43   Helper functions: perfBadgeClasses, mistakeCountClasses, portionTagClasses, formatDate
Lines 53–61   getDatePresetRange() — converts DatePreset to {from, to} strings
Lines 63–125  computePerformanceStats() — streak, trend, sparkline, mistakes/class
Lines 129–776 StudentReportPage component:
  Lines 130–142  State: report, loading, error, activeTab, filters, showExportModal, expandedClassId
  Lines 144–159  useEffect: fetch report via getStudentReport(studentId)
  Lines 162–256  useMemo: filteredReport — applies date, surah, juz filters
  Lines 258–261  useMemo: performanceStats — derived from filteredReport
  Lines 264–284  Filter handlers: handlePreset, handleJuzChange, clearAllFilters
  Lines 288–323  Loading/error/empty renders
  Lines 325–331  Theme variables (bg, cardBg, borderColor, textPrimary, etc.)
  Lines 333–775  JSX: top bar, filter bar, summary strip, tab nav, tab content, export modal
Lines 780–898 ClassRow sub-component (expandable table row)
Lines 902–1065 ExportModal sub-component (format picker + section toggles)
```

### 1.3 TeacherClasses.tsx Breakdown

```
Lines  1–8    Imports
Lines 9–30    Local interfaces (SurahInfo, SinglePortion, PortionConfig)
Lines 33–49   groupByMonth, getMonthLabel helpers
Lines 51–708  TeacherClasses component:
  Lines 52–131   State declarations (~25 state variables)
  Lines 132–160  useEffect: loadData (classes, students, surahs)
  Lines 162–234  Student toggle, modal reset, per-student config helpers
  Lines 236–279  Suggestion fetch/apply logic
  Lines 290–354  handleCreateClass — builds assignments and calls API
  Lines 357–416  useMemo: allMonths, recentMonths, filteredClasses, classCountByMonth
  Lines 418–426  Derived: groupedClasses, sortedMonths, selectedStudentNames
  Lines 436–708  Inner components: ToggleSwitch, PortionSelector
Lines 710–1594 JSX return:
  Lines 710–727  Header with "New Class" button
  Lines 729–805  Filter bar (student pills, month tabs)
  Lines 808–1139 Class cards (grouped by month, per-student rows)
  Lines 1141–1507 New Class Modal (2-step: students → portions)
  Lines 1509–1591 Notes Modal
```

### 1.4 App.tsx Route to Remove

```tsx
// Line 49 — standalone report route (to be REMOVED)
<Route path="teacher/students/:studentId/report" element={<StudentReport />} />
```

### 1.5 TeacherDashboard.tsx Navigation Points

```tsx
// Line 327 — student card "View Report" link
navigate(`/teacher/students/${student.id}/report`);

// Lines 982–995 — class card "Report" button
navigate(`/teacher/students/${student.id}/report`);
```

---

## 2. New Component Architecture

### 2.1 Directory Structure

```
src/components/teacher-classes/
├── index.ts                    # Barrel exports
├── report-helpers.ts           # Pure functions extracted from StudentReport
├── ReportPanel.tsx             # Slide-out panel shell (orchestrator)
├── ReportFilterBar.tsx         # Date presets + surah/juz selectors
├── ReportSummaryStrip.tsx      # 5-stat horizontal strip
├── ReportClassesTab.tsx        # Classes table with expandable rows
├── ReportMistakesTab.tsx       # Mistakes-by-surah + repeated mistakes
├── ReportPerformanceTab.tsx    # Bar chart + stats sidebar
└── ExportModal.tsx             # Format picker + section toggles
```

### 2.2 File Specifications

#### `report-helpers.ts` — Pure Functions (no React)

**Extracted from** `StudentReport.tsx` lines 13–125.

```ts
// Constants
export const PERF_MAP: Record<string, number>;
export const PERF_LABELS: string[];

// Badge class generators
export function perfBadgeClasses(perf: string): string;
export function mistakeCountClasses(count: number): string;
export function portionTagClasses(type: string): string;

// Formatters
export function formatDate(dateStr: string): string;
export function getDatePresetRange(preset: DatePreset): { from: string; to: string };

// Statistics
export function computePerformanceStats(classes: StudentClass[]): PerformanceStats;

// Filtering (NEW — extracted from useMemo in StudentReportPage)
export function applyReportFilters(report: StudentReport, filters: ReportFilters): StudentReport;
```

`applyReportFilters` encapsulates the entire `filteredReport` useMemo logic (lines 162–256) as a pure function, making it testable independently.

#### `ReportPanel.tsx` — Orchestrator

**Props interface:**

```ts
interface ReportPanelProps {
  studentId: string;           // Which student's report to show
  onClose: () => void;         // Close the panel
}
```

**Responsibilities:**
- Fetches report data via `getStudentReport(studentId)`
- Owns ALL report state: `report`, `loading`, `error`, `activeTab`, `filters`, `showExportModal`, `expandedClassId`
- Computes `filteredReport` and `performanceStats` via useMemo
- Renders slide-out panel shell (fixed overlay, right-side panel)
- Renders header bar with student name + close button + export button
- Delegates to child components for filter bar, summary, tabs

**Layout:**
- Fixed position overlay (`fixed inset-0 z-40`)
- Backdrop click to close
- Panel on right side (`w-[900px] max-w-full`)
- Scrollable content area

#### `ReportFilterBar.tsx` — Filter Controls

**Props interface:**

```ts
interface ReportFilterBarProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  darkMode: boolean;
}
```

**Renders:** Date preset pills, date range inputs, surah from/to dropdowns, juz dropdown, "Clear all" button.

**Contains:** `handlePreset`, `handleJuzChange`, `clearAllFilters` logic (currently lines 264–284 in StudentReport).

#### `ReportSummaryStrip.tsx` — Statistics Bar

**Props interface:**

```ts
interface ReportSummaryStripProps {
  summary: StudentReport['summary'];
  darkMode: boolean;
}
```

**Renders:** 5-cell horizontal strip (Classes, Total Mistakes, Unique, Repeated, Avg Performance).

#### `ReportClassesTab.tsx` — Classes Table

**Props interface:**

```ts
interface ReportClassesTabProps {
  classes: StudentClass[];
  expandedClassId: string | null;
  onToggleExpand: (classId: string) => void;
  darkMode: boolean;
}
```

**Contains:** ClassRow sub-component (moved from StudentReport.tsx lines 780–898).

#### `ReportMistakesTab.tsx` — Mistakes Analysis

**Props interface:**

```ts
interface ReportMistakesTabProps {
  mistakesBySurah: MistakeBySurah[];
  repeatedMistakes: RepeatedMistake[];
  darkMode: boolean;
}
```

**Renders:** Two-column grid — "Mistakes by Surah" (horizontal bars) + "Repeated Mistakes" (numbered list).

#### `ReportPerformanceTab.tsx` — Performance Charts

**Props interface:**

```ts
interface ReportPerformanceTabProps {
  performanceTrend: PerformanceDataPoint[];
  performanceStats: PerformanceStats;
  darkMode: boolean;
}
```

**Renders:** Bar chart (left) + stats sidebar with cards (Current Streak, Best Streak, Mistakes/Class, Trend).

#### `ExportModal.tsx` — Export Dialog

**Props interface:**

```ts
interface ExportModalProps {
  report: StudentReport;
  filters: ReportFilters;
  darkMode: boolean;
  onClose: () => void;
}
```

**Moved from** StudentReport.tsx lines 902–1065. No logic changes.

#### `index.ts` — Barrel Exports

```ts
export { default as ReportPanel } from './ReportPanel';
// Other components are internal to ReportPanel, but exported for testing
export { default as ReportFilterBar } from './ReportFilterBar';
export { default as ReportSummaryStrip } from './ReportSummaryStrip';
export { default as ReportClassesTab } from './ReportClassesTab';
export { default as ReportMistakesTab } from './ReportMistakesTab';
export { default as ReportPerformanceTab } from './ReportPerformanceTab';
export { default as ExportModal } from './ExportModal';
export * from './report-helpers';
```

---

## 3. State Management Design

### 3.1 State Ownership Table

| State Variable | Owner | Passed To | Notes |
|---------------|-------|-----------|-------|
| `selectedReportStudentId` | TeacherClasses | ReportPanel (as `studentId`) | `string \| null`, controls panel visibility |
| `report` | ReportPanel | — | Raw API response |
| `loading` | ReportPanel | — | |
| `error` | ReportPanel | — | |
| `activeTab` | ReportPanel | — | `'classes' \| 'mistakes' \| 'performance'` |
| `filters` | ReportPanel | ReportFilterBar | `ReportFilters` |
| `filteredReport` | ReportPanel (useMemo) | SummaryStrip, Tabs, ExportModal | Derived from `report` + `filters` |
| `performanceStats` | ReportPanel (useMemo) | PerformanceTab | Derived from `filteredReport` |
| `showExportModal` | ReportPanel | — | |
| `expandedClassId` | ReportPanel | ReportClassesTab | |

### 3.2 TeacherClasses New State

Only ONE new state variable added to TeacherClasses:

```ts
const [selectedReportStudentId, setSelectedReportStudentId] = useState<string | null>(null);
```

Panel open: `selectedReportStudentId !== null`
Panel close: `setSelectedReportStudentId(null)`

---

## 4. Data Flow Diagram

```
TeacherClasses
  │
  ├─ [student.id click] ──→ setSelectedReportStudentId(id)
  │
  └─ {selectedReportStudentId && <ReportPanel studentId={...} onClose={...} />}
       │
       ├─ useEffect ──→ getStudentReport(studentId) ──→ setReport(data)
       │
       ├─ useMemo(filteredReport) ←── [report, filters]
       │     └─ calls applyReportFilters(report, filters)
       │
       ├─ useMemo(performanceStats) ←── [filteredReport]
       │     └─ calls computePerformanceStats(filteredReport.classes)
       │
       ├─ <ReportFilterBar filters={filters} onFiltersChange={setFilters} />
       │
       ├─ <ReportSummaryStrip summary={filteredReport.summary} />
       │
       ├─ Tab Nav (classes | mistakes | performance)
       │
       ├─ activeTab === 'classes'
       │     └─ <ReportClassesTab classes={filteredReport.classes} ... />
       │           └─ <ClassRow /> (internal, expandable)
       │
       ├─ activeTab === 'mistakes'
       │     └─ <ReportMistakesTab mistakesBySurah={...} repeatedMistakes={...} />
       │
       ├─ activeTab === 'performance'
       │     └─ <ReportPerformanceTab performanceTrend={...} performanceStats={...} />
       │
       └─ showExportModal
             └─ <ExportModal report={filteredReport} filters={filters} onClose={...} />
```

---

## 5. Combined Filter Logic

The filter system from StudentReport is reused intact. Key interaction rules:

1. **Date presets** (1m, 2m, 6m, all) → set `dateFrom`/`dateTo` automatically, clear custom dates
2. **Custom date inputs** → override presets, set `datePreset` to `'all'`
3. **Juz selection** → overrides `surahFrom`/`surahTo` with juz boundaries via `getSurahRangeForJuz()`
4. **Manual surah selection** → clears `juz` (mutual exclusion)
5. **"Clear all filters"** → resets to `{ dateFrom: '', dateTo: '', datePreset: 'all', surahFrom: null, surahTo: null, juz: null }`

This logic is self-contained within `ReportFilterBar`, which receives `filters` and calls `onFiltersChange` with the new state.

The `applyReportFilters()` pure function in `report-helpers.ts` handles:
- Date-range filtering on classes and performance_trend
- Surah-range filtering on classes (via assignments overlap), mistakes_by_surah, repeated_mistakes
- Per-class mistake filtering within surah range
- Summary recomputation from filtered data

---

## 6. Page Layout Wireframe

### TeacherClasses with Report Panel Open

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Backdrop overlay - click to close]                                        │
│                                    ┌────────────────────────────────────────┐│
│  TeacherClasses (dimmed)           │ REPORT PANEL (w-[900px])              ││
│  ┌──────────────────────┐          │                                        ││
│  │ Classes              │          │ ← Back   Student Name    [Export]      ││
│  │ Manage your sessions │          │ email · Student since date             ││
│  ├──────────────────────┤          │────────────────────────────────────────││
│  │ Student: All|A|B|C   │          │ Date [1M][2M][6M][All] [from]-[to]   ││
│  │ Month: Feb|Jan|Dec   │          │ Surah [from▼]–[to▼] Juz [▼] Clear   ││
│  ├──────────────────────┤          │────────────────────────────────────────││
│  │ February 2026 (3)    │          │ 12    45    18     5    Very Good     ││
│  │ ┌────────────────┐   │          │ Classes Mistakes Unique Repeat AvgPerf││
│  │ │ W1 Mon, 03/02  │   │          │────────────────────────────────────────││
│  │ │ Student A  [Rpt]│   │          │ [Classes] [Mistakes 45] [Performance]││
│  │ │ HIFZ: Al-Mulk  │   │          │════════════════════════════════════════││
│  │ │ SABQI: —        │   │          │ ▶ Date    Portions   Mistakes Perf   ││
│  │ └────────────────┘   │          │ ▶ 15 Feb  HIFZ Mulk  3       Excel  ││
│  │ ┌────────────────┐   │          │ ▼ 12 Feb  SABQI Qaf  5       Good   ││
│  │ │ W1 Tue, 04/02  │   │          │   Mistakes: word1, word2, word3       ││
│  │ └────────────────┘   │          │   Notes: "Great improvement"          ││
│  └──────────────────────┘          │                                        ││
│                                    └────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Changes to Existing Files

### 7.1 `TeacherClasses.tsx`

**Add:**
- Import `ReportPanel` from `../components/teacher-classes`
- Import `getStudentReport` from `../api` (needed by ReportPanel's internal import, not directly here)
- State: `const [selectedReportStudentId, setSelectedReportStudentId] = useState<string | null>(null);`
- JSX: `{selectedReportStudentId && <ReportPanel studentId={selectedReportStudentId} onClose={() => setSelectedReportStudentId(null)} />}`

**Modify:**
- Line 984–985: Change `navigate(`/teacher/students/${student.id}/report`)` to `setSelectedReportStudentId(student.id)` (Report button in class cards)

**No other changes.** The TeacherClasses component stays at ~1600 lines; it gains ~5 lines.

### 7.2 `App.tsx`

**Remove:**
- Line 19: `import StudentReport from './pages/StudentReport';`
- Line 49: `<Route path="teacher/students/:studentId/report" element={<StudentReport />} />`

### 7.3 `TeacherDashboard.tsx`

**Modify:**
- Line 327: Change `navigate(`/teacher/students/${student.id}/report`)` to `navigate(`/teacher/classes?report=${student.id}`)`

**Rationale:** The dashboard navigates to TeacherClasses with a query param. TeacherClasses reads `?report=ID` from search params (like it already does for `?new=1`) and opens the report panel.

**Add to TeacherClasses.tsx** (corresponding change):
- In the existing `useEffect` that handles `searchParams` (lines 80–94), add:
  ```ts
  const reportStudentId = searchParams.get('report');
  if (reportStudentId) {
    setSelectedReportStudentId(reportStudentId);
    setSearchParams({});
  }
  ```

### 7.4 `api.ts`

**Add** to the Supabase re-exports (line 31):
```ts
getStudentReport,
```

This allows `ReportPanel` to import from `../api` rather than reaching into `../lib/supabase-api` directly.

### 7.5 `StudentReport.tsx`

**Delete** the entire file after all components are extracted. This file becomes obsolete.

---

## 8. Implementation Sequence

### Step 1: Create `report-helpers.ts`
Extract all pure functions and constants from StudentReport.tsx (lines 13–125). Add the new `applyReportFilters()` function.

### Step 2: Create `ExportModal.tsx`
Move ExportModal (lines 902–1065) to its own file. Update imports.

### Step 3: Create `ReportClassesTab.tsx`
Move the classes tab JSX (lines 520–563) and ClassRow component (lines 780–898). Import helpers from `report-helpers.ts`.

### Step 4: Create `ReportMistakesTab.tsx`
Move the mistakes tab JSX (lines 566–642).

### Step 5: Create `ReportPerformanceTab.tsx`
Move the performance tab JSX (lines 644–762). Include the stats sidebar.

### Step 6: Create `ReportFilterBar.tsx`
Move the filter bar JSX (lines 369–465) and filter handlers (lines 264–284).

### Step 7: Create `ReportSummaryStrip.tsx`
Move the summary strip JSX (lines 467–485).

### Step 8: Create `ReportPanel.tsx`
Build the orchestrator component. Import all child components. Own all state. Render the slide-out panel shell.

### Step 9: Create `index.ts`
Barrel exports for the directory.

### Step 10: Update existing files
- `TeacherClasses.tsx`: Add state + ReportPanel + update Report button handler + read `?report=` from URL
- `App.tsx`: Remove route + import
- `TeacherDashboard.tsx`: Update navigation to use query param
- `api.ts`: Add `getStudentReport` to re-exports
- Delete `StudentReport.tsx`

---

## 9. Edge Cases & Challenges

### 9.1 Search Param Conflicts
`TeacherClasses` already uses `?new=1` and `?student=ID`. Adding `?report=ID` could conflict if both appear. Solution: process `?report=` in the same useEffect, before `?new=1`. The `setSearchParams({})` call clears all params.

### 9.2 Key-Based Remounting
When the user clicks "Report" for student A, then clicks "Report" for student B (without closing), `ReportPanel` should refetch. Use `key={selectedReportStudentId}` on `<ReportPanel>` to force remount and re-fetch.

### 9.3 Race Conditions
The `getStudentReport` fetch in ReportPanel uses the standard `isMounted` pattern (already in StudentReport.tsx). If the user rapidly opens/closes the panel, stale responses are discarded.

### 9.4 Body Scroll Lock
When the report panel overlay is open, the page behind should not scroll. Add `overflow-hidden` to `body` when panel is open. ReportPanel's `useEffect` can manage this:
```ts
useEffect(() => {
  document.body.style.overflow = 'hidden';
  return () => { document.body.style.overflow = ''; };
}, []);
```

### 9.5 Responsive Width
The panel uses `w-[900px] max-w-full`. On mobile, it becomes full-width. The filter bar already uses `flex-wrap` for overflow.

### 9.6 Performance Dropdown Persistence
In TeacherClasses, the performance dropdown does an optimistic update to `classes` state (lines 1000–1010). This is unrelated to the report panel and continues to work independently.

---

## 10. Verification Checklist

After implementation, verify:

- [ ] Clicking "Report" button on a student card in TeacherClasses opens the slide-out panel
- [ ] Panel shows correct student name, email, and "student since" date
- [ ] All 3 tabs (Classes, Mistakes, Performance) render correctly
- [ ] Date preset filters work (1M, 2M, 6M, All)
- [ ] Custom date range filters work
- [ ] Surah from/to filters work
- [ ] Juz filter works (overrides surah, mutual exclusion)
- [ ] "Clear all filters" resets everything
- [ ] Summary strip numbers update when filters change
- [ ] Classes tab: rows are expandable, show mistakes and notes
- [ ] Mistakes tab: bar chart sorted by count, repeated mistakes list
- [ ] Performance tab: bar chart renders, streak/trend stats show
- [ ] Export button opens ExportModal
- [ ] Export to PDF/CSV/Word works with active filters
- [ ] Clicking backdrop closes the panel
- [ ] "View Report" from TeacherDashboard navigates to TeacherClasses and opens panel
- [ ] Standalone route `/teacher/students/:id/report` is removed
- [ ] No TypeScript errors, no console warnings
- [ ] Dark mode and light mode both render correctly
- [ ] Panel scrolls independently from background
- [ ] Background scroll is locked when panel is open
- [ ] Switching students (clicking Report on different student while panel is open) works via key-based remount
