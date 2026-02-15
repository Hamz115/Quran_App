# Student Reports — Technical Implementation

**Date:** 15 February 2026
**Status:** Complete (Redesigned to Tab-Based Dashboard)

## Overview

Student Reports allow teachers to view a comprehensive progress report for any individual student. The report is a tab-based dashboard with 3 filter types, 3 content tabs, per-class mistake breakdowns, and configurable export.

## Architecture

```
TeacherDashboard                          StudentReport Page (Tab-Based Dashboard)
  "View Report" button                      ┌────────────────────────────────────┐
  ──► /teacher/students/:id/report ──►      │ TopBar: Name, Email, Export btn    │
                                            │ FilterBar: Date|Surah|Juz|Clear    │
getStudentReport(studentId)                 │ SummaryStrip: 5 stats              │
  ├── profiles (student info)               │ TabNav: Classes|Mistakes|Perf      │
  ├── class_students → classes → assign.    │ ┌─ Classes Tab ─────────────────┐  │
  └── mistakes + mistake_occurrences        │ │ Table with expandable rows    │  │
                                            │ │ Per-class mistakes + notes    │  │
Client-side filtering (useMemo)             │ ├─ Mistakes Tab ────────────────┤  │
  ├── Date range (presets + custom)         │ │ Bar chart + Ranked list       │  │
  ├── Surah range (From/To)                │ ├─ Performance Tab ─────────────┤  │
  └── Juz (1-30, overrides surah)          │ │ Chart + Stat cards            │  │
                                            │ └─────────────────────────────────┘│
Export: ExportConfig → PDF/CSV/Word         │ ExportModal: Format + Sections     │
                                            └────────────────────────────────────┘
```

**Data flow:** All report data is fetched from Supabase in a single call. Filtering is 100% client-side via `useMemo` — changing filters never re-queries the API.

## Data Model

### TypeScript Interfaces (`report-types.ts`)

```typescript
interface StudentReport {
  student: { id, name, email, student_id, added_at }
  summary: { total_classes, total_mistakes, unique_mistakes, repeated_mistakes, avg_performance }
  classes: StudentClass[]
  mistakes_by_surah: MistakeBySurah[]
  repeated_mistakes: RepeatedMistake[]
  performance_trend: PerformanceDataPoint[]
}

interface StudentClass {
  id, date, day, notes?, performance?
  assignments: ClassAssignment[]  // { type, start_surah, end_surah, start_ayah?, end_ayah? }
  mistakes: ClassMistake[]        // Mistakes linked to THIS class via mistake_occurrences
  mistake_count: number           // Count of mistakes in this class
}

interface ClassMistake {
  id, surah_number, surah_name, ayah_number, word_text, error_count
}

interface ReportFilters {
  dateFrom, dateTo, datePreset: '1m'|'2m'|'6m'|'all'
  surahFrom, surahTo: number | null
  juz: number | null
}

interface ExportConfig {
  format: 'pdf' | 'csv' | 'word'
  sections: { summary, classDetails, mistakesBySurah, repeatedMistakes, performanceChart, teacherNotes }
  filters: ReportFilters
  filteredReport: StudentReport
}

interface PerformanceStats {
  currentStreak, bestStreak, bestStreakRange
  mistakesPerClass, mistakeSparkline: number[]
  trend: 'improving' | 'declining' | 'stable'
}
```

## Quran Utilities (`quran-utils.ts`)

Centralized module for Quran-related data and helpers:

- **`surahNames`**: `Record<number, string>` mapping all 114 surahs to English transliteration names. Used across multiple files (previously duplicated in 4+ places).
- **`JUZ_BOUNDARIES`**: Array of 30 entries with start/end surah:ayah for each Juz.
- **`getSurahRangeForJuz(juz)`**: Returns `{ startSurah, endSurah }` for a given Juz number.
- **`getJuzForSurah(surah)`**: Returns which Juz a surah primarily belongs to.
- **`isSurahInJuz(surah, juz)`**: Checks if a surah falls within a Juz range.

## API — `getStudentReport(studentId)`

Located in `supabase-api.ts`. Fetches all data from Supabase and computes stats client-side.

### Supabase Queries

| Query | Table | Fields | Filter |
|-------|-------|--------|--------|
| Student profile | `profiles` | `*` | `id = studentId` |
| Classes attended | `class_students` | `class_id, classes(id, date, day, notes, performance, teacher_id, is_published, assignments(*))` | `student_id = studentId` |
| Mistakes + occurrences | `mistakes` | `*, mistake_occurrences(id, class_id, occurred_at)` | `student_id = studentId` |

### Client-Side Computations

1. **Per-class mistake mapping**: Loop through mistake occurrences, group by `class_id`, enrich each class with its `mistakes[]` and `mistake_count`
2. **Summary stats**: Count total/unique/repeated mistakes, total classes
3. **Avg performance**: Map ratings to numbers (Excellent=4, Very Good=3, Good=2, Needs Work=1), average, map back to label
4. **Mistakes by surah**: Group into `Map<surah_number, { total, unique Set }>`, convert to sorted array
5. **Repeated mistakes**: Filter `error_count > 1`, sort by error_count descending
6. **Performance trend**: Extract `{ date, performance }` from classes with ratings, sort by date ascending

### Surah Names

Imported from `quran-utils.ts` (centralized, no longer duplicated inline).

## Frontend — `StudentReport.tsx`

Route: `/teacher/students/:studentId/report`

### State Management

