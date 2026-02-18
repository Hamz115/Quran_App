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

Created comprehensive planning document:
- **`docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md`**

Contains:
- Current vs target architecture diagrams
- Exact code changes for QPC font bundling
- New Dart models (mirroring web's report-types.ts)
- New widget tree (6 report widgets + helpers)
- Supabase queries (mirroring web's getStudentReport)
- Phased implementation roadmap with checkboxes (A through F)
- Complete file change summary (6 modified + 12 new)

## Files Changed

| File | Action |
|---|---|
| `docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md` | Created — comprehensive planning doc |
| `docs/Logs/2026-02-18-003-flutter-local-quran-and-classes-revamp.md` | Updated — this session log |

## Notes

- QPC font rendering in Flutter is already working (Phase 13.4) — only the font *source* changes (HTTP → assets)
- `quran.db` and page JSONs were already bundled — no changes needed there
- The `teacherStudentsProvider` has a `if (!kIsWeb) return []` guard that must be removed for the classes revamp to work
- The Supabase queries for the report are identical on web and mobile — same RLS policies apply
- The classes revamp creates 6 new report widgets mirroring the web's component structure
- App size will increase by ~92MB from bundled fonts — this is the expected trade-off for offline Quran rendering
