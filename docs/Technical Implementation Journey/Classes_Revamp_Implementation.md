# Classes Revamp — Implementation Record

> **Plan reference**: `Classes_Revamp_Plan.md`
> **Agent guide**: `Classes_Revamp_Agents.md`
> **Date**: 2026-02-16

---

## 1. What Was Built

The standalone `StudentReport` page was decomposed into 9 reusable component files under `src/components/teacher-classes/`. The report content now **replaces** the Classes page content directly — when a teacher navigates to Classes, they see student pills at the top and the full report (filters, summary, tabs) below. No separate route, no overlay panel — the Classes page **is** the report.

### Component Architecture

```
src/components/teacher-classes/
├── index.ts                    # Barrel exports (all components + helpers)
├── report-helpers.ts           # Pure functions: constants, badge classes, formatters, filters, stats
├── ReportPanel.tsx             # Inline report view — all state, data fetch, tab rendering
├── ReportFilterBar.tsx         # Month pills (last 3 + older dropdown), surah/juz selectors, clear-all
├── ReportSummaryStrip.tsx      # 5-stat horizontal summary bar
├── ReportClassesTab.tsx        # Clickable classes table with expandable ClassRow
├── ReportMistakesTab.tsx       # Mistakes by surah + repeated mistakes
├── ReportPerformanceTab.tsx    # Bar chart + stats sidebar
└── ExportModal.tsx             # Format picker + section toggles for PDF/CSV/Word
```

### Data Flow

```
TeacherClasses
  ├─ Student pills (selectedStudentFilter → auto-selects first student)
  ├─ "New Class" button → modal (unchanged)
  │
  └─ <ReportPanel key={studentId} studentId={studentId}>
       ├─ useEffect → getStudentReport(studentId) → setReport
       ├─ useMemo → applyReportFilters(report, filters) → filteredReport
       ├─ useMemo → computePerformanceStats(filteredReport.classes) → stats
       ├─ Student name + "Student since" subtitle + Export button
       ├─ <ReportFilterBar />  (month pills + surah/juz)
       ├─ <ReportSummaryStrip summary={filteredReport.summary} />
       ├─ Tab nav: Classes | Mistakes | Performance
       ├─ <ReportClassesTab /> | <ReportMistakesTab /> | <ReportPerformanceTab />
       └─ <ExportModal /> (conditional)
```

---

## 2. Files Created

| File | Lines | Description |
|------|-------|-------------|
| `report-helpers.ts` | ~200 | Pure TS: `PERF_MAP`, `PERF_LABELS`, badge/formatter functions, `getDatePresetRange`, `computePerformanceStats`, `applyReportFilters` |
| `ReportFilterBar.tsx` | ~185 | Month pill buttons (last 3 months + "All" + older dropdown), surah from/to dropdowns, juz dropdown, clear-all |
| `ReportSummaryStrip.tsx` | ~50 | 5-cell strip: Classes, Total Mistakes, Unique, Repeated, Avg Performance |
| `ReportClassesTab.tsx` | ~185 | Clickable classes table + ClassRow (expandable, navigates to class on click) |
| `ReportMistakesTab.tsx` | ~100 | Two-column: mistakes by surah (bar chart) + repeated mistakes (numbered list) |
| `ReportPerformanceTab.tsx` | ~150 | Bar chart (left) + stats sidebar cards (streak, trend, mistakes/class) |
| `ExportModal.tsx` | ~180 | Format selection (PDF/CSV/Word) + section toggles + export execution |
| `ReportPanel.tsx` | ~200 | Inline report component — all state management, loading/error states, no overlay |
| `index.ts` | 8 | Barrel re-exports for all components + helpers |

## 3. Files Modified

| File | Change |
|------|--------|
| `src/api.ts` | Added `getStudentReport` to Supabase re-exports |
| `src/pages/TeacherClasses.tsx` | Major restructure: removed class cards/month tabs, added student pills + inline ReportPanel as primary content. Removed ~400 lines of class card rendering, month filtering, performance dropdowns. |
| `src/App.tsx` | Removed `StudentReport` import and `/teacher/students/:studentId/report` route |
| `src/pages/TeacherDashboard.tsx` | Changed "View Report" navigate from `/teacher/students/${id}/report` to `/teacher/classes?report=${id}` |

## 4. Files Deleted

| File | Reason |
|------|--------|
| `src/pages/StudentReport.tsx` | Fully replaced by the component system — all logic extracted into `report-helpers.ts` and the 7 component files |

---

## 5. Architecture Evolution

### Phase 1 (Initial Plan): Slide-Out Panel
The original plan called for the report to appear as a fixed-position overlay panel sliding in from the right, with a backdrop dimming the TeacherClasses content behind it.

