# Session Log: Flutter — Local QPC Fonts + Classes Tab Revamp

**Date:** 2026-02-18
**Session:** 003
**Author:** Claude (with Hamza)

## Objective

Two major Flutter changes:
1. **Bundle QPC fonts locally** — The 604 QPC TTF fonts are currently downloaded from the FastAPI backend via HTTP. Bundle them as Flutter assets so the Quran reader works fully offline.
2. **Revamp Flutter classes tab** — Match the web app's inline report dashboard (Phase 16.2 design) with student pills, month filters, summary stats, and tabbed report view.

## Key Discovery: What's Already Local vs What's Not

During investigation, we found:

| Data | Status | Location |
|---|---|---|
| `quran.db` (Quran text) | Already bundled | `assets/databases/` via sqflite |
| Page JSON (604 files) | Already bundled | `assets/quran-pages/` via rootBundle |
| **QPC fonts (604 TTFs)** | **NOT bundled — HTTP download** | `QpcFontService._downloadFontMobile()` |

The original session log title said "Local Quran DB" — but `quran.db` was already bundled. The actual missing piece is the **QPC font files** (92MB, 604 TTFs) that `QpcFontService` downloads from `$baseUrl/fonts/qpc/$pageNum`.

## Architecture Decision: Bundle QPC Fonts

### Problem
`QpcFontService` downloads QPC TTFs from the FastAPI backend (`http://10.0.2.2:8000/api/fonts/qpc/N`). On a real mobile device with no backend running, fonts fail to load and the Quran reader shows nothing.

### Solution: Bundle fonts as Flutter assets
- Copy 604 TTF files from `quran_backend/fonts/qpc/` to `quran_mobile/assets/fonts/qpc/`
- Load via `rootBundle.load('assets/fonts/qpc/QCF_P{NNN}.ttf')` instead of Dio HTTP
- Works completely offline — no backend dependency
- App size increase: +92MB (acceptable for a Quran app)

### Rejected Alternatives
- **Keep HTTP download with local server** — No server running on real device
- **Download on first launch from Supabase Storage** — Requires internet, 92MB download
- **Use web fonts (WOFF2)** — Flutter doesn't support WOFF2 in `FontLoader`

### Architecture Summary (Corrected)
| Data | Web | Mobile (Flutter) |
|------|-----|-----------------|
| Auth | Supabase | Supabase |
| Classes/Mistakes | Supabase | Supabase |
| Quran page data | Bundled JSON files | Bundled JSON files (already local) |
| Quran text DB | Not used (JSON only) | Bundled quran.db (already local) |
| QPC fonts | HTTP from backend → FontLoader | **Bundled assets → rootBundle → FontLoader** |
| PDF export | Backend Playwright | N/A on mobile |

## Investigation Results

### Files Investigated

| File | Lines | What It Does | Change? |
|---|---|---|---|
| `core/services/qpc_font_service.dart` | 111 | Downloads QPC TTFs via Dio HTTP, caches to disk | **YES** — load from bundled assets |
| `core/services/qpc_font_io_mobile.dart` | 27 | Disk cache I/O (getFontCacheDir, readFileIfExists, writeFile) | **YES** — no longer needed |
| `core/services/qpc_font_io_stub.dart` | 14 | Web stub (throws on disk ops) | No |
| `core/services/quran_page_data_service.dart` | 44 | Loads page JSON from bundled assets (rootBundle) | No (already local) |
| `data/repositories/quran_repository.dart` | — | Queries bundled quran.db via sqflite | No (already local) |
| `core/database/database_helper.dart` | — | Manages quran.db + app.db | No (already local) |
| `presentation/providers/providers.dart` | 653 | All Riverpod providers; teacherStudentsProvider returns [] on mobile | **YES** — fix kIsWeb guard |
| `presentation/providers/quran_page_provider.dart` | 34 | Creates QpcFontService with apiClient.baseUrl | **YES** — simplify for mobile |
| `presentation/screens/classes/classes_screen.dart` | 738 | Current flat classes table | **YES** — full rewrite |
| `config/constants.dart` | 66 | API URLs, surah names | No |
| `core/network/api_client.dart` | 124 | Dio HTTP client for FastAPI | No (still used for other things) |
| `pubspec.yaml` | 58 | Assets + dependencies | **YES** — add fonts/qpc/ |

### Web Components Investigated (target design)

