# Claude Code Instructions for QuranTrack

## Project Overview

QuranTrack is a Quran memorization and recitation tracking app for teachers and students. It uses QPC (Quran Printing Complex) fonts to render Quran pages exactly like the printed Madani Mushaf. Teachers create classes, assign portions (Hifz/Sabqi/Manzil), and track character-level mistakes. Students view their classes, progress, and read the Quran.

## Tech Stack

| Layer | Technology | Location |
|-------|-----------|----------|
| **Frontend** | React 19 + TypeScript + Tailwind CSS + Vite | `quran_frontend/` |
| **Backend** | FastAPI (Python) + SQLite | `quran_backend/` |
| **Mobile** | Flutter (Dart) + Riverpod | `quran_mobile/` |
| **Auth & Cloud DB** | Supabase (PostgreSQL + JWT + RLS) | Cloud |
| **Quran Rendering** | QPC fonts (604 page-specific font files) | `public/fonts/qpc/` |

## Full Codebase Map

```
Quran_App/
├── CLAUDE.md                           # AI agent instructions (this file)
├── AGENTS.md                           # AI agent instructions (same as CLAUDE.md)
├── PROJECT_MAP.md / .html              # Generated codebase map & interactive viewer
│
├── quran_backend/                      # ── FastAPI Backend ──────────────────
│   ├── main.py                         # ALL API endpoints (auth, classes, mistakes, quran, sync, PDF export)
│   ├── requirements.txt                # Python dependencies (fastapi, playwright, etc.)
│   ├── auth/                           # Auth module
│   │   ├── config.py                   #   JWT settings
│   │   ├── models.py                   #   Pydantic models (User, Token)
│   │   ├── routes.py                   #   Auth endpoints (login, signup, password reset)
│   │   ├── dependencies.py             #   JWT dependency injection
│   │   └── utils.py                    #   Password hashing, JWT helpers
│   ├── sync_service.py                 # Supabase push/pull sync service
│   ├── scripts/                        # Utility scripts
│   │   ├── nuke_all_data.py            #   Wipe ALL data (Supabase + local)
│   │   ├── create_test_users.py        #   Creates demo accounts
│   │   ├── clear_mistakes.py           #   Clears all mistakes (testing)
│   │   ├── seed_database.py            #   Database seeding (Python)
│   │   └── seed.js                     #   Database seeding (JS)
│   ├── app.db                          # SQLite: users, classes, mistakes (read-write)
│   ├── quran.db                        # SQLite: Quran text data (READ-ONLY)
│   ├── quran-pages/                    # 604 JSON files with QPC word data per page
│   └── Backups/                        # Database backup directory
│
├── quran_frontend/                     # ── React Web Frontend ───────────────
│   ├── src/
│   │   ├── App.tsx                     # Route config (public, protected, role-based)
│   │   ├── api.ts                      # Supabase re-exports + legacy FastAPI fallback
│   │   │
│   │   ├── pages/
│   │   │   ├── Login.tsx               # Email login
│   │   │   ├── Signup.tsx              # Registration with role selection
│   │   │   ├── ForgotPassword.tsx      # Password reset request
│   │   │   ├── ResetPassword.tsx       # Password reset confirmation (via email link)
│   │   │   ├── Dashboard.tsx           # Role-based redirect hub
│   │   │   ├── TeacherDashboard.tsx    # Teacher home (stats, shortcuts)
│   │   │   ├── StudentDashboard.tsx    # Student home (stats, shortcuts)
│   │   │   ├── TeacherClasses.tsx      # Teacher: create/manage classes, notes, performance, "By Juz" selection
│   │   │   ├── StudentClasses.tsx      # Student: view joined classes (read-only)
│   │   │   ├── Classes.tsx             # Legacy classes page
│   │   │   ├── Classroom.tsx           # Active class session (QPC reader + mistakes + portion edit/delete)
│   │   │   ├── QuranReader.tsx         # Standalone Quran reader (read-only)
│   │   │   └── Settings.tsx            # Profile update, password change
│   │   │
│   │   ├── components/
│   │   │   ├── Layout.tsx              # Main layout wrapper with navbar
│   │   │   ├── ProtectedRoute.tsx      # Auth route guard
│   │   │   ├── FittedLine.tsx          # Quran line width-fitting utility
│   │   │   └── teacher-classes/        # Report components for TeacherClasses page
│   │   │       ├── index.ts            #   Barrel exports
│   │   │       ├── report-helpers.ts   #   Pure functions: constants, formatters, filters, stats
│   │   │       ├── ReportPanel.tsx     #   Main report orchestrator (state, data fetch, tabs)
│   │   │       ├── ReportFilterBar.tsx #   Month pills, surah/juz selectors, clear-all
│   │   │       ├── ReportSummaryStrip.tsx # 5-stat horizontal summary bar
│   │   │       ├── ReportClassesTab.tsx   # Classes table with expandable rows
│   │   │       ├── ReportMistakesTab.tsx  # Mistakes by surah + repeated mistakes
│   │   │       ├── ReportPerformanceTab.tsx # Bar chart + stats sidebar
│   │   │       └── ExportModal.tsx     #   Format picker, section toggles, loading/error states
│   │   │
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx          # Auth state (current user, login/logout)
│   │   │   └── ThemeContext.tsx         # Theme state (dark/light mode)
│   │   │
│   │   ├── lib/
│   │   │   ├── supabase.ts             # Supabase client init
│   │   │   ├── supabase-api.ts         # Supabase RLS queries (classes, mistakes, students, portions CRUD)
│   │   │   ├── quran-api.ts            # Quran data API (pages, surahs)
│   │   │   ├── quran-utils.ts          # Centralized surahNames, Juz boundaries, helpers
│   │   │   ├── local-api.ts            # Local FastAPI calls (fallback)
│   │   │   ├── report-types.ts         # Student report TypeScript interfaces
│   │   │   ├── report-export.ts       # PDF (backend Playwright + client fallback), CSV, Word export
│   │   │   ├── cache.ts                # Client-side caching
│   │   │   └── database.types.ts       # Auto-generated Supabase TypeScript types
│   │   │
│   │   ├── types/index.ts              # TypeScript type definitions
│   │   └── data/quranPages.ts          # Static Quran page metadata
│   │
│   └── public/fonts/qpc/              # 604 QPC font files (one per Quran page)
│
├── quran_mobile/                       # ── Flutter Mobile App ───────────────
│   ├── assets/fonts/qpc/              # 604 QPC TTF font files (bundled, fully offline)
│   ├── lib/
│   │   ├── main.dart                   # App entry point + Supabase init
│   │   │
│   │   ├── config/
│   │   │   ├── constants.dart          # API URLs, timeouts
│   │   │   ├── app_colors.dart         # Color palette (light/dark)
│   │   │   └── theme.dart              # AppTheme class
│   │   │
│   │   ├── core/
│   │   │   ├── auth/                   # Supabase auth (login, signup, password reset)
│   │   │   ├── network/               # Dio HTTP client + connectivity checker
│   │   │   ├── database/              # Local SQLite setup
│   │   │   ├── sync/                  # Offline sync service
│   │   │   └── services/             # QPC font loading (assets), Quran page data loader,
│   │   │       │                      #   report helpers, Arabic text utils
│   │   │       ├── qpc_font_service.dart    # Loads QPC fonts from bundled assets (mobile) or HTTP (web)
│   │   │       ├── report_helpers.dart      # Pure functions: filtering, stats, badge colors, formatting
│   │   │       └── arabic_text_utils.dart   # Shared Arabic word parser (char-level rendering, 21 harakat codes)
│   │   │
│   │   ├── data/
│   │   │   ├── quran_data.dart         # Static Quran metadata (604 pages, 114 surahs, JuzBoundary data)
│   │   │   ├── models/               # Data models (User, Class, Mistake, Assignment, Quran)
│   │   │   │   ├── student_report.dart    # Report data models (StudentReport, StudentInfo, etc.)
│   │   │   │   ├── report_filters.dart    # Filter + stats models (ReportFilters, PerformanceStats)
│   │   │   │   └── suggested_portions.dart # Smart Suggestions models (SuggestedPortion, SuggestedPortions)
│   │   │   └── repositories/         # CRUD operations (classes, mistakes, quran)
│   │   │
│   │   └── presentation/
│   │       ├── providers/             # Riverpod state (auth, theme, quran page, report)
│   │       │   └── report_provider.dart   # Student report + filter + computed providers
│   │       ├── screens/              # All screens: auth/, dashboard/, classes/,
│   │       │   │                      #   classroom/ (with word_popup), reader/, settings/
│   │       │   └── classes/
│   │       │       ├── classes_screen.dart     # Student pills + ReportPanel (teacher); own report (student)
│   │       │       └── report/                # Report widgets (mirrors web Phase 16.2)
│   │       │           ├── report_panel.dart          # Report orchestrator (tabs, state, data fetch)
│   │       │           ├── report_filter_bar.dart     # Month pills, surah/juz selectors
│   │       │           ├── report_summary_strip.dart  # 5-stat horizontal strip
│   │       │           ├── report_classes_tab.dart    # Classes table with expandable rows
│   │       │           ├── report_mistakes_tab.dart   # Mistakes by surah + repeated list
│   │       │           └── report_performance_tab.dart # Bar chart + stats sidebar
│   │       └── widgets/              # Reusable: section_badge, glassmorphic_card,
│   │                                  #   surah_header, bismillah, mushaf_page, common/
│   │
│   └── .env                           # Supabase URL + anon key
│
└── docs/                               # ── Documentation ────────────────────
    ├── PROJECT_CHANGELOG.md            # MAIN REFERENCE - all phases, start here
    ├── PRODUCTION_READINESS.md         # Production checklist & roadmap
    ├── Logs/                           # Session logs
    │   ├── TEMPLATE.md                 #   Session log template
    │   ├── 2026-02-15-001-docs-overhaul-audit.md
    │   ├── 2026-02-15-002-remove-test-feature.md
    │   ├── 2026-02-15-003-student-reports-feature.md
    │   ├── 2026-02-15-004-student-report-redesign.md
    │   ├── 2026-02-16-001-classes-revamp-*.md  # Planning + implementation
    │   ├── 2026-02-16-002-classes-revamp-architecture-fix.md
    │   ├── 2026-02-16-003-export-modal-and-pdf-rewrite.md
    │   ├── 2026-02-16-004-backend-pdf-playwright.md
    │   ├── 2026-02-17-001-tauri-desktop-app-planning.md
    │   ├── 2026-02-17-002 through 005-tauri-phases.md  # Phases 1-4
    │   ├── 2026-02-18-001-ux-polish-login.md
    │   ├── 2026-02-18-002-responsive-fixes.md
    │   ├── 2026-02-18-003-flutter-local-quran-and-classes-revamp.md
    │   ├── 2026-02-18-003-team-lead-log.md
    │   ├── 2026-02-19-001-implementation-plans.md
    │   ├── 2026-02-19-002-feature-implementation.md
    │   └── 2026-02-19-002-team-lead-log.md
    ├── Mockups/                        # HTML/PDF report mockups
    ├── Architecture/                   # System design docs
    ├── Technical Implementation Journey/
    │   ├── Technical_Documentation.md  # Full technical reference
    │   ├── Auth_System.md              # Auth flow docs
    │   ├── Classes_And_Mistakes.md     # Class/mistake schema & logic
    │   ├── Classes_Revamp_Plan.md      # Classes revamp planning doc
    │   ├── Classes_Revamp_Agents.md    # Classes revamp agent guide
    │   ├── Classes_Revamp_Implementation.md # Classes revamp + PDF export architecture
    │   ├── Qpc_Quran_Rendering.md      # QPC font rendering details
    │   ├── Light_Dark_Mode_Implementation.md
    │   ├── Settings_Password_Reset.md
    │   ├── Auth_Navigation_Fixes.md
    │   ├── Student_Reports.md          # Student reports (data, export, UI)
    │   ├── Tauri_Desktop_App_Plan.md   # Tauri desktop app planning doc
    │   ├── Flutter_Local_Quran_And_Classes_Revamp_Plan.md  # Flutter QPC fonts + classes revamp plan
    │   ├── Web_Portion_Management_Plan.md  # Web edit/delete/juz portion features plan
    │   ├── Flutter_Portion_Management_Plan.md  # Flutter edit/delete/juz/suggestions plan
    │   ├── Flutter_CharLevel_Mistakes_Alignment.md  # Flutter char-level mistake polish plan
    │   ├── Supabase Implementation/    # Schema, RLS policies, frontend integration
    │   ├── Quran Reader/               # Web & Flutter rendering docs
    │   └── Flutter App Overhaul/       # Mobile UI overhaul (6 docs)
    └── Guides/                         # Troubleshooting (font overflow, page layout, seeding)
```