- `report` / `loading` / `error` — data fetch
- `activeTab`: `'classes' | 'mistakes' | 'performance'`
- `filters: ReportFilters` — drives client-side filtering
- `showExportModal: boolean`
- `expandedClassId: string | null` — for class row expansion

### Client-Side Filtering (useMemo)

`filteredReport` is derived from raw `report` + `filters`:
- Date filter: filter classes and performance trend by date range
- Surah filter: filter mistakes by surah range, filter classes by assignment overlap
- Juz filter: converts to surah range via `getSurahRangeForJuz()`, then applies surah filter
- Summary stats are recomputed from filtered data
- Per-class mistakes are also filtered by surah range

### Page Layout (top to bottom)

| Section | Description |
|---------|-------------|
| **TopBar** | Back button, student name/email/since date, Export button |
| **FilterBar** | Date presets (1m/2m/6m/All) + date pickers, Surah From/To dropdowns, Juz dropdown, Clear all |
| **SummaryStrip** | 5 stats: Classes (cyan), Total Mistakes, Unique, Repeated (red), Avg Performance (green) |
| **TabNav** | Classes (count badge), Mistakes (count badge), Performance |

### Tab Content

**Classes Tab:**
- Table with columns: Expand arrow, Date+Day, Portions (HIFZ/SABQI/MANZIL tags), Mistake count (color-coded circle), Performance badge, Notes preview
- Expandable detail row: mistake chips (Arabic word + surah:ayah + count) + full teacher notes
- Sorted by date descending

**Mistakes Tab:**
- Two-panel grid layout
- Left panel: "Mistakes by Surah" — horizontal bar chart with surah name, bar width proportional to max, count + unique count
- Right panel: "Repeated Mistakes" — ranked list with rank number, Arabic word, reference, times missed

**Performance Tab:**
- Left: CSS bar chart with fixed pixel heights (Excellent=170px, Very Good=120px, Good=70px, Needs Work=30px), Y-axis labels, X-axis date labels, legend
- Right: Stat cards — Current Streak, Best Streak (with date range), Mistakes/Class (with sparkline), Trend (improving/declining/stable)

### Dark/Light Mode

All elements use conditional Tailwind classes via `useTheme()`:
- Dark: `bg-slate-900/800`, `border-slate-700`, `text-slate-100/400/500`
- Light: `bg-slate-50/white`, `border-slate-200`, `text-slate-800/500/400`

### Navigation

- Back button uses `navigate(-1)` (browser history back)
- Accessed from Teacher Dashboard via "View Report" button
- URL param: `studentId` (Supabase UUID)

## Export — `report-export.ts`

Three client-side export functions, all accepting `ExportConfig`:

### `exportToPDF(config: ExportConfig)`

- Uses **jsPDF** with **jspdf-autotable** plugin
- Filter summary header at top
- Conditional sections based on `config.sections` toggles
- Sections: Summary Stats, Class Details table, Mistakes by Surah, Repeated Mistakes, Performance History, Teacher Notes
- Auto page breaks when content exceeds page height
- Saves as `{StudentName}_Report.pdf`

### `exportToCSV(config: ExportConfig)`

- CSV string with sections separated by blank lines
- Filter summary row
- Conditional sections based on `config.sections` toggles
- Uses `Blob` + `file-saver` for download
- Saves as `{StudentName}_Report.csv`

### `exportToWord(config: ExportConfig)`

- Uses **docx** library to build a Word document
- Filter summary in italic text
- Conditional sections based on `config.sections` toggles
- Table headers use colored shading (cyan, red, green, grey)
- Saves as `{StudentName}_Report.docx`

### Export Modal

The `ExportModal` component provides:
- Filter summary display (shows active filters + count of classes/mistakes in range)
- Format selector: PDF, CSV, Word (with icons)
- Section toggles (6 switches): Summary, Class Details, Mistakes by Surah, Repeated Mistakes, Performance Chart, Teacher Notes
- Default: first 4 ON, last 2 OFF

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `jspdf` | ^2.5.2 | PDF generation |
| `jspdf-autotable` | ^3.8.4 | PDF table formatting |
| `docx` | ^9.x | Word document generation |
| `file-saver` | ^2.0.5 | Browser file download |
| `@types/file-saver` | (dev) | TypeScript types for file-saver |

## Backend Endpoint (Legacy)

A FastAPI endpoint also exists at `GET /api/students/{student_id}/report` in `quran_backend/main.py`, but the frontend fetches directly from Supabase for reliability (local SQLite may not have synced data).

## Files

| File | Purpose |
|------|---------|
| `quran_frontend/src/lib/quran-utils.ts` | Centralized surahNames, Juz boundaries, helper functions |
| `quran_frontend/src/lib/report-types.ts` | TypeScript interfaces (StudentReport, ReportFilters, ExportConfig, etc.) |
| `quran_frontend/src/lib/report-export.ts` | PDF, CSV, Word export utilities (accept ExportConfig) |
| `quran_frontend/src/lib/supabase-api.ts` | `getStudentReport()` with mistake_occurrences join |
| `quran_frontend/src/pages/StudentReport.tsx` | Tab-based dashboard with filters, 3 tabs, export modal |
| `quran_frontend/src/App.tsx` | Route: `/teacher/students/:studentId/report` |
| `quran_frontend/src/pages/TeacherDashboard.tsx` | "View Report" button on student cards |
| `quran_backend/main.py` | Legacy backend endpoint (not used by frontend) |