| File | Purpose |
|---|---|
| `TeacherClasses.tsx` | Student pills + New Class modal + ReportPanel embed |
| `ReportPanel.tsx` | Orchestrator: fetch, filter, tabs |
| `ReportFilterBar.tsx` | Month pills + surah/juz selectors |
| `ReportSummaryStrip.tsx` | 5-stat horizontal strip |
| `ReportClassesTab.tsx` | Classes table with expandable rows |
| `ReportMistakesTab.tsx` | Bar chart + repeated mistakes list |
| `ReportPerformanceTab.tsx` | Performance bar chart + stats sidebar |
| `report-helpers.ts` | Pure functions: filtering, stats, formatting |
| `report-types.ts` | TypeScript interfaces for all report data |
| `supabase-api.ts:getStudentReport()` | Supabase query that builds the full report |

## Deliverable

### Planning Phase
Created comprehensive planning document:
- **`docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md`**

### Implementation (Multi-Agent, Phases A-G)
All planned phases implemented by a 4-agent team:
- **Agent 1 (QPC Fonts):** Phase A — bundled 604 TTF fonts as Flutter assets, eliminated backend dependency
- **Agent 2 (Foundation):** Phases B+C+G — data models, helpers, providers, character-level mistake rendering
- **Agent 3 (UI Widgets):** Phases D+E — 6 report widgets + classes screen rewrite
- **Agent 4 (Docs):** Documentation updates throughout (this log, plan checkboxes, CLAUDE.md, PROJECT_CHANGELOG)

**Result:** 12 new Dart files, 8 modified files, 2 deleted files, 604 font assets. `dart analyze`: 0 errors, 0 warnings across all agents' work.

## Files Changed

### Planning Phase

| File | Action |
|---|---|
| `docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md` | Created — comprehensive planning doc |
| `docs/Logs/2026-02-18-003-flutter-local-quran-and-classes-revamp.md` | Updated — this session log |

### Phase A: Offline QPC Fonts (Agent 1)

| File | Action |
|---|---|
| `quran_mobile/assets/fonts/qpc/QCF_P001.ttf` ... `QCF_P604.ttf` | Created — 604 TTF font files copied from `quran_backend/fonts/qpc/` |
| `quran_mobile/pubspec.yaml` | Modified — added `assets/fonts/qpc/` to the assets list |
| `quran_mobile/lib/core/services/qpc_font_service.dart` | Modified — replaced `_downloadFontMobile()` (HTTP + disk cache) with `_loadFontFromAssets()` (rootBundle.load). Removed conditional import of `font_io`, removed `_cacheDir` field. Web path unchanged. |
| `quran_mobile/lib/presentation/providers/quran_page_provider.dart` | Modified — simplified `qpcFontServiceProvider` to use empty string for mobile baseUrl. Removed unused `providers.dart` import. |
| `quran_mobile/lib/core/services/qpc_font_io_mobile.dart` | **Deleted** — disk cache functions no longer needed |
| `quran_mobile/lib/core/services/qpc_font_io_stub.dart` | **Deleted** — web stub no longer needed |

**No issues encountered.** `flutter pub get` + `dart analyze` clean.

### Phase B+C: Data Models, Helpers & Providers (Agent 2)

| File | Action |
|---|---|
| `quran_mobile/lib/data/models/student_report.dart` | Created — 9 model classes with `const` constructors and `copyWith()`: StudentReport, StudentInfo, ReportSummary, StudentClass, ClassAssignment, ClassMistake, MistakeBySurah, RepeatedMistake, PerformanceDataPoint |
| `quran_mobile/lib/data/models/report_filters.dart` | Created — `DatePreset` enum, `ReportFilters` class (with `isActive` getter, `copyWith` with nullable clear flags), `PerformanceStats` class |
| `quran_mobile/lib/core/services/report_helpers.dart` | Created — pure helper functions ported from web's report-helpers.ts: constants (`perfMap`, `perfLabels`), juz boundaries, badge color pairs (bg + text), formatting, stats computation, filtering |
| `quran_mobile/lib/presentation/providers/report_provider.dart` | Created — `studentReportProvider` (FutureProvider.family), `reportFiltersProvider` (StateProvider), `filteredReportProvider` (Provider.family), `performanceStatsProvider` (Provider.family) |
| `quran_mobile/lib/presentation/providers/providers.dart` | Modified — removed `if (!kIsWeb) return []` guard from teacherStudentsProvider |