## Key Concepts

### QPC Font Rendering
- Each Quran page (1-604) has its own font file — glyphs are **page-specific**
- `c1` field in page JSON = QPC glyph code for rendering
- **Never move words between pages** — glyphs won't render correctly
- Page 586 has overflow glyphs needing the previous page's font

### Quran Page JSON Structure
```json
{
  "id": 123, "s": 2, "a": 1, "p": 1,
  "t": "بِسْمِ",     // Arabic text (display reference)
  "c1": "ﭑ",         // QPC glyph code (rendering)
  "l": 3,            // Line number (0-15 normal, 16-18 overflow)
  "ct": "word"       // "word" or "end" (ayah marker)
}
```

### Surah Headers & Bismillah
- Rendered as styled Arabic text (not QPC glyphs), displayed ABOVE existing lines
- Surah 1: Bismillah is ayah 1 (no separate display)
- Surah 9: No bismillah
- Surahs 2-114 (except 9): Show bismillah

### Database Architecture
- **app.db** — Local SQLite: users, classes, mistakes (read-write)
- **quran.db** — Quran text only (READ-ONLY, never modify)
- **Supabase** — Cloud PostgreSQL for auth + cross-device sync (RLS-secured)

### Auth Flow
- Supabase handles auth (JWT tokens, email/password)
- Role-based: Teacher or Student (selected at signup)
- Teachers: create classes, assign portions, mark mistakes
- Students: view classes, read Quran, see progress

