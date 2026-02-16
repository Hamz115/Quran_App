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
│   ├── seed_database.py / seed.js      # Database seeding scripts
│   ├── create_test_users.py            # Creates demo accounts
│   ├── clear_mistakes.py               # Clears all mistakes (testing)
│   ├── app.db                          # SQLite: users, classes, mistakes (read-write)
│   ├── quran.db                        # SQLite: Quran text data (READ-ONLY)
│   ├── quran-pages/                    # 604 JSON files with QPC word data per page
│   └── Backups/                        # Database backup directory
│
├── quran_frontend/                     # ── React Web Frontend ───────────────
│   ├── src/
│   │   ├── App.tsx                     # Route config (public, protected, role-based)
│   │   ├── api.ts                      # FastAPI client functions (legacy/backup)
│   │   │
│   │   ├── pages/
│   │   │   ├── Login.tsx               # Email login
│   │   │   ├── Signup.tsx              # Registration with role selection
│   │   │   ├── ForgotPassword.tsx      # Password reset request
│   │   │   ├── ResetPassword.tsx       # Password reset confirmation (via email link)
│   │   │   ├── Dashboard.tsx           # Role-based redirect hub
│   │   │   ├── TeacherDashboard.tsx    # Teacher home (stats, shortcuts)
│   │   │   ├── StudentDashboard.tsx    # Student home (stats, shortcuts)
│   │   │   ├── TeacherClasses.tsx      # Teacher: create/manage classes, notes, performance
│   │   │   ├── StudentClasses.tsx      # Student: view joined classes (read-only)
│   │   │   ├── Classes.tsx             # Legacy classes page
│   │   │   ├── Classroom.tsx           # Active class session (QPC reader + mistakes)
│   │   │   ├── QuranReader.tsx         # Standalone Quran reader (read-only)
│   │   │   ├── StudentReport.tsx      # Individual student progress report
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
│   │   │   ├── supabase-api.ts         # Supabase RLS queries (classes, mistakes, students)
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
│   │   │   └── services/             # QPC font loading/caching, Quran page data loader
│   │   │
│   │   ├── data/
│   │   │   ├── quran_data.dart         # Static Quran metadata (604 pages, 114 surahs)
│   │   │   ├── models/               # Data models (User, Class, Mistake, Assignment, Quran)
│   │   │   └── repositories/         # CRUD operations (classes, mistakes, quran)
│   │   │
│   │   └── presentation/
│   │       ├── providers/             # Riverpod state (auth, theme, quran page)
│   │       ├── screens/              # All screens: auth/, dashboard/, classes/,
│   │       │                          #   classroom/ (with word_popup), reader/, settings/
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
    │   └── 2026-02-16-004-backend-pdf-playwright.md
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

### Git
- **ALWAYS use `git add .`** before committing
- Use conventional commits (`feat:`, `fix:`, `docs:`, etc.)

### Code Safety
- Never modify `quran.db`
- Never move QPC words between pages
- Page line numbers: `l: 0-15` normal, `l: 16-18` overflow

## Common Tasks

```bash
# Backend
cd quran_backend && python main.py

# Frontend
cd quran_frontend && npm run dev

# Build frontend
cd quran_frontend && npm run build

# Create test users
cd quran_backend && python create_test_users.py

# Clear all mistakes (testing)
cd quran_backend && python clear_mistakes.py
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