### Phase 2 (First Correction): View Replacement
The slide-out panel was replaced with a conditional render — when a student was selected via a "Report" button, the entire classes content was replaced by the report content. Still had a "Back to Classes" button.

### Phase 3 (Final Architecture): Classes Page IS the Report
The Classes page was fully restructured so the report IS the primary content:
- Student pills at the top select which student's data to view (auto-selects first student)
- The full report renders directly below (filters, summary, tabs)
- No "View Report" button, no "Back to Classes" — report is always visible
- Class management (New Class button + modal) remains accessible in the header
- Clicking a class row in the Classes tab navigates to the class session
- Month pills replaced date presets for clearer time filtering

---

## 6. Architecture Decisions

### Inline Report, Not Overlay
The report renders as normal page content within TeacherClasses, not as a fixed-position overlay. This means no body scroll lock, no backdrop, no z-index layering — just regular content flow.

### Student Pills as Primary Navigation
The student pills determine which student's report is shown. Auto-selects first student on page load. No "All" option since the report requires a specific student ID.

### Key-Based Remounting
Using `key={selectedStudentFilter}` on `<ReportPanel>` forces a complete unmount/remount when switching between students. This is simpler and more reliable than managing internal state resets.

### Month Pills Replace Date Presets
The date filter was changed from abstract presets (1m/2m/6m/All) + date pickers to concrete month pills (February 2026, January 2026, December 2025 + "Older months..." dropdown). This is more intuitive for teachers who think in terms of school months.

### Clickable Class Rows
Each row in the Classes tab navigates to `/teacher/classes/{classId}` on click, with the expand/collapse toggle using `stopPropagation()` to avoid conflicts.

### Query Param Integration
The `?report=ID` pattern reuses TeacherClasses' existing `searchParams` infrastructure (already used for `?new=1` and `?student=ID`). The param sets `selectedStudentFilter` and is cleared immediately.

---

## 7. Edge Cases Handled

- **Search param conflicts**: `?report=` is checked before `?new=1` to prevent both firing
- **Race conditions**: ReportPanel uses `isMounted` pattern for async fetch cleanup
- **Auto-select first student**: useEffect watches `students` array and selects first when loaded
- **Dark/light mode**: All components receive `darkMode` prop from ThemeContext
- **Month detection**: Filter bar detects which month pill is active by comparing `dateFrom`/`dateTo` to month boundaries
- **Expand vs navigate**: Expand button uses `stopPropagation()` so clicking it doesn't navigate to the class

---

## 8. PDF Export — Backend Playwright Architecture

### Problem
The initial PDF export used `html2pdf.js` on the client, which goes HTML → html2canvas (raster screenshot) → embed image in PDF. This produces blurry output: circles look pixelated, gradients have banding, and text is not selectable.

### Solution
Moved PDF generation to a FastAPI backend endpoint using Playwright + Microsoft Edge. Playwright's `page.pdf()` produces native vector PDFs via Chrome DevTools Protocol — text is selectable, CSS gradients render perfectly, and circles are crisp at any zoom level.

### Endpoint API Contract

```
POST /api/export/pdf
Content-Type: application/json

{
  "html": "<full HTML document string>",
  "student_name": "Student Name",
  "filename": "Student_Name_Report.pdf"
}

Response: application/pdf (binary)
Content-Disposition: attachment; filename="Student_Name_Report.pdf"
```

Validation: rejects empty HTML or payloads > 5MB. Returns 500 with detail message on Playwright errors.

### Running Header/Footer

Playwright's `display_header_footer` option renders a header and footer on every printed page (outside the page content area, within the margin space).

**Header** (top 25mm margin):
```
Student Progress Report                          Student Name
```

**Footer** (bottom 20mm margin):
```
QuranTrack                                    Page 1 of 3
```

The page number uses Playwright's built-in `.pageNumber` and `.totalPages` CSS classes.

### Frontend Architecture

```
buildReportHTML(config)          — shared HTML builder (returns { html, filename })
  ├── exportToPDFBackend(config) — POSTs HTML to backend, returns Blob
  └── exportToPDF(config)        — client-side html2pdf.js fallback
```

The `buildReportHTML()` function is the single source of truth for the report HTML/CSS. It wraps content in a proper `<!DOCTYPE html>` document with print-specific CSS (`print-color-adjust: exact`, `page-break-inside: avoid`). The body HTML omits the footer div — Playwright's running footer replaces it on every page.

### ExportModal States

The modal has three views controlled by `exportState`:
- **idle**: Format selector + section toggles (existing UI)
- **loading**: Centered spinner, backdrop click disabled, X button disabled
- **error**: Error icon + message + "Try Again" button