## Important Rules

### Session Logs
- **ALWAYS create a session log** at the start of every development session in `docs/Logs/`
- **ALWAYS update the log** as you complete work — do NOT wait until the end
- Naming: `YYYY-MM-DD-NNN-brief-description.md`
  - **Logs before `2026-02-22-002`**: No version suffix (pre-installer, no shippable product yet)
  - **All logs from `2026-02-22-002` onward MUST include a version suffix**: `YYYY-MM-DD-NNN-description-vX.Y.Z.md`
  - Every session = a version bump. Bug fixes, features, polish — each gets its own version.
  - Examples: `2026-02-23-001-tauri-navbar-fix-v1.0.1.md`, `2026-02-24-001-flutter-classes-fix-v1.0.2.md`
  - Use semver: patch (v1.0.1) for bug fixes, minor (v1.1.0) for features, major (v2.0.0) for breaking changes
  - Check the last log's version to determine the next version number
- Use the template at `docs/Logs/TEMPLATE.md` for structure
- Include: objective, summary, work completed, issues encountered, files changed table, next steps
- Every fix, feature, or bug encountered during the session must be logged
- If a session is a continuation of previous work, reference the earlier log

### Version History

Every session bumps the version. Use this table to determine the next version number.

| Version | Date | Description | Log |
|---------|------|-------------|-----|
| v1.0.0 | 2026-02-22 | Tauri desktop installer + landing page | `2026-02-22-002`, `2026-02-22-003` |
| v1.1.0 | 2026-02-25 | Replace Smart Suggestions with auto pre-fill from previous class | `2026-02-25-001` |
| v1.2.0 | 2026-02-26 | Web QPC v1 → v2 migration + classroom UI polish | `2026-02-26-001` |
| v1.2.1 | 2026-02-26 | Flutter QPC v2 migration (mirrors web v1.2.0) | `2026-02-26-002` |
| v1.2.2 | 2026-02-26 | Flutter classroom fixes: PageView reset, add portion, performance, notes | `2026-02-26-003` |
| v1.2.3 | 2026-02-26 | Web pre-fill fix, delete class cascade, portion label cross-surah fix, delete button in report | `2026-02-26-004` |
| v1.2.4 | 2026-02-26 | Remove demo accounts from web and Flutter login pages | `2026-02-26-005` |
| v1.3.0 | 2026-02-27 | Auto-update system for Tauri desktop + Flutter mobile | `2026-02-27-002` |
| v1.3.1 | 2026-02-28 | Fix Tauri v2 detection + GitHub Actions release workflow | `2026-02-28-001` |
| v1.3.2 | 2026-02-28 | Settings page redesign | `2026-02-28-003` |
| v1.3.3 | 2026-02-28 | Fix sidecar not killed before update install | `2026-02-28-003` |