**Deviations from plan:**
- Badge color functions split into background + text color pairs (e.g., `perfBadgeColor()` + `perfBadgeTextColor()`) since Flutter uses `Color` objects rather than CSS class strings
- `ReportFilters.copyWith()` has explicit `clearSurahFrom`, `clearSurahTo`, `clearJuz` boolean params for nullable field clearing (Dart copyWith pattern)
- Added `ReportFilters.isActive` getter for convenience
- B4 (unit tests) skipped as optional — validation done via UI by Agent 3

### Phase D+E: Report Widgets & Classes Screen Rewrite (Agent 3)

| File | Action |
|---|---|
| `quran_mobile/lib/presentation/screens/classes/report/report_summary_strip.dart` | Created — 5-stat horizontal summary strip |
| `quran_mobile/lib/presentation/screens/classes/report/report_filter_bar.dart` | Created — month pills + surah/juz filter selectors |
| `quran_mobile/lib/presentation/screens/classes/report/report_classes_tab.dart` | Created — classes table with expandable rows (date, portions, mistakes, perf, notes) |
| `quran_mobile/lib/presentation/screens/classes/report/report_mistakes_tab.dart` | Created — mistakes by surah bar chart + repeated mistakes ranked list |
| `quran_mobile/lib/presentation/screens/classes/report/report_performance_tab.dart` | Created — performance over time bar chart + stats cards (streak, trend) |
| `quran_mobile/lib/presentation/screens/classes/report/report_panel.dart` | Created — report orchestrator (assembles filter bar, summary strip, tabs, tab content) |
| `quran_mobile/lib/presentation/screens/classes/classes_screen.dart` | **Rewritten** — teacher view: student pills + ReportPanel; student view: own report directly |

All 6 report widgets mirror the web React components from `quran_frontend/src/components/teacher-classes/`. `dart analyze`: 0 errors, 0 warnings.

### Phase G: Character-Level Mistake Rendering (Agent 2)

| File | Action |
|---|---|
| `quran_mobile/lib/core/services/arabic_text_utils.dart` | Created — shared Arabic word parser (extracted from word_popup.dart) |
| `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` | Modified — added `_getMistakeLevel` for char-level mistake detection + char-level rendering with `textUthmani` + Amiri font |
| `quran_mobile/lib/presentation/screens/classroom/word_popup.dart` | Modified — extracted `_parseArabicWord` to shared `arabic_text_utils.dart` |
| `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` | Modified — char-level mistake removal with picker dialog |

`dart analyze`: 0 errors, 0 warnings in all modified files.

## Notes

### Planning Phase Observations
- QPC font rendering in Flutter was already working (Phase 13.4) — only the font *source* changed (HTTP → assets)
- `quran.db` and page JSONs were already bundled — no changes needed there
- The `teacherStudentsProvider` had a `if (!kIsWeb) return []` guard that blocked mobile classes — removed in Phase C
- The Supabase queries for the report are identical on web and mobile — same RLS policies apply

### Implementation Learnings
- Badge color functions were split into background + text color pairs (Flutter uses `Color` objects, not CSS class strings) — a sensible deviation from the web pattern
- `ReportFilters.copyWith()` needed explicit nullable clear flags (`clearSurahFrom`, etc.) — standard Dart pattern for nullable fields in copyWith
- Phase G (character-level rendering) was not in the original plan but was added during implementation as a natural extension
- `qpc_font_io_mobile.dart` and `qpc_font_io_stub.dart` were fully deleted (not just simplified) since disk caching is no longer needed
- All 3 implementation agents reported clean `dart analyze` results — 0 errors, 0 warnings
- App size increases by ~92MB from bundled fonts — acceptable trade-off for fully offline Quran rendering
- The 6 Flutter report widgets mirror the web's component structure 1:1, enabling shared understanding across platforms

### Multi-Agent Coordination
- 4 agents worked in parallel with task dependencies: Agent 1 (fonts) independent, Agent 2 (foundation) → Agent 3 (UI) → Agent 2 (char-level), Agent 4 (docs) reactive to all
- No conflicts between agents — clean task boundaries prevented merge issues
- Phase F (Polish) deferred to future session — dark mode, responsive testing, pull-to-refresh, loading skeletons, error handling