**Current version: v1.3.3**

**Versioning rules:**
- Patch (v1.2.x): Bug fixes, small additions, porting features to another platform
- Minor (v1.x.0): New features or significant enhancements
- Major (vX.0.0): Breaking changes

### Git
- **ALWAYS use `git add .`** before committing
- Use conventional commits (`feat:`, `fix:`, `docs:`, etc.)

### Releasing a New Version

Every release requires **5 files** to be version-bumped, then a commit + tag to trigger the build.

**Step 1 — Bump version in these 5 files:**

| # | File | What to change |
|---|------|----------------|
| 1 | `quran_frontend/src-tauri/tauri.conf.json` | `"version": "X.Y.Z"` — the auto-updater compares this |
| 2 | `quran_frontend/package.json` | `"version": "X.Y.Z"` — keeps npm in sync |
| 3 | `quran_frontend/src/pages/Settings.tsx` | `vX.Y.Z` string in App Info section |
| 4 | `website/index.html` | Download URL + version text (2 spots: href and display text) |
| 5 | `CLAUDE.md` | Version history table + "Current version" line |

**Step 2 — Commit and push:**
```bash
git add .
git commit -m "feat: description here (vX.Y.Z)"
git push
```

**Step 3 — Tag and push tag (this triggers the build):**
```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

**What happens automatically after the tag push:**

The tag triggers `.github/workflows/release.yml` which:
1. Builds the Python sidecar (PyInstaller → `quran-backend.exe`)
2. Builds the Tauri Windows installer (signed: `QuranTrack_X.Y.Z_x64-setup.exe`)
3. Generates `latest.json` for the auto-updater
4. Creates a GitHub Release with all 3 artifacts uploaded

Existing installs detect the new version on next launch and prompt to update.

**Required GitHub secrets (already configured):**
- `TAURI_SIGNING_PRIVATE_KEY` — Tauri update signing key
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — `Hamza_quran2026`

### Code Safety
- Never modify `quran.db`
- Never move QPC words between pages
- Page line numbers: `l: 0-15` normal, `l: 16-18` overflow

### Screenshots
- ALL screenshots (Playwright, browser, agent-browser) go in the `screenshots/` folder at project root
- This folder is gitignored — never commit screenshots
- When taking screenshots with Playwright CLI, use `--filename=screenshots/name.png`

## Common Tasks

```bash
# Backend
cd quran_backend && python main.py

# Frontend
cd quran_frontend && npm run dev

# Build frontend
cd quran_frontend && npm run build

# Create test users
cd quran_backend && python scripts/create_test_users.py

# Clear all mistakes (testing)
cd quran_backend && python scripts/clear_mistakes.py

# Nuke ALL data (Supabase + local)
cd quran_backend && python scripts/nuke_all_data.py
```

## Documentation

**See [`docs/README.md`](docs/README.md)** for a full navigation guide with directory tree and quick-links by topic.

**Start with `docs/PROJECT_CHANGELOG.md`** — it's the main reference with links to everything else.

| Doc | Purpose |
|-----|---------|
| `docs/README.md` | Documentation navigation guide |
| `PROJECT_CHANGELOG.md` | Main reference, all 15+ phases |
| `Technical Implementation Journey/` | How features were built |
| `Architecture/` | System design docs |
| `Guides/` | Troubleshooting for AI/developers |
| `PRODUCTION_READINESS.md` | Production checklist & roadmap |
| `Logs/` | Development session logs |
