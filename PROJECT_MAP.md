---
project: QuranTrack
created: 2025-12-31T14:46:00
last_updated: 2026-02-21T23:30:00
last_commit: 8684ab7
update_count: 5
total_files: 3673
total_folders: 119
---

# Project Map: QuranTrack

## Overview

QuranTrack is a Quran memorization and recitation tracking application designed for teachers (Ustadh/Ustadha) who conduct Hifz (memorization) classes. The app provides a digital platform to track student progress, mark mistakes during recitation sessions, and maintain detailed class records.

The application uses QPC (Quran Printing Complex) fonts from the King Fahd Complex to render Quran pages pixel-perfect, exactly matching the printed Madani Mushaf. Each of the 604 pages has its own dedicated font file for perfect glyph accuracy. The system supports word-level and character-level mistake tracking with color-coded severity based on error frequency.

The architecture follows a multi-platform approach with a FastAPI backend serving a React web frontend, a Flutter mobile app, and a Tauri v2 desktop app (which embeds the React frontend with a PyInstaller-bundled FastAPI sidecar). Authentication and cloud data storage are handled by Supabase (PostgreSQL with RLS policies and JWT authentication). Local SQLite databases provide offline-first capability with bidirectional sync to Supabase. The web frontend uses Supabase client-side SDK for direct database access, while the FastAPI backend provides local-first endpoints and serves QPC font/page data. The mobile app bundles QPC fonts locally for fully offline Quran rendering.

## Tech Stack

**Languages:** Python 3.x, TypeScript, JavaScript, Dart, Rust, Kotlin, Java
**Frameworks:** FastAPI, React 19, Flutter, Tauri v2, Tailwind CSS
**Tools:** Vite, SQLite, Riverpod (Flutter state management), PyInstaller, JWT, Supabase
**Databases:** SQLite (quran.db read-only, app.db read-write), Supabase PostgreSQL (cloud sync)
**Authentication:** Supabase Auth (JWT + RLS policies), replaces legacy custom JWT

## Architecture

```
                    +------------------+
                    |   React Frontend |
                    |  (quran_frontend)|
                    +--------+---------+
                             |
                +------------+------------+
                |                         |
                v                         v
+------------------+   +------------------+   +------------------+
| Supabase Cloud   |   |   FastAPI Local  |   | QPC Fonts (604)  |
| (Auth + RLS DB)  |   |   Backend        |   | page-specific    |
+--------+---------+   +------+------+    |   +------------------+
         |                    |      |    |
         |              +-----+------+----+
         |              |                 |
         |       +------v------+   +------v------+
         |       |  quran.db   |   |   app.db    |
         |       | (read-only) |   | (read-write)|
         |       | Quran text  |   | Users/Sync  |
         |       +-------------+   +------+------+
         |                                |
         +-----< bidirectional sync >-----+
                (sync_service.py)

+------------------+   +------------------+
| Flutter Mobile   |   | Tauri Desktop    |
| (quran_mobile)   |   | (src-tauri/)     |
+--------+---------+   +--------+---------+
         |                      |
         +---> Supabase Cloud   +---> React Frontend (embedded)
         +---> Local SQLite     +---> FastAPI sidecar (PyInstaller exe)
         +---> QPC Fonts (.ttf) +---> Supabase Cloud
```

## Directory Structure

### 📄 README.md

**Path:** `README.md`

**Purpose:** Main project documentation and introduction.

**What it does:**
- Introduces QuranTrack as a Quran memorization tracking app
- Explains features for teachers (conduct classes, track mistakes, manage students)
- Explains features for students (view progress, review mistakes)
- Documents the tech stack (React, FastAPI, Flutter, Supabase)
- Links to detailed documentation in the docs/ folder

---

### 📄 CLAUDE.md 🔄

**Path:** `CLAUDE.md`

**Purpose:** AI agent instructions with comprehensive codebase map for Claude Code.

**What it does:**
- Provides a complete directory tree of every file and folder in the project with one-line descriptions
- Documents the full tech stack (React 19, FastAPI, Flutter, Supabase, QPC fonts)
- Explains key concepts: QPC rendering, auth flow, database architecture
- Lists important rules for git commands, database access, and QPC font handling
- Covers the Quran page JSON structure and line number system
- Provides quick-start commands for running backend, frontend, and tests
- Rewritten in Feb 2026 to replace the minimal original version

---

### 📄 AGENTS.md 🆕

**Path:** `AGENTS.md`

**Purpose:** AI agent instructions file that mirrors CLAUDE.md for non-Claude AI agent compatibility.

**What it does:**
- Contains identical content to CLAUDE.md
- Provides comprehensive codebase map for any AI coding assistant
- Ensures AI agents that look for AGENTS.md (instead of CLAUDE.md) get the same instructions
- Created during the Feb 2026 documentation overhaul

---

### 📄 PROJECT_MAP.md

**Path:** `PROJECT_MAP.md`

**Purpose:** Comprehensive codebase documentation generated by Codebase Investigator.

**What it does:**
- Documents every folder and file in the project
- Explains purpose, functions, and integrations for each file
- Provides architecture diagram and tech stack overview
- Tracks git history and update history

---

### 📄 PROJECT_MAP.html

**Path:** `PROJECT_MAP.html`

**Purpose:** Interactive HTML viewer for PROJECT_MAP.md.

**What it does:**
- Provides tabbed interface (Overview, Files, Docs, Git, Updates)
- Supports search across all content
- Includes dark/light mode toggle
- Two-column card layout for files and docs

---

### 📂 quran_backend/

**Purpose:** FastAPI Python backend serving REST APIs for the web and mobile apps.

**What it does:**
- Provides all API endpoints for authentication, classes, mistakes, Quran data, and sync
- Manages two SQLite databases (quran.db and app.db)
- Serves QPC word data from JSON files for each Quran page
- Serves QPC TTF fonts for the Flutter mobile app
- Handles JWT authentication with access/refresh tokens
- Implements bidirectional sync with Supabase cloud database

**Contains:** main.py, auth/, sync_service.py, scripts/, fonts/qpc/, quran-pages/, Backups/, pyinstaller_entry.py

---

#### 🐍 main.py 🔄

**Path:** `quran_backend/main.py`

**Purpose:** Main FastAPI application with all API endpoint definitions.

**What it does:**
- Initializes FastAPI app with CORS middleware for frontend/mobile access
- Creates database tables on startup with migration support (including sync columns)
- Defines all REST endpoints for classes, mistakes, tests, and Quran data
- Implements role-based access control (teacher vs student views)
- Handles test class functionality with scoring and tanbeeh (warnings)
- Serves QPC TTF fonts from the fonts/qpc/ directory for Flutter mobile
- Provides local-first endpoints (/api/local/classes, /api/local/mistakes)
- Provides sync endpoints (/api/sync, /api/sync/push, /api/sync/pull)
- Accepts both custom JWT and Supabase JWT tokens for authentication

**Key Functions:**
- `init_app_db()` -- Creates/migrates database tables on startup (now includes sync columns)
- `get_quran_page_words(page_number)` -- Returns QPC word data for a page
- `get_all_classes()` -- Returns classes based on user role
- `create_class()` -- Creates class with assignments and student associations
- `addMistake()` / `removeMistake()` -- Mistake CRUD operations
- `get_suggested_portions()` -- Smart portion suggestions based on last class

**Key Classes:**
- `AssignmentCreate` -- Pydantic model for assignment creation
- `ClassCreate` -- Pydantic model for class with students and assignments
- `MistakeCreate` -- Pydantic model for mistake tracking
- `TestMistakeCreate` -- Pydantic model for test-specific mistakes

**Integrates with:** -> `auth/routes.py`, -> `auth/dependencies.py`, -> `quran-pages/*.json`, -> `sync_service.py`, -> `fonts/qpc/`

---

#### 🐍 sync_service.py 🆕

**Path:** `quran_backend/sync_service.py`

**Purpose:** Bidirectional sync service between local app.db (SQLite) and Supabase (PostgreSQL).

**What it does:**
- Handles push operations: sends local changes to Supabase cloud
- Handles pull operations: fetches remote changes from Supabase
- Manages sync status tracking (supabase_id, sync_status, last_synced_at columns)
- Syncs profiles, teacher_students, classes, assignments, and mistakes tables
- Uses python-dotenv to load Supabase credentials from .env file
- Lazily initializes Supabase client connection

**Key Functions:**
- `get_supabase()` -- Get or create Supabase client (lazy init)
- `sync_push()` -- Push local changes to Supabase
- `sync_pull()` -- Pull remote changes from Supabase
- `mark_synced()` -- Update sync status after successful push

**Integrates with:** -> `main.py` (sync endpoints), -> Supabase cloud

---

#### 🐍 auth/routes.py

**Path:** `quran_backend/auth/routes.py`

**Purpose:** Authentication and student management API endpoints.

**What it does:**
- Handles user signup with role selection (teacher/student)
- Implements login with email or username support
- Manages JWT token refresh and rotation
- Provides student lookup, add, and remove for teachers
- Lists teachers for students

**Key Functions:**
- `signup()` -- Creates user account with role-based verification
- `login()` -- Authenticates user and issues tokens
- `refresh_tokens()` -- Rotates JWT tokens
- `lookup_student()` -- Find student by email (teacher only)
- `add_student()` -- Add student to teacher's roster
- `get_my_students()` -- List all students for a teacher
- `get_my_teachers()` -- List teachers who added the current student

**Integrates with:** -> `auth/models.py`, -> `auth/utils.py`, -> `auth/dependencies.py`

---

#### 🐍 auth/models.py

**Path:** `quran_backend/auth/models.py`

**Purpose:** Pydantic request/response models for authentication.

**What it does:**
- Defines request validation schemas for signup, login, token refresh
- Defines response schemas for user data and auth tokens
- Enforces field validation (email format, username pattern, password length)

**Key Classes:**
- `SignupRequest` -- Validates signup with role (teacher/student)
- `LoginRequest` -- Accepts email or username identifier
- `UserResponse` -- User profile response shape
- `AuthResponse` -- Contains user + access_token + refresh_token
- `StudentListItem` / `TeacherListItem` -- Roster list items

---

#### 🐍 auth/dependencies.py

**Path:** `quran_backend/auth/dependencies.py`

**Purpose:** FastAPI dependency injection for authentication.

**What it does:**
- Extracts and validates JWT from Authorization header
- Provides `get_current_user` dependency for authenticated routes
- Provides `get_current_verified_user` for teacher-only routes
- Provides `get_optional_user` for routes that work with/without auth

**Key Functions:**
- `get_current_user()` -- Returns decoded token payload or raises 401
- `get_current_verified_user()` -- Requires is_verified=True (Teacher)
- `get_optional_user()` -- Returns user if authenticated, None otherwise

---

#### 🐍 auth/utils.py

**Path:** `quran_backend/auth/utils.py`

**Purpose:** Authentication utility functions for password hashing and JWT.

**What it does:**
- Hashes passwords with bcrypt
- Generates TeamViewer-style student IDs (STU-XXXXXX)
- Creates and decodes JWT access/refresh tokens
- Generates email verification tokens

**Key Functions:**
- `hash_password()` / `verify_password()` -- Password hashing with bcrypt
- `generate_student_id()` -- Creates unique STU-XXXXXX identifier
- `create_access_token()` / `create_refresh_token()` -- JWT generation
- `decode_token()` -- JWT validation and decoding
- `create_user_token_data()` -- Builds token payload from user dict

---

### 📂 quran_backend/scripts/ 🔄

**Purpose:** Backend utility scripts for database management, seeding, and data cleanup.

**What it does:**
- Contains all backend utility scripts (previously at quran_backend/ root)
- Scripts for creating test users, clearing mistakes, seeding databases, and nuking all data
- Moved from quran_backend/ root to quran_backend/scripts/ for organization

**Contains:** create_test_users.py, clear_mistakes.py, seed_database.py, seed.js, nuke_all_data.py

---

#### 🐍 scripts/create_test_users.py 🔄

**Path:** `quran_backend/scripts/create_test_users.py`

**Purpose:** Script to seed the database with test users for development.

**What it does:**
- Creates 10 student accounts with Muslim names
- Creates 5 teacher accounts (verified)
- All accounts use password "Test123!"
- Generates unique student IDs for each user
- Moved from quran_backend/ root to scripts/

---

#### 🐍 scripts/clear_mistakes.py 🔄

**Path:** `quran_backend/scripts/clear_mistakes.py`

**Purpose:** Utility script to clear all mistakes from the database for testing.

**What it does:**
- Deletes all records from mistake_occurrences table
- Deletes all records from mistakes table
- Preserves users, classes, and assignments
- Moved from quran_backend/ root to scripts/

---

#### 🐍 scripts/nuke_all_data.py 🆕

**Path:** `quran_backend/scripts/nuke_all_data.py`

**Purpose:** Nuclear data wipe script that clears ALL data from both Supabase and local SQLite.

**What it does:**
- Deletes all rows from 7 Supabase tables in foreign-key-safe order (mistake_occurrences, mistakes, assignments, class_students, classes, teacher_students, profiles)
- Deletes all Supabase auth users via admin API
- Clears all tables in local app.db SQLite database
- Requires SUPABASE_SERVICE_KEY in .env (uses service role for admin operations)
- Safety prompt: requires typing "NUKE" to confirm

**Key Functions:**
- `nuke_supabase()` -- Deletes all cloud data and auth users via REST API
- `nuke_local()` -- Empties all local SQLite tables

**Integrates with:** -> Supabase REST API, -> `quran_backend/app.db`

---

#### 🐍 scripts/seed_database.py 🔄

**Path:** `quran_backend/scripts/seed_database.py`

**Purpose:** Database seeding script for populating test data.

**What it does:**
- Seeds the database with sample classes, assignments, and mistakes
- Moved from quran_backend/ root to scripts/

---

#### 🐍 pyinstaller_entry.py 🆕

**Path:** `quran_backend/pyinstaller_entry.py`

**Purpose:** PyInstaller entry point for bundling FastAPI backend as a standalone executable for the Tauri desktop app.

**What it does:**
- Handles frozen-mode quirks: redirects stdout/stderr to backend.log in --noconsole mode
- Calls multiprocessing.freeze_support() to prevent infinite child processes on Windows
- Starts a parent process watcher that kills the sidecar if the Tauri parent process dies (prevents orphan processes)
- Uses Windows kernel32 OpenProcess to monitor parent PID health
- Launches uvicorn on 127.0.0.1:8000 with single worker

**Key Functions:**
- `watch_parent()` -- Background thread that monitors parent PID and calls os._exit(0) if parent dies
- `main()` -- Initializes frozen environment and starts uvicorn server

**Integrates with:** -> `main.py`, -> Tauri sidecar system (`src-tauri/`)

---

### 📂 quran_backend/fonts/qpc/ 🆕

**Purpose:** Contains 604 QPC TTF font files for Flutter mobile app rendering.

**What it does:**
- Stores TrueType (.ttf) versions of QPC fonts (QCF_P001.ttf to QCF_P604.ttf)
- Converted from the WOFF2 files in quran_frontend/public/fonts/qpc/ using scripts/convert_fonts.py
- Served by FastAPI for the Flutter mobile app to download and cache
- Each font contains page-specific glyphs for Quran page rendering

**Contains:** 604 TTF font files

---

### 📂 quran_backend/quran-pages/

**Purpose:** Contains 604 JSON files with QPC word data for each Quran page.

**What it does:**
- Stores word-by-word data including glyph codes, line numbers, surah/ayah info
- Each file (page_001.json to page_604.json) contains an array of word objects
- Words include `c1` field for QPC glyph rendering
- Line numbers (`l` field) control vertical positioning on the page

**Contains:** 604 JSON files + all_pages.json (combined)

---

### 📂 quran_frontend/

**Purpose:** React + TypeScript web frontend with Tailwind CSS styling.

**What it does:**
- Provides web interface for teachers and students
- Renders Quran pages with QPC fonts for pixel-perfect display
- Implements mistake tracking with character-level precision
- Supports test class creation and scoring
- Implements light/dark mode theming with CSS custom properties
- Uses Supabase client-side SDK for direct database access with RLS
- Provides local-first caching for instant page loading
- Responsive 3-tier layout: phone, tablet, desktop

**Contains:** src/, public/, scripts/, src-tauri/, config files

---

#### 📄 src/api.ts 🔄

**Path:** `quran_frontend/src/api.ts`

**Purpose:** API client facade that re-exports functions from specialized modules.

**What it does:**
- Re-exports authentication functions from Supabase Auth
- Re-exports data functions from supabase-api.ts (classes, mistakes, students)
- Re-exports Quran data functions from quran-api.ts
- Maintains backward compatibility with original monolithic API client
- Legacy FastAPI token management code retained as fallback

**Integrates with:** -> `lib/supabase-api.ts`, -> `lib/quran-api.ts`, -> `lib/supabase.ts`

---

#### 📄 src/App.tsx 🔄

**Path:** `quran_frontend/src/App.tsx`

**Purpose:** Main React application with routing configuration.

**What it does:**
- Sets up React Router with protected routes
- Wraps app in AuthProvider and ThemeProvider for global state
- Defines public routes (Login, Signup, ForgotPassword, ResetPassword)
- Defines protected routes (Dashboard, Classes, Classroom, QuranReader, Settings)
- Role-based routing: teachers and students see different dashboards

**Integrates with:** -> `contexts/AuthContext`, -> `contexts/ThemeContext`, -> `components/Layout`, -> `pages/*`

---

#### 📄 src/contexts/AuthContext.tsx 🔄

**Path:** `quran_frontend/src/contexts/AuthContext.tsx`

**Purpose:** React context for authentication state management using Supabase Auth.

**What it does:**
- Provides user state and authentication methods to entire app
- Uses Supabase Auth for login, signup, logout, password reset
- Implements 10-second timeout with auto-recovery for stuck auth operations
- Handles email verification with USER_UPDATED event
- Provides isMounted cleanup pattern to prevent state updates on unmounted components
- Implements optimistic logout (clear state first, then sign out)
- Adds emergency reset function for manual recovery
- Race condition protection for temporary null sessions

**Key Functions:**
- `login()` -- Authenticates via Supabase with timeout protection
- `signup()` -- Creates account via Supabase Auth
- `logout()` -- Optimistic logout with clearSupabaseStorage
- `resetPassword()` -- Sends password reset email via Supabase
- `updateProfile()` -- Updates user name in Supabase profiles table
- `updatePassword()` -- Changes password via Supabase Auth

---

#### 📄 src/contexts/ThemeContext.tsx 🆕

**Path:** `quran_frontend/src/contexts/ThemeContext.tsx`

**Purpose:** React context for global dark/light mode theme management.

**What it does:**
- Provides darkMode state and toggleDarkMode function to the entire app
- Persists theme preference to localStorage (defaults to dark mode)
- Adds 'dark' or 'light' class to document root for CSS theming
- Used by all pages to conditionally style backgrounds, cards, and text

**Key Functions:**
- `useTheme()` -- Hook to access darkMode and toggleDarkMode

---

#### 📄 src/components/Layout.tsx 🔄

**Path:** `quran_frontend/src/components/Layout.tsx`

**Purpose:** Main layout component with responsive navigation and role switcher.

**What it does:**
- Renders navbar with QuranTrack branding and theme toggle button
- Provides tab navigation based on current role (teacher/student)
- Shows role switcher for teachers (based on user.role, not isVerified)
- Displays user profile dropdown with email and logout
- Mobile bottom navigation bar matching Flutter app pattern (below lg/1024px)
- Desktop top tab navigation (lg+ screens)
- Light mode: cyan gradient navbar; Dark mode: dark slate navbar
- Responsive breakpoints: sm->lg for top tabs, bottom nav, role banner

---

#### 📄 src/components/ProtectedRoute.tsx

**Path:** `quran_frontend/src/components/ProtectedRoute.tsx`

**Purpose:** Route guard component for authentication.

**What it does:**
- Shows loading spinner while checking auth
- Redirects to login if not authenticated
- Shows verification required message if route needs verified user
- Renders children if all checks pass

---

#### 📄 src/components/FittedLine.tsx 🆕

**Path:** `quran_frontend/src/components/FittedLine.tsx`

**Purpose:** Quran line width-fitting component matching Flutter's FittedBox(scaleDown) behavior.

**What it does:**
- Renders QPC word lines at natural font size
- Scales lines DOWN uniformly if wider than container (never scales up)
- Centers short lines that fit naturally without stretching
- Uses useLayoutEffect for synchronous DOM measurement
- Prevents the text enlargement/distortion that caused blurry text on mobile
- Transform origin set to 'right center' for RTL Arabic text

---

### 📂 quran_frontend/src/components/teacher-classes/ 🆕

**Purpose:** Report components for the student report tab-based dashboard used in TeacherClasses and StudentClasses pages.

**What it does:**
- Provides a complete report system with filter bar, summary strip, and three tabs (classes, mistakes, performance)
- ReportPanel orchestrator handles state, data fetching, and tab switching
- Pure helper functions separated from React components for testability
- Export modal supports PDF (backend Playwright + client fallback), CSV, and Word export
- All components support light/dark mode theming

**Contains:** index.ts, report-helpers.ts, ReportPanel.tsx, ReportFilterBar.tsx, ReportSummaryStrip.tsx, ReportClassesTab.tsx, ReportMistakesTab.tsx, ReportPerformanceTab.tsx, ExportModal.tsx

---

#### 📄 src/components/teacher-classes/index.ts 🆕

**Path:** `quran_frontend/src/components/teacher-classes/index.ts`

**Purpose:** Barrel exports for all teacher-classes report components.

**What it does:**
- Re-exports ReportPanel, ReportFilterBar, ReportSummaryStrip, all tab components, ExportModal, and report-helpers
- Provides clean import path: `import { ReportPanel } from '../components/teacher-classes'`

---

#### 📄 src/components/teacher-classes/report-helpers.ts 🆕

**Path:** `quran_frontend/src/components/teacher-classes/report-helpers.ts`

**Purpose:** Pure TypeScript helper functions and constants for student report components (zero React imports).

**What it does:**
- Defines performance map (PERF_MAP) converting string ratings to numeric values
- Provides badge CSS class generators for performance, mistake count, and portion type
- Implements date formatting, month list generation, and filter application logic
- Computes performance statistics (streaks, trends, sparkline data)
- Filters report data by date range, surah range, and juz

**Key Functions:**
- `applyReportFilters(report, filters)` -- Filters a StudentReport by date, surah, and juz
- `computePerformanceStats(classes)` -- Calculates streaks, trends, and sparkline from class data
- `perfBadgeClasses(perf)` -- Returns Tailwind CSS classes for performance badge
- `formatDate(dateStr)` -- Formats ISO date to human-readable format

---

#### 📄 src/components/teacher-classes/ReportPanel.tsx 🆕

**Path:** `quran_frontend/src/components/teacher-classes/ReportPanel.tsx`

**Purpose:** Main report orchestrator component that assembles filter bar, summary strip, tabs, and tab content.

**What it does:**
- Fetches student report data via getStudentReport() on mount
- Manages filter state (date range, surah range, juz) and applies filters reactively
- Computes performance stats from filtered data
- Renders 3 tabs: Classes, Mistakes, Performance
- Shows export button (hideable via hideExport prop)
- Accepts basePath prop for navigation context (teacher vs student routes)
- Loading, error, and empty states with theme-aware styling

**Key Props:**
- `studentId` -- Which student's report to load
- `basePath` -- Navigation base path for class links (defaults to '/teacher/classes')
- `hideExport` -- Whether to hide the export button

**Integrates with:** -> `report-helpers.ts`, -> `ReportFilterBar`, -> `ReportSummaryStrip`, -> `ReportClassesTab`, -> `ReportMistakesTab`, -> `ReportPerformanceTab`, -> `ExportModal`

---

#### 📄 src/components/teacher-classes/ReportFilterBar.tsx 🆕

**Path:** `quran_frontend/src/components/teacher-classes/ReportFilterBar.tsx`

**Purpose:** Filter bar with month pills (scrollable row), date preset buttons, surah range selectors, and juz selector.

**What it does:**
- Generates scrollable month pills for the last 12 months
- Provides date preset buttons (1m, 2m, 6m, All)
- Surah range dropdowns (From/To) with all 114 surahs
- Juz selector (1-30) that auto-fills surah range from JUZ_BOUNDARIES
- Clear All button to reset filters
- All selectors sync with each other (juz updates surah range, etc.)

---

#### 📄 src/components/teacher-classes/ReportSummaryStrip.tsx 🆕

**Path:** `quran_frontend/src/components/teacher-classes/ReportSummaryStrip.tsx`

**Purpose:** Horizontal 5-stat summary bar showing key report metrics.

**What it does:**
- Displays: Classes count, Total Mistakes, Unique Mistakes, Repeated Mistakes, Avg Performance
- Responsive layout with horizontal scroll on small screens
- Color-coded values (cyan for classes, red for repeated, green for performance)

---

#### 📄 src/components/teacher-classes/ReportClassesTab.tsx 🆕

**Path:** `quran_frontend/src/components/teacher-classes/ReportClassesTab.tsx`

**Purpose:** Classes table with expandable rows showing class details, portions, and mistakes.

**What it does:**
- Renders sortable table of classes with date, portions, mistake count, and performance
- Click to expand row showing assignment details and individual mistakes
- Chevron toggle for expand/collapse
- Navigate to class view on row click
- Accepts basePath prop for correct routing (teacher vs student context)
- Portion type tags with color coding (Hifz=blue, Sabqi=amber, Manzil=green)

---

#### 📄 src/components/teacher-classes/ReportMistakesTab.tsx 🆕

**Path:** `quran_frontend/src/components/teacher-classes/ReportMistakesTab.tsx`

**Purpose:** Two-column layout showing mistakes by surah and repeated mistakes list.

**What it does:**
- Left column: Mistakes grouped by surah with total and unique counts
- Right column: Repeated mistakes list with surah, ayah, word text, and error count
- Progress bars for surah mistake distribution
- Color-coded mistake severity badges

---

#### 📄 src/components/teacher-classes/ReportPerformanceTab.tsx 🆕

**Path:** `quran_frontend/src/components/teacher-classes/ReportPerformanceTab.tsx`

**Purpose:** Performance bar chart with statistics sidebar.

**What it does:**
- SVG bar chart showing performance trend over time (4-level: Needs Work to Excellent)
- Y-axis labels, grid lines, and date labels on X-axis
- Stats sidebar showing: current streak, best streak, mistakes per class, trend indicator
- Mistake sparkline visualization
- Responsive grid layout (chart 5fr, sidebar 2fr)

---

#### 📄 src/components/teacher-classes/ExportModal.tsx 🆕

**Path:** `quran_frontend/src/components/teacher-classes/ExportModal.tsx`

**Purpose:** Export format picker modal with section toggles, loading states, and error handling.

**What it does:**
- Format selection: PDF, CSV, Word
- Section toggles: summary, class details, mistakes by surah, repeated mistakes, performance chart, teacher notes
- Loading state during export generation
- Error state with retry option
- PDF export uses backend Playwright with client-side html2pdf.js fallback
- CSV export via file-saver
- Word export via docx library

**Integrates with:** -> `lib/report-export.ts`

---

#### 📄 src/pages/QuranReader.tsx 🔄

**Path:** `quran_frontend/src/pages/QuranReader.tsx`

**Purpose:** Standalone Quran page viewer with QPC font rendering and mistake display.

**What it does:**
- Loads QPC words from API for current page
- Dynamically loads page-specific QPC fonts
- Displays mistakes with color-coded severity (amber to red)
- Supports page navigation and surah dropdown
- Handles surah headers and bismillah display
- 3-tier responsive layout: phone (fullscreen), tablet (compact), desktop (with controls)
- Responsive font sizing: min(28, pageHeight/21)px
- Uses FittedLine component for scale-to-fit text rendering
- Overlay controls on phone/tablet, header bar on desktop
- Overflow line fix for pages with surah headers (pulls headers out of line flex)

**Key Features:**
- Page-specific font loading (QCF_P001.woff2 to QCF_P604.woff2)
- Previous page font loading for overflow ayahs
- JS-computed page dimensions replacing CSS calc
- Line-based word layout matching printed Mushaf

---

#### 📄 src/pages/Classroom.tsx 🔄

**Path:** `quran_frontend/src/pages/Classroom.tsx`

**Purpose:** Class session view for conducting lessons and marking mistakes.

**What it does:**
- Displays class with portions (Hifz, Sabqi, Revision/Manzil)
- Allows teachers to mark word/character-level mistakes
- Shows word popup for mistake details and removal
- Supports test mode with question flow and scoring
- Manages per-student performance ratings
- Light/dark mode conditional styling for all UI elements
- Responsive page dimensions matching QuranReader
- Uses FittedLine for QPC text rendering
- Overflow line fix matching QuranReader

**Key Features:**
- Section-based portion highlighting
- Character-level mistake selection (harakat support)
- Test mode with start/end question flow
- Tanbeeh (warning) vs full mistake deduction
- isMounted cleanup for useEffect hooks

---

#### 📄 src/pages/TeacherDashboard.tsx 🔄

**Path:** `quran_frontend/src/pages/TeacherDashboard.tsx`

**Purpose:** Teacher's main dashboard with student roster, quick stats, and recent classes.

**What it does:**
- Displays total students, total classes, and classes this week stats
- Shows student roster with add/remove functionality and email lookup modal
- Provides quick actions to start new class
- Recent Classes section showing last 5 classes with date, portions, student names, and performance
- Light/dark mode theming with conditional card styles
- Uses isMounted cleanup pattern
- Calculates classes this week based on Sunday-Saturday window

**Integrates with:** -> `lib/quran-utils` (surahNames) for data fetching

---

#### 📄 src/pages/TeacherClasses.tsx 🔄

**Path:** `quran_frontend/src/pages/TeacherClasses.tsx`

**Purpose:** Teacher's class list with creation, management, notes, performance, and inline student report panel.

**What it does:**
- Lists all classes created by the teacher with click-to-navigate cards
- Create new class with student selection and multi-mode portion assignment (By Page, By Surah, By Juz)
- Manage performance ratings per student
- Inline ReportPanel slide-out for student progress viewing
- Light/dark mode conditional styling for dropdowns, portions, and badges
- Classes auto-publish on creation (Draft/Live toggle removed)
- PortionSelector and ToggleSwitch extracted as standalone components outside main function to fix input focus loss from re-renders
- Smart suggestions integration for pre-filling portions from last class
- Juz boundary data properly applied when switching between portion modes

**Key Components:**
- `ToggleSwitch` -- Extracted toggle component to prevent re-render focus loss
- `PortionSelector` -- Extracted portion config component with page/surah/juz modes

**Integrates with:** -> `components/teacher-classes/ReportPanel`, -> `lib/quran-utils` (JUZ_BOUNDARIES, surahNames)

---

#### 📄 src/pages/StudentDashboard.tsx 🔄

**Path:** `quran_frontend/src/pages/StudentDashboard.tsx`

**Purpose:** Student's main dashboard with stats, progress overview, recent classes, and teacher info.

**What it does:**
- Displays student stats (total classes, total mistakes, unique mistakes, repeated mistakes)
- Shows recent classes with portions and performance badges
- Shows teacher info (name, added date)
- Shows top repeated mistakes with surah/ayah references
- Shows mistakes by surah distribution
- Enhanced getStats('student') with mistakes_by_surah, repeated_mistakes, top_repeated_mistakes
- Performance style badges with light/dark mode variants
- Links to /student/classes for class navigation
- Light/dark mode theming with proper contrast
- Uses isMounted cleanup pattern

**Integrates with:** -> `lib/quran-utils` (surahNames)

---

#### 📄 src/pages/StudentClasses.tsx 🔄

**Path:** `quran_frontend/src/pages/StudentClasses.tsx`

**Purpose:** Student's view of their own classes and progress using the shared ReportPanel.

**What it does:**
- Complete rewrite from 430 lines to 55 lines by delegating to ReportPanel
- Loads teacher name for header display
- Renders ReportPanel with student's own ID and basePath="/student/classes"
- Passes hideExport prop to hide export functionality for students
- Light/dark mode theming

**Integrates with:** -> `components/teacher-classes/ReportPanel`

---

#### 📄 src/pages/Login.tsx 🔄

**Path:** `quran_frontend/src/pages/Login.tsx`

**Purpose:** Email-based login page with Islamic background.

**What it does:**
- Email-only authentication (replaces username login from Phase 2)
- Islamic background image (mosque, lanterns, Quran) with overlay
- Demo account quick-login buttons (Teacher and Student 1)
- Light/dark mode support
- Link to Forgot Password flow

---

#### 📄 src/pages/Signup.tsx 🔄

**Path:** `quran_frontend/src/pages/Signup.tsx`

**Purpose:** Registration page with role selection and Islamic background.

**What it does:**
- User registration with role selection (teacher/student)
- Same Islamic background image as Login page
- Light/dark mode support

---

#### 📄 src/pages/Settings.tsx 🆕

**Path:** `quran_frontend/src/pages/Settings.tsx`

**Purpose:** User settings page with profile editing and password change.

**What it does:**
- Profile section: edit first name and last name
- Password section: change password with confirmation field
- Success/error feedback for both operations
- Uses Supabase Auth for profile updates and password changes
- Light/dark mode theming

---

#### 📄 src/pages/ForgotPassword.tsx 🆕

**Path:** `quran_frontend/src/pages/ForgotPassword.tsx`

**Purpose:** Password reset request page.

**What it does:**
- Accepts email address for password reset
- Sends reset link via Supabase Auth
- Shows success confirmation after sending
- Light/dark mode theming with background image

---

#### 📄 src/pages/ResetPassword.tsx 🆕

**Path:** `quran_frontend/src/pages/ResetPassword.tsx`

**Purpose:** Password reset confirmation page accessed via email link.

**What it does:**
- Allows user to set new password after clicking email link
- Validates password match between two fields
- Updates password via Supabase Auth
- Redirects to login after successful reset

---

#### 📄 src/pages/Dashboard.tsx 🔄

**Path:** `quran_frontend/src/pages/Dashboard.tsx`

**Purpose:** Role-based redirect hub that sends users to the correct dashboard.

**What it does:**
- Redirects based on user.role (not isVerified, fixed in Supabase migration)
- Teachers go to TeacherDashboard
- Students go to StudentDashboard

---

### 📂 quran_frontend/src/lib/ 🆕

**Purpose:** Library modules for Supabase client, API functions, caching, and types.

**What it does:**
- Contains the Supabase client initialization and helper functions
- Provides typed API functions for all Supabase RLS queries
- Implements local-first caching with stale-while-revalidate pattern
- Contains auto-generated TypeScript types for Supabase database schema
- Provides Quran-specific API functions (page data, surahs)
- Provides local FastAPI endpoint functions as fallback

**Contains:** supabase.ts, supabase-api.ts, quran-api.ts, local-api.ts, cache.ts, database.types.ts

---

#### 📄 src/lib/supabase.ts 🆕

**Path:** `quran_frontend/src/lib/supabase.ts`

**Purpose:** Supabase client initialization and helper functions.

**What it does:**
- Creates typed Supabase client with auto-refresh and session persistence
- Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from environment
- Provides clearSupabaseStorage() for cleaning corrupted localStorage
- Provides resetSupabaseAndReload() nuclear reset for stuck client
- Provides getCurrentUserId() helper

---

#### 📄 src/lib/supabase-api.ts 🔄

**Path:** `quran_frontend/src/lib/supabase-api.ts`

**Purpose:** Supabase RLS-protected API functions for students, classes, mistakes, stats, and reports.

**What it does:**
- Handles student management (lookup, add, remove, list)
- Handles class CRUD with assignments and student associations
- Handles mistake tracking with occurrences (enhanced error logging for inserts)
- Handles performance updates per student per class
- Handles suggested portion queries
- Provides getStats('student') with enhanced data: mistakes_by_surah, repeated_mistakes, top_repeated_mistakes
- Provides getStudentReport() for comprehensive report data
- All queries use Supabase client with automatic RLS enforcement
- Integrated with local-first caching (cache.ts)

---

#### 📄 src/lib/quran-api.ts 🆕

**Path:** `quran_frontend/src/lib/quran-api.ts`

**Purpose:** Quran data API functions that still use FastAPI backend.

**What it does:**
- Fetches QPC page word data from FastAPI (not migrated to Supabase)
- Fetches surah list from FastAPI
- Quran data stays local because it's read-only and bundled

---

#### 📄 src/lib/local-api.ts 🆕

**Path:** `quran_frontend/src/lib/local-api.ts`

**Purpose:** Local FastAPI endpoint functions for offline-first operations.

**What it does:**
- Calls FastAPI /api/local/* endpoints for instant writes to app.db
- Used for local-first architecture where writes go to SQLite first
- Background sync pushes changes to Supabase

---

#### 📄 src/lib/cache.ts 🆕

**Path:** `quran_frontend/src/lib/cache.ts`

**Purpose:** Client-side caching with stale-while-revalidate pattern.

**What it does:**
- Uses localStorage to cache API responses for instant page loading
- 5-minute stale time triggers background refresh
- 1-hour max age forces network fetch
- Provides cacheFirst() wrapper for transparent caching
- Provides invalidateCache() for cache-busting on write operations
- Caches getClasses(), getMyStudents(), getMyTeachers() responses

---

#### 📄 src/lib/quran-utils.ts 🆕

**Path:** `quran_frontend/src/lib/quran-utils.ts`

**Purpose:** Centralized Quran utilities including surah names, Juz boundaries, and helper functions.

**What it does:**
- Provides surahNames mapping (1-114) for all surah English names
- Defines all 30 Juz boundaries (startSurah:ayah to endSurah:ayah) matching Madani Mushaf standard
- Provides getSurahRangeForJuz() to convert Juz number to surah range
- Used by TeacherClasses for Juz-based portion selection
- Used by report components and export utilities for surah name display

**Key Constants:**
- `surahNames` -- Record<number, string> mapping surah number to English name
- `JUZ_BOUNDARIES` -- Array of 30 Juz boundary objects

**Key Functions:**
- `getSurahRangeForJuz(juz)` -- Returns {startSurah, endSurah} for a Juz number

---

#### 📄 src/lib/report-types.ts 🆕

**Path:** `quran_frontend/src/lib/report-types.ts`

**Purpose:** TypeScript interfaces for the student report system.

**What it does:**
- Defines StudentReport (student info, summary, classes, mistakes by surah, repeated mistakes, performance trend)
- Defines StudentClass, ClassAssignment, ClassMistake for class-level data
- Defines MistakeBySurah and RepeatedMistake for mistake analysis
- Defines DatePreset ('1m', '2m', '6m', 'all') and ReportFilters for filter state
- Defines ExportConfig for PDF/CSV/Word export settings
- Defines PerformanceStats (streaks, trends, sparkline data)

---

#### 📄 src/lib/report-export.ts 🆕

**Path:** `quran_frontend/src/lib/report-export.ts`

**Purpose:** Report export utilities providing PDF, CSV, and Word export for student reports.

**What it does:**
- PDF export: backend Playwright-based rendering with client-side html2pdf.js fallback
- CSV export: generates comma-separated data using file-saver
- Word export: generates .docx files using the docx library with tables, headings, and formatted text
- Builds filter summary text from active filters
- Formats dates for export documents

**Key Functions:**
- `exportToPDFBackend(config)` -- Sends report to backend for Playwright PDF generation
- `exportToCSV(config)` -- Generates and downloads CSV file
- `exportToWord(config)` -- Generates and downloads .docx file

**Integrates with:** -> `report-types.ts`, -> `quran-utils.ts`, -> `file-saver`, -> `docx`, -> `html2pdf.js`

---

#### 📄 src/lib/database.types.ts 🆕

**Path:** `quran_frontend/src/lib/database.types.ts`

**Purpose:** Auto-generated TypeScript types for Supabase database schema.

**What it does:**
- Provides typed interfaces for all Supabase tables (profiles, classes, assignments, mistakes, etc.)
- Used by supabase-api.ts for type-safe database queries
- Generated from Supabase CLI schema introspection

---

### 📂 quran_frontend/public/fonts/qpc/

**Purpose:** Contains 604 QPC WOFF2 font files for web Quran page rendering.

**What it does:**
- Stores WOFF2 font files (QCF_P001.woff2 to QCF_P604.woff2)
- Each font contains glyphs specific to that page
- Fonts are loaded dynamically based on current page
- Total size approximately 48MB

---

### 📂 quran_frontend/src-tauri/ 🆕

**Purpose:** Tauri v2 desktop application shell that wraps the React web frontend with a bundled FastAPI backend.

**What it does:**
- Provides a native desktop window (1280x800, min 900x600) for QuranTrack
- Embeds the Vite-built React frontend as the desktop UI
- Manages a PyInstaller-bundled FastAPI sidecar (quran-backend executable)
- Spawns sidecar on app startup, kills it on window close
- Logs sidecar stdout/stderr for debugging
- Configures CSP for Supabase, Google Fonts, and localhost API access
- Bundles app icons for Windows (.ico), macOS (.icns), iOS, and Android

**Contains:** src/main.rs, src/lib.rs, Cargo.toml, tauri.conf.json, build.rs, capabilities/, icons/, binaries/, resources/

---

#### 🦀 src-tauri/src/lib.rs 🆕

**Path:** `quran_frontend/src-tauri/src/lib.rs`

**Purpose:** Main Tauri application logic with sidecar lifecycle management.

**What it does:**
- Initializes Tauri app with shell plugin for sidecar support
- Spawns "quran-backend" sidecar executable on app setup
- Stores sidecar child handle in SidecarState (Mutex-protected)
- Background task logs sidecar stdout/stderr and detects termination
- Kills sidecar process on window close event to prevent orphan processes

**Key Structs:**
- `SidecarState` -- Holds Mutex<Option<CommandChild>> for sidecar lifecycle

---

#### 🦀 src-tauri/src/main.rs 🆕

**Path:** `quran_frontend/src-tauri/src/main.rs`

**Purpose:** Desktop entry point that delegates to lib.rs run() function.

---

#### 📄 src-tauri/Cargo.toml 🆕

**Path:** `quran_frontend/src-tauri/Cargo.toml`

**Purpose:** Rust package configuration for the Tauri desktop app.

**What it does:**
- Defines quran-track package v0.1.0
- Depends on tauri 2.10.0, tauri-plugin-shell 2, tauri-plugin-log 2
- Builds as staticlib + cdylib + rlib for cross-platform support

---

#### 📄 src-tauri/tauri.conf.json 🆕

**Path:** `quran_frontend/src-tauri/tauri.conf.json`

**Purpose:** Tauri v2 application configuration.

**What it does:**
- Sets product name "QuranTrack" with identifier com.qurantrack.app
- Configures dev URL (localhost:5173) and production frontend dist path
- Defines window properties (1280x800, centered, resizable)
- Configures CSP allowing Supabase, Google Fonts, and localhost:8000
- Declares "quran-backend" as external binary (sidecar)
- Bundle targets: all platforms with icon paths

---

### 📂 quran_mobile/

**Purpose:** Flutter mobile application for Android/iOS with Supabase integration.

**What it does:**
- Provides native mobile experience for QuranTrack
- Uses Supabase Auth for login, signup, and password reset
- Supports QPC page-based Quran rendering with bundled offline fonts
- Provides teacher and student dashboards, class management, and settings
- Uses Riverpod for state management
- Dark/light mode theming with AppColors and AppTheme
- Offline-first: QPC fonts bundled as .ttf assets, Quran page data bundled as JSON

**Contains:** lib/, android/, assets/, test/, web/

---

#### 📄 lib/main.dart 🔄

**Path:** `quran_mobile/lib/main.dart`

**Purpose:** Flutter app entry point with Supabase initialization and navigation setup.

**What it does:**
- Initializes Flutter bindings, Supabase client, and system UI style
- Wraps app in ProviderScope for Riverpod
- Configures Material theme using AppTheme
- Sets up authentication flow: shows login if not authenticated, main app if authenticated
- Sets up bottom navigation with 4 screens (Dashboard, Classes, Quran, Settings)

---

#### 📄 lib/config/constants.dart

**Path:** `quran_mobile/lib/config/constants.dart`

**Purpose:** App-wide constants and configuration values.

**What it does:**
- Defines API base URLs for emulator and physical device
- Stores database names and sync settings
- Contains section type constants (hifz, sabqi, revision)
- Maps surah numbers to English names

---

#### 📄 lib/config/app_colors.dart 🆕

**Path:** `quran_mobile/lib/config/app_colors.dart`

**Purpose:** Centralized color palette for light and dark themes.

**What it does:**
- Defines primary, secondary, surface, and accent colors
- Provides separate color sets for light and dark modes
- Used by AppTheme and all screen widgets for consistent theming

---

#### 📄 lib/config/theme.dart 🔄

**Path:** `quran_mobile/lib/config/theme.dart`

**Purpose:** AppTheme class providing Material ThemeData for the app.

**What it does:**
- Creates dark and light ThemeData configurations
- Uses AppColors for consistent color application
- Configures AppBar, Card, Bottom Navigation, and Input themes

---

#### 📄 lib/core/auth/auth_service.dart 🆕

**Path:** `quran_mobile/lib/core/auth/auth_service.dart`

**Purpose:** Supabase authentication service for Flutter.

**What it does:**
- Handles login, signup, and logout via Supabase Auth
- Manages password reset flow
- Provides user session state management

---

#### 📄 lib/core/auth/supabase_config.dart 🆕

**Path:** `quran_mobile/lib/core/auth/supabase_config.dart`

**Purpose:** Supabase client configuration for Flutter.

**What it does:**
- Stores Supabase URL and anonymous key
- Provides helper to initialize the Supabase client

---

#### 📄 lib/core/database/database_helper.dart

**Path:** `quran_mobile/lib/core/database/database_helper.dart`

**Purpose:** SQLite database initialization and access.

**What it does:**
- Manages singleton database instances
- Copies bundled quran.db from assets on first run
- Creates app.db schema with migrations
- Provides separate getters for Quran and App databases

**Key Functions:**
- `quranDatabase` -- Read-only Quran database getter
- `appDatabase` -- Read-write app database getter
- `_initQuranDatabase()` -- Copies from assets if needed
- `_createAppDatabase()` -- Creates tables and indexes

---

#### 📄 lib/core/network/api_client.dart

**Path:** `quran_mobile/lib/core/network/api_client.dart`

**Purpose:** HTTP client for backend API communication.

**What it does:**
- Wraps Dio HTTP client with base configuration
- Persists custom API URL in SharedPreferences
- Provides typed methods for REST operations
- Implements sync pull/push endpoints

**Key Functions:**
- `get()` / `post()` / `put()` / `delete()` -- HTTP methods
- `syncPull()` / `syncPush()` -- Sync operations
- `setBaseUrl()` -- Allows changing API URL at runtime

---

#### 📄 lib/core/services/qpc_font_service.dart 🔄

**Path:** `quran_mobile/lib/core/services/qpc_font_service.dart`

**Purpose:** Loads QPC TTF fonts from bundled assets for offline Quran page rendering.

**What it does:**
- Loads .ttf fonts directly from bundled Flutter assets (assets/fonts/qpc/)
- No network download needed -- all 604 fonts bundled with the app
- Pre-loads fonts for current page, previous page, and next page
- Prevents duplicate font loading with pending load tracking
- Previous platform-specific io_mobile/io_stub files removed (no longer needed with bundled assets)

**Key Functions:**
- `ensureFontsForPage(pageNum)` -- Loads fonts for page and neighbors
- `isFontLoaded(pageNum)` -- Checks if font is already loaded
- `fontFamily(pageNum)` -- Returns font family name for a page

---

#### 📄 lib/core/services/quran_page_data_service.dart 🆕

**Path:** `quran_mobile/lib/core/services/quran_page_data_service.dart`

**Purpose:** Loads Quran page word data from bundled JSON assets.

**What it does:**
- Reads page_NNN.json files from assets/quran-pages/
- Parses JSON into QuranPageData and QuranPageWord models
- Provides page data for MushafPageWidget rendering

---

#### 📄 lib/core/services/arabic_text_utils.dart 🆕

**Path:** `quran_mobile/lib/core/services/arabic_text_utils.dart`

**Purpose:** Shared Arabic text utilities for parsing words into letters and harakat (diacritical marks).

**What it does:**
- Parses Arabic words into separate letter and harakat lists
- Defines 21 Arabic harakat Unicode code points (0x064B-0x065E, 0x0670)
- Combines shadda + following haraka into a single entry (matches web behavior)
- Used by both word_popup.dart (mistake selection) and mushaf_page_widget.dart (char-level rendering)

**Key Classes:**
- `CharInfo` -- Information about a single character (char + index)
- `ParsedWord` -- Result of parsing: separate lists of letters and harakat

**Key Functions:**
- `parseArabicWord(word)` -- Splits Arabic word into letters and harakat
- `isHaraka(char)` -- Checks if a character is a diacritical mark

**Integrates with:** -> `mushaf_page_widget.dart`, -> `classroom/word_popup.dart`

---

#### 📄 lib/core/services/report_helpers.dart 🆕

**Path:** `quran_mobile/lib/core/services/report_helpers.dart`

**Purpose:** Pure helper functions for student report components, ported from web's report-helpers.ts.

**What it does:**
- Provides performance map (perfMap) and label constants
- Badge color generators for performance level, mistake count, and portion type
- Juz-to-surah range lookup using shared juzBoundaries data
- Report filter application logic (date, surah, juz)
- Performance statistics computation (streaks, trends, sparkline)
- Date formatting utilities

**Key Functions:**
- `applyReportFilters(report, filters)` -- Filters StudentReport by date/surah/juz
- `computePerformanceStats(classes)` -- Calculates streaks and trends
- `getSurahRangeForJuz(juz)` -- Returns surah range for a Juz number
- `perfBadgeColor(perf)` / `perfBadgeTextColor(perf)` -- Badge styling

**Integrates with:** -> `data/models/student_report.dart`, -> `data/models/report_filters.dart`, -> `data/quran_data.dart`

---

#### 📄 lib/data/quran_data.dart 🔄

**Path:** `quran_mobile/lib/data/quran_data.dart`

**Purpose:** Static Quran metadata including page-to-surah mappings and Juz boundaries.

**What it does:**
- Maps page numbers to surah numbers for page range helpers
- Provides getPageRangeForSurah() and related utility functions
- Defines JuzBoundary class and juzBoundaries list (30 entries matching Madani Mushaf)
- Used by ClassroomScreen for constraining navigation to assignment ranges
- Used by report_helpers.dart for juz-to-surah range lookup

---

#### 📄 lib/data/models/quran_page_data.dart 🆕

**Path:** `quran_mobile/lib/data/models/quran_page_data.dart`

**Purpose:** Data model for a Quran page containing all words grouped by line.

**What it does:**
- Groups QuranPageWord objects by line number
- Provides sorted line numbers for rendering
- Identifies surah starts and bismillah positions on each page

---

#### 📄 lib/data/models/quran_page_word.dart 🆕

**Path:** `quran_mobile/lib/data/models/quran_page_word.dart`

**Purpose:** Data model for a single word on a Quran page.

**What it does:**
- Stores word data: surah, ayah, position, Arabic text, QPC glyph code, line number
- Parses from JSON matching the page_NNN.json structure
- Used by MushafPageWidget for rendering individual QPC glyphs

---

#### 📄 lib/data/models/app_user.dart 🆕

**Path:** `quran_mobile/lib/data/models/app_user.dart`

**Purpose:** Data model for the authenticated user.

**What it does:**
- Stores user info: id, email, name, role, student_id
- Parsed from Supabase profiles table
- Used by auth providers for user state management

---

#### 📄 lib/data/models/class_session.dart 🔄

**Path:** `quran_mobile/lib/data/models/class_session.dart`

**Purpose:** Data model for a class session.

**What it does:**
- Stores class data: id, date, students, assignments, notes, performance
- Added supabaseId field for UUID/int mismatch resolution with Supabase

---

#### 📄 lib/data/models/mistake.dart 🔄

**Path:** `quran_mobile/lib/data/models/mistake.dart`

**Purpose:** Data model for a mistake record.

**What it does:**
- Stores mistake data: surah, ayah, word position, character info, error count
- Added supabaseId field for UUID/int mismatch resolution with Supabase

---

#### 📄 lib/data/models/student_report.dart 🆕

**Path:** `quran_mobile/lib/data/models/student_report.dart`

**Purpose:** Student report data models mirroring web's report-types.ts interfaces.

**What it does:**
- Defines StudentReport (student info, summary, classes, mistakes by surah, repeated mistakes, performance trend)
- Defines StudentInfo, ReportSummary, StudentClass, ClassAssignment, ClassMistake
- Defines MistakeBySurah and RepeatedMistake for mistake analysis
- Defines PerformanceDataPoint for trend charting
- All classes have copyWith() methods for immutable state updates

---

#### 📄 lib/data/models/report_filters.dart 🆕

**Path:** `quran_mobile/lib/data/models/report_filters.dart`

**Purpose:** Report filter and performance stats models mirroring web's report-types.ts.

**What it does:**
- Defines DatePreset enum (oneMonth, twoMonths, sixMonths, all)
- Defines ReportFilters (dateFrom, dateTo, datePreset, surahFrom, surahTo, juz) with copyWith
- Defines PerformanceStats (currentStreak, bestStreak, mistakesPerClass, trend, sparkline)
- Provides isActive getter to check if any filter is active

---

#### 📄 lib/data/models/suggested_portions.dart 🆕

**Path:** `quran_mobile/lib/data/models/suggested_portions.dart`

**Purpose:** Data models for Smart Suggestions feature, mirroring web's SuggestedPortions interface.

**What it does:**
- Defines SuggestedPortion (startSurah, endSurah, startAyah, endAyah, surahName, note)
- Defines SuggestedPortions (hifz, sabqi, manzil, lastClass) for pre-filling class portions

---

### 📂 quran_mobile/lib/data/models/

**Purpose:** Dart model classes for data entities.

**Contains:** assignment.dart, class_session.dart, mistake.dart, surah.dart, app_user.dart, quran_page_data.dart, quran_page_word.dart, student_report.dart, report_filters.dart, suggested_portions.dart

---

### 📂 quran_mobile/lib/data/repositories/

**Purpose:** Repository classes for data access abstraction.

**Contains:** class_repository.dart, mistake_repository.dart, quran_repository.dart

---

#### 📄 lib/presentation/providers/providers.dart 🔄

**Path:** `quran_mobile/lib/presentation/providers/providers.dart`

**Purpose:** Riverpod providers for state management.

**What it does:**
- Defines providers for repositories and services
- Implements ClassesNotifier and MistakesNotifier state classes
- Provides family providers for single entities
- Added teacherStudentsProvider and student selector for mistakes RLS
- Handles web mock data for development

**Key Providers:**
- `classesProvider` -- StateNotifier for class list
- `mistakesProvider` -- StateNotifier for mistake list
- `surahListProvider` -- FutureProvider for surah data
- `syncServiceProvider` -- Sync service instance
- `teacherStudentsProvider` -- Teacher's student list for mistake insertion

---

#### 📄 lib/presentation/providers/auth_provider.dart 🆕

**Path:** `quran_mobile/lib/presentation/providers/auth_provider.dart`

**Purpose:** Riverpod provider for Supabase authentication state.

**What it does:**
- Manages auth state (logged in/out, current user)
- Wraps AuthService for Riverpod consumption
- Provides login, signup, logout, and password reset actions

---

#### 📄 lib/presentation/providers/theme_provider.dart 🆕

**Path:** `quran_mobile/lib/presentation/providers/theme_provider.dart`

**Purpose:** Riverpod provider for dark/light theme state.

**What it does:**
- Manages theme mode (dark/light)
- Persists theme preference
- Provides toggle function

---

#### 📄 lib/presentation/providers/quran_page_provider.dart 🆕

**Path:** `quran_mobile/lib/presentation/providers/quran_page_provider.dart`

**Purpose:** Riverpod provider for Quran page data loading.

**What it does:**
- Loads QPC page word data for a given page number
- Manages font loading state via QpcFontService
- Provides QuranPageData to MushafPageWidget

---

#### 📄 lib/presentation/providers/report_provider.dart 🆕

**Path:** `quran_mobile/lib/presentation/providers/report_provider.dart`

**Purpose:** Riverpod providers for fetching and filtering student report data from Supabase.

**What it does:**
- Defines studentReportProvider (FutureProvider.family) that fetches full report from Supabase
- Queries profiles, class_students, classes, assignments, mistakes, and mistake_occurrences
- Builds per-class mistake mapping from occurrences
- Computes summary statistics (total mistakes, unique, repeated, avg performance)
- Groups mistakes by surah and identifies repeated mistakes
- Mirrors web's supabase-api.ts:getStudentReport() logic

**Key Providers:**
- `studentReportProvider` -- FutureProvider.family<StudentReport, String> keyed by studentId

**Integrates with:** -> `data/models/student_report.dart`, -> `core/services/report_helpers.dart`

---

### 📂 quran_mobile/lib/presentation/screens/

**Purpose:** UI screens for the mobile app.

**Contains:** auth/, classes/, classroom/, dashboard/, reader/, settings/

---

#### 📄 lib/presentation/screens/auth/login_screen.dart 🆕

**Path:** `quran_mobile/lib/presentation/screens/auth/login_screen.dart`

**Purpose:** Flutter login screen with Supabase authentication.

**What it does:**
- Email/password login form
- Islamic background image with dark gradient overlay
- Al-Isra 17:9 ayah display in Arabic and English
- Links to signup and forgot password screens
- Centered card layout for tablet/larger screens

---

#### 📄 lib/presentation/screens/auth/signup_screen.dart 🆕

**Path:** `quran_mobile/lib/presentation/screens/auth/signup_screen.dart`

**Purpose:** Flutter signup screen with role selection.

**What it does:**
- Registration with name, email, password
- Role selection (teacher/student)
- Same Islamic background as login screen

---

#### 📄 lib/presentation/screens/auth/forgot_password_screen.dart 🆕

**Path:** `quran_mobile/lib/presentation/screens/auth/forgot_password_screen.dart`

**Purpose:** Flutter password reset request screen.

**What it does:**
- Accepts email for password reset
- Sends reset link via Supabase Auth

---

#### 📄 lib/presentation/screens/classroom/classroom_screen.dart 🔄

**Path:** `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart`

**Purpose:** Active class session screen with QPC Quran reader and mistake tracking.

**What it does:**
- Integrates MushafPageWidget for QPC glyph rendering (replaced plain Arabic text)
- Swipe navigation via PageView.builder (RTL) between pages
- Page navigation constrained to assignment's page range
- Interactive word tap/long-press callbacks for mistake marking
- Mistakes summary moved below the fold (scroll down to see)
- Student selector dropdown for teachers (RLS-compliant)

---

#### 📄 lib/presentation/screens/reader/quran_reader_screen.dart 🔄

**Path:** `quran_mobile/lib/presentation/screens/reader/quran_reader_screen.dart`

**Purpose:** Standalone Quran reader with page-based QPC glyph rendering.

**What it does:**
- Complete rewrite from surah-based plain text to 604-page QPC rendering
- Fullscreen immersive mode matching printed Mushaf experience
- Cream background (#FEF9E7) always, regardless of theme
- Font download/cache service for QPC TTF fonts
- Bundled JSON page data for word positions
- Surah headers and bismillah display
- Mistake highlighting with color-coded severity

---

#### 📄 lib/presentation/screens/dashboard/dashboard_screen.dart 🔄

**Path:** `quran_mobile/lib/presentation/screens/dashboard/dashboard_screen.dart`

**Purpose:** Teacher/Student dashboard with stats and quick actions.

**What it does:**
- Redesigned to match React web app layout
- Teacher view: Add Student button, Start New Class, stat cards with badges
- Student view: stats overview (shows "Student Management Coming Soon" for teachers)
- StatCard widget with badge support

---

#### 📄 lib/presentation/screens/settings/settings_screen.dart 🔄

**Path:** `quran_mobile/lib/presentation/screens/settings/settings_screen.dart`

**Purpose:** App settings with account management.

**What it does:**
- Account section with Sign Out button
- Theme toggle (light/dark mode)
- API URL configuration
- Fixed ListTile button width overflow issue

---

#### 📄 lib/presentation/screens/classes/classes_screen.dart 🔄

**Path:** `quran_mobile/lib/presentation/screens/classes/classes_screen.dart`

**Purpose:** Class list screen with student pills for teachers and ReportPanel for student data.

**What it does:**
- Teacher view: horizontal student pill selector + ReportPanel showing selected student's data
- Student view: shows own report using ReportPanel with current user's ID
- Class card navigation to ClassroomScreen
- Delete class support for teachers

---

#### 📄 lib/presentation/screens/classes/create_class_screen.dart 🔄

**Path:** `quran_mobile/lib/presentation/screens/classes/create_class_screen.dart`

**Purpose:** Class creation screen for teachers with multi-mode portion selection.

**What it does:**
- Student selection from teacher's roster
- Multi-mode portion assignment (By Surah, By Page) for Hifz, Sabqi, Manzil
- Smart suggestions pre-fill from last class data
- Supabase integration for class creation

---

### 📂 quran_mobile/lib/presentation/screens/classes/report/ 🆕

**Purpose:** Flutter report widgets mirroring the web's teacher-classes report components.

**What it does:**
- Provides a complete report system for the mobile classes screen
- Same tab-based architecture as web: filter bar, summary strip, classes/mistakes/performance tabs
- All components use Riverpod for state management
- Theme-aware styling using AppColors

**Contains:** report_panel.dart, report_filter_bar.dart, report_summary_strip.dart, report_classes_tab.dart, report_mistakes_tab.dart, report_performance_tab.dart

---

#### 📄 lib/presentation/screens/classes/report/report_panel.dart 🆕

**Path:** `quran_mobile/lib/presentation/screens/classes/report/report_panel.dart`

**Purpose:** Report orchestrator that assembles filter bar, summary strip, tabs, and tab content (mirrors web ReportPanel.tsx).

**What it does:**
- ConsumerStatefulWidget that manages active tab, filters, and expanded class state
- Watches studentReportProvider for data and applies filters reactively
- Computes performance stats from filtered data
- Renders 3 tabs: Classes, Mistakes, Performance
- Resets state when student changes

---

#### 📄 lib/presentation/screens/classes/report/report_filter_bar.dart 🆕

**Path:** `quran_mobile/lib/presentation/screens/classes/report/report_filter_bar.dart`

**Purpose:** Filter bar with month pills and surah/juz selectors (mirrors web ReportFilterBar.tsx).

---

#### 📄 lib/presentation/screens/classes/report/report_summary_strip.dart 🆕

**Path:** `quran_mobile/lib/presentation/screens/classes/report/report_summary_strip.dart`

**Purpose:** Horizontal 5-stat summary strip (mirrors web ReportSummaryStrip.tsx).

---

#### 📄 lib/presentation/screens/classes/report/report_classes_tab.dart 🆕

**Path:** `quran_mobile/lib/presentation/screens/classes/report/report_classes_tab.dart`

**Purpose:** Classes table with expandable rows (mirrors web ReportClassesTab.tsx).

---

#### 📄 lib/presentation/screens/classes/report/report_mistakes_tab.dart 🆕

**Path:** `quran_mobile/lib/presentation/screens/classes/report/report_mistakes_tab.dart`

**Purpose:** Mistakes by surah and repeated mistakes list (mirrors web ReportMistakesTab.tsx).

---

#### 📄 lib/presentation/screens/classes/report/report_performance_tab.dart 🆕

**Path:** `quran_mobile/lib/presentation/screens/classes/report/report_performance_tab.dart`

**Purpose:** Performance bar chart with stats sidebar (mirrors web ReportPerformanceTab.tsx).

---

### 📂 quran_mobile/lib/presentation/widgets/ 🔄

**Purpose:** Reusable UI widgets for the mobile app.

**Contains:** mushaf_page_widget.dart, surah_header_widget.dart, bismillah_widget.dart, glassmorphic_card.dart, section_badge.dart, common/

---

#### 📄 lib/presentation/widgets/mushaf_page_widget.dart 🆕

**Path:** `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart`

**Purpose:** Renders a single Mushaf page with QPC glyphs matching the printed Mushaf.

**What it does:**
- Displays lines distributed evenly across a cream (#FEF9E7) background
- Uses QPC font families for page-specific glyph rendering
- Supports word tap and long-press callbacks for interaction
- Shows surah headers and bismillah at appropriate positions
- Highlights mistakes with color-coded overlays
- Dark mode: card with shadow; Light mode: seamless cream background

---

#### 📄 lib/presentation/widgets/surah_header_widget.dart 🆕

**Path:** `quran_mobile/lib/presentation/widgets/surah_header_widget.dart`

**Purpose:** Renders styled surah name headers on Mushaf pages.

**What it does:**
- Displays surah name in decorative Arabic calligraphy style
- Matches the styling of printed Mushaf surah dividers

---

#### 📄 lib/presentation/widgets/bismillah_widget.dart 🆕

**Path:** `quran_mobile/lib/presentation/widgets/bismillah_widget.dart`

**Purpose:** Renders the Bismillah text at the start of surahs.

**What it does:**
- Displays styled Bismillah in cyan-700 color
- Shown at the start of surahs 2-114 (except surah 9)
- Surah 1 (Al-Fatiha): Bismillah is ayah 1 (no separate display)

---

#### 📄 lib/presentation/widgets/common/avatar_circle.dart 🆕

**Path:** `quran_mobile/lib/presentation/widgets/common/avatar_circle.dart`

**Purpose:** Circular avatar widget with initials.

---

#### 📄 lib/presentation/widgets/common/common_widgets.dart 🆕

**Path:** `quran_mobile/lib/presentation/widgets/common/common_widgets.dart`

**Purpose:** Shared utility widgets used across multiple screens.

---

#### 📄 lib/presentation/widgets/common/gradient_button.dart 🆕

**Path:** `quran_mobile/lib/presentation/widgets/common/gradient_button.dart`

**Purpose:** Gradient-styled button widget matching app theme.

---

#### 📄 lib/presentation/widgets/common/icon_input_field.dart 🆕

**Path:** `quran_mobile/lib/presentation/widgets/common/icon_input_field.dart`

**Purpose:** Text input field with leading icon, used on auth screens.

---

### 📂 quran_mobile/assets/fonts/qpc/ 🆕

**Purpose:** Contains 604 QPC TTF font files bundled directly with the Flutter app for fully offline rendering.

**What it does:**
- Stores TrueType (.ttf) QPC fonts (QCF_P001.ttf to QCF_P604.ttf) bundled as Flutter assets
- Loaded directly by QpcFontService from asset bundle (no network download needed)
- Enables fully offline Quran rendering on mobile devices
- Same fonts as quran_backend/fonts/qpc/ but accessed via Flutter asset system

**Contains:** 604 TTF font files

---

### 📂 quran_mobile/assets/quran-pages/ 🆕

**Purpose:** Contains 605 JSON files with QPC word data for each Quran page (bundled with app).

**What it does:**
- Stores word-by-word data identical to quran_backend/quran-pages/
- Bundled directly in the Flutter app assets for offline-first reading
- Includes page_001.json through page_604.json plus all_pages.json
- Used by quran_page_data_service.dart to load page data

**Contains:** 605 JSON files

---

### 📂 scripts/ 🆕

**Purpose:** Project-wide utility scripts.

**Contains:** convert_fonts.py

---

#### 🐍 scripts/convert_fonts.py 🆕

**Path:** `scripts/convert_fonts.py`

**Purpose:** Converts QPC WOFF2 fonts to TTF format for Flutter mobile app.

**What it does:**
- Reads WOFF2 files from quran_frontend/public/fonts/qpc/
- Converts each font to TTF using fontTools library
- Outputs TTF files to quran_backend/fonts/qpc/
- Requires: pip install fonttools brotli
- Converts all 604 page-specific fonts (QCF_P001 to QCF_P604)

---

### 📂 docs/

**Purpose:** Project documentation organized by category.

**What it does:**
- Contains all project documentation in organized subfolders
- Main entry point is PROJECT_CHANGELOG.md
- Architecture docs for system design and planning
- Technical implementation details for developers
- Troubleshooting guides for AI assistants
- Session logs for tracking development work
- Production readiness analysis
- Template for session logs

**Contains:** PROJECT_CHANGELOG.md, PRODUCTION_READINESS.md, Architecture/, Technical Implementation Journey/, Guides/, Logs/, agents/, Mockups/

---

#### 📄 docs/PROJECT_CHANGELOG.md 🔄

**Path:** `docs/PROJECT_CHANGELOG.md`

**Purpose:** Main reference guide and chronological record of what has been built.

**What it does:**
- Documents all development phases (Foundation through Phase 15+)
- Provides a directory map of all documentation
- Links to detailed implementation docs
- Tracks feature completion status
- Now includes Phases 12-15: Supabase migration, Flutter overhaul, Quran Reader responsive, light mode fixes
- Updated documentation directory listing with new subdirectories

---

#### 📄 docs/PRODUCTION_READINESS.md 🆕

**Path:** `docs/PRODUCTION_READINESS.md`

**Purpose:** Production readiness analysis identifying what works and what needs fixing.

**What it does:**
- Lists completed features that are production-ready (QPC rendering, auth, mistake tracking)
- Identifies critical gaps (student management, mobile offline sync, error handling)
- Prioritizes work needed before production deployment
- Generated February 2026 during Flutter Quran Reader development
- Moved from project root to docs/ during documentation overhaul

---

#### 📄 docs/TEMPLATE.md 🆕

**Path:** `docs/TEMPLATE.md`

**Purpose:** Template for development session logs.

**What it does:**
- Defines naming convention for session logs (YYYY-MM-DD-NNN-brief-description.md)
- Provides markdown template with sections: Objective, Summary, Work Completed, Issues
- Moved from project root to docs/ during documentation overhaul

---

### 📂 docs/Logs/ 🔄

**Purpose:** Development session logs tracking what was accomplished in each work session.

**What it does:**
- Contains 43 timestamped session logs following the TEMPLATE.md format
- Tracks objectives, work completed, issues encountered, and next steps
- Covers development from Feb 15-21, 2026

**Contains:** 43 session logs (2026-02-15-001 through 2026-02-21-004) + TEMPLATE.md

---

#### 📄 docs/Logs/ (43 session logs) 🔄

**Path:** `docs/Logs/*.md`

**Purpose:** Development session logs from February 15-21, 2026.

**What it does:**
- 2026-02-15: 4 logs — docs overhaul, test feature removal, student reports, report redesign
- 2026-02-16: 4 logs — classes revamp planning, implementation, architecture fix, export/PDF
- 2026-02-17: 5 logs — Tauri desktop planning, Phase 1-4 implementation
- 2026-02-18: 5 logs — UX polish, responsive fixes, Flutter QPC/classes, runtime fixes, UX polish
- 2026-02-19: 10 logs — implementation plans, features, Flutter audit, Supabase RLS, mobile mistakes, char-level rendering, web recent classes, light mode
- 2026-02-20: 7 logs — light mode, juz selection, input UX, Flutter page selector, student view audit, light mode fixes, student stats
- 2026-02-21: 4 logs — input focus fix, auto-update strategy, nuke data, project map update

---

### 📂 docs/Architecture/

**Purpose:** High-level system design and planning documents.

**What it does:**
- Contains architecture blueprints created during planning
- Documents user identity and relationships design
- Provides system overview diagrams
- Includes Supabase migration architecture documentation

**Contains:** 5 files (3 markdown + 1 HTML + 1 migration doc)

---

#### 📄 docs/Architecture/QuranTrack_Academy_Architecture_Blueprint.md 🔄

**Path:** `docs/Architecture/QuranTrack_Academy_Architecture_Blueprint.md`

**Purpose:** Main architecture blueprint for the application. (Renamed from Title_Case)

**What it does:**
- Defines overall system architecture
- Documents component relationships
- Outlines data flow between frontend, backend, and databases

---

#### 📄 docs/Architecture/Logical_Architecture_Blueprint_User_Identity_And_Relationships.md 🔄

**Path:** `docs/Architecture/Logical_Architecture_Blueprint_User_Identity_And_Relationships.md`

**Purpose:** User identity and relationship system design. (Renamed from Title_Case)

**What it does:**
- Documents teacher-student relationships
- Defines user roles and permissions
- Explains class-student associations

---

#### 📄 docs/Architecture/Quran_Full_App.md 🔄

**Path:** `docs/Architecture/Quran_Full_App.md`

**Purpose:** Full application overview and feature planning. (Renamed from Title_Case)

**What it does:**
- Comprehensive app feature documentation
- Planning document for all app capabilities

---

#### 📄 docs/Architecture/Supabase_Migration_Architecture.md 🆕

**Path:** `docs/Architecture/Supabase_Migration_Architecture.md`

**Purpose:** Supabase cloud migration architecture and database schema design.

**What it does:**
- Documents the migration from custom JWT/SQLite to Supabase Auth/PostgreSQL
- Defines 7 Supabase tables, 14 RLS policies, and 4 triggers
- Provides complete database schema with column definitions
- Documents migration strategy and rollback plan

---

#### 📄 docs/Architecture/Supabase_Migration_Architecture.html 🆕

**Path:** `docs/Architecture/Supabase_Migration_Architecture.html`

**Purpose:** Interactive HTML viewer for Supabase migration architecture.

---

### 📂 docs/Technical Implementation Journey/

**Purpose:** Detailed documentation of how features were actually built.

**What it does:**
- Provides implementation details for developers
- Documents API endpoints and data models
- Explains complex features like QPC rendering, test scoring, and Supabase migration
- Contains subdirectories for major feature areas

**Contains:** 17 standalone files + 3 subdirectories (Flutter App Overhaul/, Quran Reader/, Supabase Implementation/)

---

#### 📄 docs/Technical Implementation Journey/Technical_Documentation.md 🔄

**Path:** `docs/Technical Implementation Journey/Technical_Documentation.md`

**Purpose:** Full technical overview of the system including all API endpoints and database schema.

**What it does:**
- Comprehensive technical documentation covering all endpoints
- API reference with request/response schemas
- Database schema documentation (now includes sync_log table, sync columns)
- Documents 8 previously missing API endpoints (local, sync, font, page endpoints)
- Documents 3 previously missing DB tables
- Fixed test endpoint path (/classes/{id}/test, not /tests/by-class/{id})

---

#### 📄 docs/Technical Implementation Journey/Auth_System.md 🔄

**Path:** `docs/Technical Implementation Journey/Auth_System.md`

**Purpose:** Authentication system documentation. (Renamed from ALL_CAPS)

**What it does:**
- Documents JWT authentication flow (signup, login, refresh)
- Explains user roles (Teacher = verified, Student = unverified)
- Documents Student ID generation (STU-XXXXXX format)
- Lists all auth-related API endpoints

---

#### 📄 docs/Technical Implementation Journey/Classes_And_Mistakes.md 🔄

**Path:** `docs/Technical Implementation Journey/Classes_And_Mistakes.md`

**Purpose:** Class and mistake tracking system documentation. (Renamed from ALL_CAPS)

**What it does:**
- Documents class creation and management
- Explains assignment types (Hifz, Sabqi, Revision)
- Details mistake tracking (word-level and character-level)
- Covers mistake occurrence tracking per class

---

#### 📄 docs/Technical Implementation Journey/Qpc_Quran_Rendering.md 🔄

**Path:** `docs/Technical Implementation Journey/Qpc_Quran_Rendering.md`

**Purpose:** QPC font rendering system documentation. (Renamed from ALL_CAPS)

**What it does:**
- Explains QPC (Quran Printing Complex) font system
- Documents page-specific font loading (604 fonts)
- Covers glyph codes and line number system
- Details overflow ayah handling with previous page fonts

---

#### 📄 docs/Technical Implementation Journey/Auth_Navigation_Fixes.md 🆕

**Path:** `docs/Technical Implementation Journey/Auth_Navigation_Fixes.md`

**Purpose:** Documentation of auth navigation issues and their fixes after Supabase migration.

**What it does:**
- Documents race condition and localStorage corruption fixes
- Covers timeout mechanism for stuck auth operations
- Documents rapid navigation freeze fix
- Covers API migration details (mistakes, suggested portions, performance)
- Includes testing checklist and key learnings about Supabase migration

---

#### 📄 docs/Technical Implementation Journey/Settings_Password_Reset.md 🔄

**Path:** `docs/Technical Implementation Journey/Settings_Password_Reset.md`

**Purpose:** Settings page and password reset feature documentation.

**What it does:**
- Documents Settings page implementation (profile editing, password change)
- Documents Forgot Password flow with Supabase email reset
- Documents Reset Password page for email-link-based recovery
- Documents undocumented frontend pages added in Feb 2026 audit

---

#### 📄 docs/Technical Implementation Journey/Light_Dark_Mode_Implementation.md 🆕

**Path:** `docs/Technical Implementation Journey/Light_Dark_Mode_Implementation.md`

**Purpose:** Light/dark mode theming implementation documentation.

**What it does:**
- Documents ThemeContext implementation
- Explains CSS custom properties for both themes
- Covers conditional styling patterns across all pages
- Documents light mode: cyan/teal gradient; dark mode: dark slate

---

#### 📄 docs/Technical Implementation Journey/Student_Reports.md 🆕

**Path:** `docs/Technical Implementation Journey/Student_Reports.md`

**Purpose:** Student report feature documentation (data model, UI design, export capabilities).

**What it does:**
- Documents the tab-based report dashboard design (classes, mistakes, performance tabs)
- Explains report data model and Supabase queries
- Covers export implementation (PDF, CSV, Word)
- Documents filter system (date, surah, juz)

---

#### 📄 docs/Technical Implementation Journey/Classes_Revamp_Plan.md 🆕

**Path:** `docs/Technical Implementation Journey/Classes_Revamp_Plan.md`

**Purpose:** Planning document for the classes page revamp with inline student reports.

---

#### 📄 docs/Technical Implementation Journey/Classes_Revamp_Agents.md 🆕

**Path:** `docs/Technical Implementation Journey/Classes_Revamp_Agents.md`

**Purpose:** Agent coordination guide for the classes revamp multi-agent implementation.

---

#### 📄 docs/Technical Implementation Journey/Classes_Revamp_Implementation.md 🆕

**Path:** `docs/Technical Implementation Journey/Classes_Revamp_Implementation.md`

**Purpose:** Classes revamp implementation documentation including report components and PDF export architecture.

---

#### 📄 docs/Technical Implementation Journey/Tauri_Desktop_App_Plan.md 🆕

**Path:** `docs/Technical Implementation Journey/Tauri_Desktop_App_Plan.md`

**Purpose:** Tauri v2 desktop app planning document covering 4 implementation phases.

**What it does:**
- Documents Phase 1 (scaffold), Phase 2 (PyInstaller sidecar), Phase 3 (shell integration), Phase 4 (icon + polish)
- Explains sidecar architecture for bundling FastAPI as executable
- Covers CSP configuration for Supabase and Google Fonts access
- Documents parent process watcher for orphan prevention

---

#### 📄 docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md 🆕

**Path:** `docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md`

**Purpose:** Planning document for Flutter offline QPC fonts and classes tab revamp.

---

#### 📄 docs/Technical Implementation Journey/Web_Portion_Management_Plan.md 🆕

**Path:** `docs/Technical Implementation Journey/Web_Portion_Management_Plan.md`

**Purpose:** Planning document for web edit/delete/juz portion management features.

---

#### 📄 docs/Technical Implementation Journey/Flutter_Portion_Management_Plan.md 🆕

**Path:** `docs/Technical Implementation Journey/Flutter_Portion_Management_Plan.md`

**Purpose:** Planning document for Flutter edit/delete/juz/suggestions portion management features.

---

#### 📄 docs/Technical Implementation Journey/Flutter_CharLevel_Mistakes_Alignment.md 🆕

**Path:** `docs/Technical Implementation Journey/Flutter_CharLevel_Mistakes_Alignment.md`

**Purpose:** Documentation for aligning Flutter char-level mistake rendering with web implementation.

**What it does:**
- Documents the 21 harakat Unicode code points used in Arabic text parsing
- Explains shadda + haraka combination logic
- Covers letter joining issues for isolated Arabic characters

---

#### 📄 docs/Technical Implementation Journey/Flutter_UX_Polish.md 🆕

**Path:** `docs/Technical Implementation Journey/Flutter_UX_Polish.md`

**Purpose:** Flutter UX polish documentation covering dashboard, mistake display, and class creation improvements.

---

### 📂 docs/Technical Implementation Journey/Flutter App Overhaul/ 🆕

**Purpose:** Documentation for the Flutter mobile app complete overhaul (Phase 13).

**What it does:**
- Documents the transition from placeholder Flutter app to full-featured mobile app
- Covers theme system, authentication, navigation, screens, widgets, and Quran reader
- Organized as numbered files (00-OVERVIEW through 06-QURAN-READER)

**Contains:** 7 markdown files

---

#### 📄 docs/Technical Implementation Journey/Flutter App Overhaul/00-OVERVIEW.md 🔄

**Path:** `docs/Technical Implementation Journey/Flutter App Overhaul/00-OVERVIEW.md`

**Purpose:** Overview of the Flutter app overhaul project.

**What it does:**
- Summarizes what changed in Phase 13 (auth, theme, screens, QPC reader)
- Documents architecture decisions and package dependencies
- Updated "No Sync" statement to reflect Phase 12 local-first sync addition
- Documents Flutter Settings and Create Class screens (added in Feb 2026 audit)

---

#### 📄 docs/Technical Implementation Journey/Flutter App Overhaul/01-THEME-SYSTEM.md 🆕

**Path:** `docs/Technical Implementation Journey/Flutter App Overhaul/01-THEME-SYSTEM.md`

**Purpose:** Flutter theme system implementation documentation.

---

#### 📄 docs/Technical Implementation Journey/Flutter App Overhaul/02-AUTHENTICATION.md 🔄

**Path:** `docs/Technical Implementation Journey/Flutter App Overhaul/02-AUTHENTICATION.md`

**Purpose:** Flutter Supabase authentication implementation documentation.

---

#### 📄 docs/Technical Implementation Journey/Flutter App Overhaul/03-NAVIGATION.md 🆕

**Path:** `docs/Technical Implementation Journey/Flutter App Overhaul/03-NAVIGATION.md`

**Purpose:** Flutter navigation architecture documentation.

---

#### 📄 docs/Technical Implementation Journey/Flutter App Overhaul/04-SCREENS.md 🔄

**Path:** `docs/Technical Implementation Journey/Flutter App Overhaul/04-SCREENS.md`

**Purpose:** Flutter screen implementations documentation.

**What it does:**
- Documents all Flutter screens: Dashboard, Classes, Classroom, Settings
- Updated with ClassroomScreen QPC integration (Phase 13.5)
- Updated with swipe navigation and mistakes summary changes
- Documents Settings and Create Class screens (added in Feb 2026 audit)

---

#### 📄 docs/Technical Implementation Journey/Flutter App Overhaul/05-SHARED-WIDGETS.md 🆕

**Path:** `docs/Technical Implementation Journey/Flutter App Overhaul/05-SHARED-WIDGETS.md`

**Purpose:** Flutter shared widgets documentation.

---

#### 📄 docs/Technical Implementation Journey/Flutter App Overhaul/06-QURAN-READER.md 🆕

**Path:** `docs/Technical Implementation Journey/Flutter App Overhaul/06-QURAN-READER.md`

**Purpose:** Flutter Quran Reader QPC rendering documentation.

**What it does:**
- Documents the complete rewrite from surah-based to page-based QPC rendering
- Covers font download/cache service architecture
- Explains MushafPageWidget line layout and glyph rendering
- Documents ClassroomScreen integration (Phase 13.5)

---

### 📂 docs/Technical Implementation Journey/Quran Reader/ 🆕

**Purpose:** Web Quran Reader rendering documentation.

**Contains:** 2 markdown files

---

#### 📄 docs/Technical Implementation Journey/Quran Reader/WEB-READER-RENDERING-ISSUES.md 🆕

**Path:** `docs/Technical Implementation Journey/Quran Reader/WEB-READER-RENDERING-ISSUES.md`

**Purpose:** Web Quran Reader rendering issues and fixes documentation.

**What it does:**
- Documents all rendering problems encountered (text cutoff, overflow, distortion)
- Explains FittedLine scale-to-fit solution
- Documents responsive breakpoint table (phone/tablet/desktop)
- Covers chromeHeight tuning, font sizing, and overflow line fixes
- Final responsive values documented

---

#### 📄 docs/Technical Implementation Journey/Quran Reader/FLUTTER-RENDERING-REFERENCE.md 🆕

**Path:** `docs/Technical Implementation Journey/Quran Reader/FLUTTER-RENDERING-REFERENCE.md`

**Purpose:** Reference documentation for Flutter's QPC rendering approach.

**What it does:**
- Documents how Flutter renders Quran pages with FittedBox(scaleDown)
- Serves as reference for matching behavior in the web FittedLine component
- Explains line layout, font sizing, and aspect ratio calculations

---

### 📂 docs/Technical Implementation Journey/Supabase Implementation/ 🆕

**Purpose:** Supabase cloud database migration documentation.

**Contains:** 3 markdown files

---

#### 📄 docs/Technical Implementation Journey/Supabase Implementation/Implementation_Journey.md 🆕

**Path:** `docs/Technical Implementation Journey/Supabase Implementation/Implementation_Journey.md`

**Purpose:** Step-by-step chronicle of the Supabase migration process.

**What it does:**
- Documents 19+ steps from initial setup to production-ready state
- Covers RLS policy creation, frontend integration, auth migration
- Documents race condition fixes, caching implementation, navigation fixes
- Includes API migration details (from FastAPI to Supabase)

---

#### 📄 docs/Technical Implementation Journey/Supabase Implementation/Supabase_Reference.md 🆕

**Path:** `docs/Technical Implementation Journey/Supabase Implementation/Supabase_Reference.md`

**Purpose:** Supabase configuration and schema reference.

**What it does:**
- Complete database schema with all table definitions
- RLS policy definitions and explanations
- Trigger function documentation
- Configuration reference for environment variables

---

#### 📄 docs/Technical Implementation Journey/Supabase Implementation/Supabase_Frontend_Integration_Reference.md 🆕

**Path:** `docs/Technical Implementation Journey/Supabase Implementation/Supabase_Frontend_Integration_Reference.md`

**Purpose:** Reference for how the React frontend integrates with Supabase.

**What it does:**
- Documents supabase.ts client setup
- Explains supabase-api.ts function patterns
- Covers TypeScript types generation from Supabase CLI
- Documents caching strategy and auth context changes

---

### 📂 docs/agents/ 🆕

**Purpose:** Multi-agent workflow prompts and team coordination documents for parallel AI development sessions.

**What it does:**
- Contains agent-specific task prompts for parallel development (Agent 1-4 with different specializations)
- Team lead coordination prompt for orchestrating multi-agent sessions
- Team overview document describing the agent team structure
- Used during Feb 18-19, 2026 sessions for parallel Flutter/Web feature development

**Contains:** AGENT_1_QPC_FONTS.md, AGENT_1_WEB_PORTIONS.md, AGENT_2_FLUTTER_PORTIONS.md, AGENT_2_FOUNDATION.md, AGENT_3_FLUTTER_POLISH.md, AGENT_3_UI_WIDGETS.md, AGENT_4_DOCS.md, TEAM_LEAD_PROMPT.md, TEAM_OVERVIEW.md

---

### 📂 docs/Mockups/ 🆕

**Purpose:** HTML/PDF mockups for the student report feature design.

**What it does:**
- Contains 3 HTML mockup variants for the student report: timeline (A), tabs (B), printable (C)
- Includes a PDF export of the printable mockup
- Contains a convert.py script for converting mockup HTML to PDF
- Used during the student report design phase (Feb 15-16, 2026)

**Contains:** report-mockup-A-timeline.html, report-mockup-B-tabs.html, report-mockup-C-printable.html, report-mockup-C-printable.pdf, convert.py

---

### 📂 docs/Guides/

**Purpose:** Troubleshooting guides for AI assistants and developers.

**What it does:**
- Provides specific fix guides for common issues
- Written for AI assistants working on the codebase
- Step-by-step instructions with code examples

**Contains:** 3 markdown files (renamed to Title_Case)

---

#### 📄 docs/Guides/Page_Layout_Fix_Guide.md 🔄

**Path:** `docs/Guides/Page_Layout_Fix_Guide.md`

**Purpose:** Guide for fixing Quran page layout issues. (Renamed from ALL_CAPS)

**What it does:**
- Explains the `l` (line number) field in page JSON
- Documents how to fix ayah positioning issues
- Provides Python script for batch fixes
- Includes common issue symptoms and solutions

---

#### 📄 docs/Guides/Font_Overflow_Fix_Guide.md 🔄

**Path:** `docs/Guides/Font_Overflow_Fix_Guide.md`

**Purpose:** Guide for fixing font overflow issues on page boundaries. (Renamed from ALL_CAPS)

**What it does:**
- Explains overflow glyph codes (> 0xFC00)
- Documents previous page font loading requirement
- Provides troubleshooting steps

---

#### 📄 docs/Guides/Seeding_Database.md 🔄

**Path:** `docs/Guides/Seeding_Database.md`

**Purpose:** Guide for seeding the database with test data. (Renamed from ALL_CAPS)

**What it does:**
- Documents the create_test_users.py script
- Lists all test accounts created
- Explains password and student ID format

---

## Documentation

### README.md

**Path:** `README.md`

**Purpose:** Main project documentation and introduction.

- Introduces QuranTrack as a Quran memorization tracking app
- Explains features for teachers (conduct classes, track mistakes, manage students)
- Explains features for students (view progress, review mistakes)
- Documents the tech stack (React, FastAPI, Flutter, Supabase)
- Links to detailed documentation in the docs/ folder

---

### docs/README.md 🆕

**Path:** `docs/README.md`

**Purpose:** Documentation navigation guide with directory tree and quick-links.

- Provides comprehensive directory tree of all documentation files
- Lists quick-links by topic (Auth, Classes, Mistakes, QPC Rendering, etc.)
- Helps developers and AI agents find relevant documentation quickly

---

### AGENTS.md 🆕

**Path:** `AGENTS.md`

**Purpose:** AI agent instructions for non-Claude AI coding assistants.

- Mirrors CLAUDE.md content for compatibility with other AI agents
- Complete codebase map, tech stack, key concepts
- Created during Feb 2026 documentation overhaul

---

### CLAUDE.md 🔄

**Path:** `CLAUDE.md`

**Purpose:** AI agent instructions with comprehensive codebase map.

- Complete directory tree of every file with one-line descriptions
- Tech stack table, database architecture, auth flow documentation
- Key rules for git, databases, QPC fonts, and Quran JSON structure
- Rewritten in Feb 2026 from minimal version to comprehensive guide

---

### docs/PROJECT_CHANGELOG.md 🔄

**Path:** `docs/PROJECT_CHANGELOG.md`

**Purpose:** Main reference guide and chronological record of what has been built.

- Documents all development phases (Foundation through Phase 15+)
- Provides a directory map of all documentation
- Links to detailed implementation docs
- Tracks feature completion status

---

### docs/PRODUCTION_READINESS.md 🆕

**Path:** `docs/PRODUCTION_READINESS.md`

**Purpose:** Production readiness analysis for QuranTrack.

- Lists production-ready features and critical gaps
- Prioritizes work needed before deployment
- Moved from project root to docs/

---

### docs/TEMPLATE.md 🆕

**Path:** `docs/TEMPLATE.md`

**Purpose:** Template for development session logs.

- Naming convention: YYYY-MM-DD-NNN-brief-description.md
- Markdown template with Objective, Summary, Work Completed sections
- Moved from project root to docs/

---

### docs/Logs/ (43 session logs) 🔄

**Path:** `docs/Logs/*.md`

**Purpose:** Development session logs from February 15-21, 2026.

- 43 timestamped logs covering docs overhaul, student reports, classes revamp, Tauri desktop, Flutter features, bug fixes
- Each follows TEMPLATE.md structure: objective, summary, work completed, issues, files changed, next steps

---

### docs/Architecture/QuranTrack_Academy_Architecture_Blueprint.md

**Path:** `docs/Architecture/QuranTrack_Academy_Architecture_Blueprint.md`

**Purpose:** Main architecture blueprint for the application.

- Defines overall system architecture
- Documents component relationships
- Outlines data flow between frontend, backend, and databases

---

### docs/Architecture/Logical_Architecture_Blueprint_User_Identity_And_Relationships.md

**Path:** `docs/Architecture/Logical_Architecture_Blueprint_User_Identity_And_Relationships.md`

**Purpose:** User identity and relationship system design.

- Documents teacher-student relationships
- Defines user roles and permissions
- Explains class-student associations

---

### docs/Architecture/Quran_Full_App.md

**Path:** `docs/Architecture/Quran_Full_App.md`

**Purpose:** Full application overview and feature planning.

- Comprehensive app feature documentation
- Planning document for all app capabilities

---

### docs/Architecture/Supabase_Migration_Architecture.md 🆕

**Path:** `docs/Architecture/Supabase_Migration_Architecture.md`

**Purpose:** Supabase migration architecture and database schema.

- 7 tables, 14 RLS policies, 4 triggers
- Complete schema definitions
- Migration strategy documentation

---

### docs/Technical Implementation Journey/Technical_Documentation.md 🔄

**Path:** `docs/Technical Implementation Journey/Technical_Documentation.md`

**Purpose:** Full technical overview of the system.

- Comprehensive API reference with all endpoints
- Database schema including sync tables and columns
- Fixed in Feb 2026 audit: added 8 missing endpoints, 3 missing tables

---

### docs/Technical Implementation Journey/Auth_System.md

**Path:** `docs/Technical Implementation Journey/Auth_System.md`

**Purpose:** Authentication system documentation.

- Documents JWT authentication flow (signup, login, refresh)
- Explains user roles (Teacher = verified, Student = unverified)
- Documents Student ID generation (STU-XXXXXX format)

---

### docs/Technical Implementation Journey/Classes_And_Mistakes.md

**Path:** `docs/Technical Implementation Journey/Classes_And_Mistakes.md`

**Purpose:** Class and mistake tracking system documentation.

- Documents class creation and management
- Explains assignment types (Hifz, Sabqi, Revision)
- Details mistake tracking (word-level and character-level)

---

### docs/Technical Implementation Journey/Qpc_Quran_Rendering.md

**Path:** `docs/Technical Implementation Journey/Qpc_Quran_Rendering.md`

**Purpose:** QPC font rendering system documentation.

- Explains QPC (Quran Printing Complex) font system
- Documents page-specific font loading (604 fonts)
- Covers glyph codes and line number system

---

### docs/Technical Implementation Journey/Auth_Navigation_Fixes.md 🆕

**Path:** `docs/Technical Implementation Journey/Auth_Navigation_Fixes.md`

**Purpose:** Auth navigation fixes after Supabase migration.

- Race condition and localStorage corruption fixes
- Timeout mechanism for stuck auth
- API migration details and testing checklist

---

### docs/Technical Implementation Journey/Settings_Password_Reset.md 🔄

**Path:** `docs/Technical Implementation Journey/Settings_Password_Reset.md`

**Purpose:** Settings and password reset feature documentation.

- Settings page with profile editing and password change
- Forgot Password and Reset Password flows
- Updated in Feb 2026 audit with missing page documentation

---

### docs/Technical Implementation Journey/Light_Dark_Mode_Implementation.md 🆕

**Path:** `docs/Technical Implementation Journey/Light_Dark_Mode_Implementation.md`

**Purpose:** Light/dark mode theming documentation.

- ThemeContext, CSS custom properties, conditional styling

---

### docs/Technical Implementation Journey/Student_Reports.md 🆕

**Path:** `docs/Technical Implementation Journey/Student_Reports.md`

**Purpose:** Student report feature documentation.

- Tab-based report dashboard design, data model, export capabilities

---

### docs/Technical Implementation Journey/Classes_Revamp_Plan.md 🆕

**Path:** `docs/Technical Implementation Journey/Classes_Revamp_Plan.md`

**Purpose:** Planning document for classes page revamp with inline student reports.

---

### docs/Technical Implementation Journey/Classes_Revamp_Implementation.md 🆕

**Path:** `docs/Technical Implementation Journey/Classes_Revamp_Implementation.md`

**Purpose:** Classes revamp implementation including report components and PDF export architecture.

---

### docs/Technical Implementation Journey/Tauri_Desktop_App_Plan.md 🆕

**Path:** `docs/Technical Implementation Journey/Tauri_Desktop_App_Plan.md`

**Purpose:** Tauri v2 desktop app planning document (4 phases).

- Scaffold, PyInstaller sidecar, shell integration, icon polish

---

### docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md 🆕

**Path:** `docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md`

**Purpose:** Planning for Flutter offline QPC fonts and classes tab revamp.

---

### docs/Technical Implementation Journey/Flutter_CharLevel_Mistakes_Alignment.md 🆕

**Path:** `docs/Technical Implementation Journey/Flutter_CharLevel_Mistakes_Alignment.md`

**Purpose:** Aligning Flutter char-level mistake rendering with web implementation.

---

### docs/Technical Implementation Journey/Flutter_UX_Polish.md 🆕

**Path:** `docs/Technical Implementation Journey/Flutter_UX_Polish.md`

**Purpose:** Flutter UX polish documentation.

---

### docs/agents/ 🆕

**Path:** `docs/agents/`

**Purpose:** Multi-agent workflow prompts (9 files) for parallel AI development sessions.

- Agent 1-4 task prompts, team lead coordination, team overview

---

### docs/Mockups/ 🆕

**Path:** `docs/Mockups/`

**Purpose:** HTML/PDF mockups for the student report feature (5 files).

- Timeline (A), tabs (B), and printable (C) mockup variants

---

### docs/Technical Implementation Journey/Flutter App Overhaul/ 🆕

**Path:** `docs/Technical Implementation Journey/Flutter App Overhaul/`

**Purpose:** Flutter mobile app overhaul documentation (7 files).

- 00-OVERVIEW: Architecture and package overview
- 01-THEME-SYSTEM: Dark/light mode with AppColors
- 02-AUTHENTICATION: Supabase auth in Flutter
- 03-NAVIGATION: Bottom nav and routing
- 04-SCREENS: All screen implementations
- 05-SHARED-WIDGETS: Reusable widget docs
- 06-QURAN-READER: QPC rendering system

---

### docs/Technical Implementation Journey/Quran Reader/ 🆕

**Path:** `docs/Technical Implementation Journey/Quran Reader/`

**Purpose:** Quran Reader rendering documentation (2 files).

- WEB-READER-RENDERING-ISSUES: All web rendering problems and fixes
- FLUTTER-RENDERING-REFERENCE: Reference for matching Flutter's approach

---

### docs/Technical Implementation Journey/Supabase Implementation/ 🆕

**Path:** `docs/Technical Implementation Journey/Supabase Implementation/`

**Purpose:** Supabase migration documentation (3 files).

- Implementation_Journey: Step-by-step migration chronicle
- Supabase_Reference: Schema and RLS configuration reference
- Supabase_Frontend_Integration_Reference: React integration guide

---

### docs/Guides/Page_Layout_Fix_Guide.md

**Path:** `docs/Guides/Page_Layout_Fix_Guide.md`

**Purpose:** Guide for fixing Quran page layout issues.

- Explains line number field and ayah positioning
- Python script for batch fixes

---

### docs/Guides/Font_Overflow_Fix_Guide.md

**Path:** `docs/Guides/Font_Overflow_Fix_Guide.md`

**Purpose:** Guide for fixing font overflow issues.

- Overflow glyph codes documentation
- Previous page font loading requirement

---

### docs/Guides/Seeding_Database.md

**Path:** `docs/Guides/Seeding_Database.md`

**Purpose:** Guide for seeding the database with test data.

- Documents create_test_users.py script
- Lists test accounts and credentials

---

## Git History

**Branch:** main
**Last Commit:** 8684ab7
**Total Commits:** 108
**Repository:** Local

### Recent Commits

#### 🔵 8684ab7 — docs: update README, docs README, CLAUDE.md for scripts/ move
**Author:** Hamza Feroze
**Date:** February 21, 2026

#### 🔵 0c9de7d — refactor: move utility scripts into quran_backend/scripts/
**Author:** Hamza Feroze
**Date:** February 21, 2026

#### 🔵 3e94c22 — chore: add nuke script and clear all data for fresh start
**Author:** Hamza Feroze
**Date:** February 21, 2026

#### 🔵 b4d4596 — fix(web): input focus loss in class creation modal
**Author:** Hamza Feroze
**Date:** February 21, 2026

#### 🔵 a80562f — fix(web): add error logging for mistake_occurrences inserts
**Author:** Hamza Feroze
**Date:** February 21, 2026

#### 🔵 61a30ae — fix(web): student view audit fixes - stats, light mode, links, and classes redesign
**Author:** Hamza Feroze
**Date:** February 21, 2026

#### 🔵 4f216a5 — feat(mobile): add "By Page" portion selector to class creation
**Author:** Hamza Feroze
**Date:** February 20, 2026

#### 🔵 276ce30 — fix(web): number input UX in class creation modal
**Author:** Hamza Feroze
**Date:** February 20, 2026

#### 🔵 5de4d62 — fix(web): Juz selection not applying boundary data on mode switch
**Author:** Hamza Feroze
**Date:** February 20, 2026

#### 🔵 a45342b — fix(web): light/dark mode support for class creation modals
**Author:** Hamza Feroze
**Date:** February 20, 2026

#### 🔵 2ba58f3 — fix(web): recent classes navigation, styling, and student names
**Author:** Hamza Feroze
**Date:** February 19, 2026

#### 🔵 703f966 — feat(web): add Recent Classes section to teacher dashboard
**Author:** Hamza Feroze
**Date:** February 19, 2026

#### 🔵 485be34 — fix(mobile): Arabic letter joining in char-level mistake rendering
**Author:** Hamza Feroze
**Date:** February 19, 2026

#### 🔵 68e38da — fix(mobile): match web's char-level mistake rendering style
**Author:** Hamza Feroze
**Date:** February 19, 2026

#### 🔵 1281c0f — fix(mobile): mistake_occurrences never created for Supabase UUID classIds
**Author:** Hamza Feroze
**Date:** February 19, 2026

#### 🔵 6ede6b6 — fix(mobile): character-level mistakes not rendering on web/Supabase path
**Author:** Hamza Feroze
**Date:** February 19, 2026

#### 🔵 a713779 — fix(mobile): mistake badges not showing on pages without prior mistakes
**Author:** Hamza Feroze
**Date:** February 19, 2026

#### 🔵 ce98161 — fix(web): default all three portion sections to enabled in new class
**Author:** Hamza Feroze
**Date:** February 19, 2026

#### 🔵 9873267 — feat: portion management, char-level polish & smart suggestions (9 features)
**Author:** Hamza Feroze
**Date:** February 19, 2026

#### 🔵 40e66e1 — feat(mobile): UX polish — dashboard students, previous mistakes, class fixes
**Author:** Hamza Feroze
**Date:** February 19, 2026

#### 🔵 0639721 — feat(mobile): offline QPC fonts, classes tab revamp, char-level mistakes
**Author:** Hamza Feroze
**Date:** February 18, 2026

#### 🔵 e08ea94 — docs: add Flutter local QPC fonts + classes revamp planning & agent team setup
**Author:** Hamza Feroze
**Date:** February 18, 2026

#### 🔵 e3a0fb9 — fix(responsive): mobile layout for dashboard, classes, and report components
**Author:** Hamza Feroze
**Date:** February 18, 2026

#### 🔵 6139a5a — fix(ux): friendly login errors, Arabic font (Amiri), CSP for Google Fonts
**Author:** Hamza Feroze
**Date:** February 18, 2026

#### 🔵 4041f65 — feat(tauri): add QuranTrack app icon + fix sidecar parent watcher
**Author:** Hamza Feroze
**Date:** February 18, 2026

#### 🔵 0fd4572 — feat(tauri): wire sidecar lifecycle into Tauri shell (Phase 3)
**Author:** Hamza Feroze
**Date:** February 17, 2026

#### 🔵 bc93b64 — feat(tauri): build PyInstaller sidecar for FastAPI backend (Phase 2)
**Author:** Hamza Feroze
**Date:** February 17, 2026

#### 🔵 0631574 — feat(tauri): scaffold Tauri v2 desktop app shell (Phase 1)
**Author:** Hamza Feroze
**Date:** February 17, 2026

#### 🔵 3308771 — docs: add Tauri desktop app planning doc and session log
**Author:** Hamza Feroze
**Date:** February 17, 2026

#### 🔵 fe2f3cd — feat(export): add backend Playwright PDF export with loading states
**Author:** Hamza Feroze
**Date:** February 17, 2026

#### 🔵 c90a40c — refactor(teacher-classes): inline student report as slide-out panel
**Author:** Hamza Feroze
**Date:** February 16, 2026

#### 🔵 180c066 — feat(report-components): add ReportPanel orchestrator and barrel exports
**Author:** Hamza Feroze
**Date:** February 16, 2026

#### 🔵 dde1e20 — feat(report-components): add classes, mistakes, and performance tab components
**Author:** Hamza Feroze
**Date:** February 16, 2026

#### 🔵 b933837 — feat: Redesign student report as tab-based dashboard with filters
**Author:** Hamza Feroze
**Date:** February 15, 2026

#### 🔵 22dd67c — refactor: Remove test feature completely
**Author:** Hamza Feroze
**Date:** February 15, 2026

#### 🔵 0ca0779 — docs: Add docs README, move TEMPLATE into Logs, update references
**Author:** Hamza Feroze
**Date:** February 15, 2026

#### 🔵 e7f47e1 — docs: Update PROJECT_MAP (40 new commits) and rename session log
**Author:** Hamza Feroze
**Date:** February 15, 2026

#### 🔵 22f00f9 — docs: Full documentation overhaul -- audit, reorganize, and fix all gaps
**Author:** Hamza Feroze
**Date:** February 15, 2026

#### 🔵 840f3c6 — fix: UUID bug, RLS mistakes, swipe nav, scroll-down mistakes summary
**Author:** Hamza Feroze
**Date:** February 11, 2026

#### 🔵 fbfc462 — feat: Integrate QPC Quran Reader into Flutter ClassroomScreen (Phase 13.5)
**Author:** Hamza Feroze
**Date:** February 11, 2026

### Top Contributors

1. Hamza Feroze (108 commits)

---

## Update History

### February 21, 2026 - Update 5 (Latest)

Major update after 47 commits spanning Phases 16-20+ of development. Key additions: student reports with tab-based dashboard, classes revamp with report components, Tauri v2 desktop app, Flutter offline QPC fonts, Flutter classes tab revamp, char-level mistake rendering alignment, smart suggestions, backend scripts reorganization, and many bug fixes across web and mobile.

**Added (new files/directories):**
- `quran_frontend/src/components/teacher-classes/` -- 9 files: ReportPanel, ReportFilterBar, ReportSummaryStrip, ReportClassesTab, ReportMistakesTab, ReportPerformanceTab, ExportModal, report-helpers, index
- `quran_frontend/src/lib/quran-utils.ts` -- Centralized surah names, Juz boundaries
- `quran_frontend/src/lib/report-types.ts` -- TypeScript interfaces for report system
- `quran_frontend/src/lib/report-export.ts` -- PDF, CSV, Word export utilities
- `quran_frontend/src-tauri/` -- Tauri v2 desktop app shell (lib.rs, main.rs, Cargo.toml, tauri.conf.json, icons, capabilities)
- `quran_backend/pyinstaller_entry.py` -- PyInstaller entry point for Tauri sidecar
- `quran_backend/scripts/` -- Moved create_test_users.py, clear_mistakes.py, seed_database.py, seed.js
- `quran_backend/scripts/nuke_all_data.py` -- Nuclear data wipe for Supabase + local
- `quran_mobile/lib/core/services/arabic_text_utils.dart` -- Arabic text parsing (letters + harakat)
- `quran_mobile/lib/core/services/report_helpers.dart` -- Pure report helper functions
- `quran_mobile/lib/data/models/student_report.dart` -- Report data models
- `quran_mobile/lib/data/models/report_filters.dart` -- Filter and stats models
- `quran_mobile/lib/data/models/suggested_portions.dart` -- Smart suggestion models
- `quran_mobile/lib/presentation/providers/report_provider.dart` -- Report data provider
- `quran_mobile/lib/presentation/screens/classes/report/` -- 6 report widgets (panel, filter bar, summary strip, 3 tabs)
- `quran_mobile/assets/fonts/qpc/` -- 604 bundled QPC TTF fonts for offline rendering
- `docs/agents/` -- 9 multi-agent workflow documents
- `docs/Mockups/` -- 5 report mockup files (HTML, PDF, convert script)
- `docs/Technical Implementation Journey/` -- 9 new docs (Student_Reports, Classes_Revamp_*, Tauri_Desktop_App_Plan, Flutter_*, Web_Portion_Management_Plan)
- `docs/Logs/` -- 42 new session logs (2026-02-15 through 2026-02-21)

**Updated (modified files):**
- `quran_frontend/src/pages/TeacherClasses.tsx` -- Major refactor: extracted PortionSelector/ToggleSwitch, added By Juz mode, smart suggestions, ReportPanel integration
- `quran_frontend/src/pages/StudentClasses.tsx` -- Complete rewrite from 430 to 55 lines using ReportPanel
- `quran_frontend/src/pages/TeacherDashboard.tsx` -- Added Recent Classes section, surahNames import
- `quran_frontend/src/pages/StudentDashboard.tsx` -- Enhanced stats (mistakes_by_surah, repeated_mistakes, top_repeated)
- `quran_frontend/src/lib/supabase-api.ts` -- Added getStudentReport(), enhanced getStats('student'), error logging
- `quran_mobile/lib/core/services/qpc_font_service.dart` -- Switched from HTTP download to bundled asset loading
- `quran_mobile/lib/data/quran_data.dart` -- Added JuzBoundary class and juzBoundaries list
- `quran_mobile/lib/presentation/screens/classes/classes_screen.dart` -- Student pills + ReportPanel integration
- `quran_mobile/lib/presentation/screens/classes/create_class_screen.dart` -- Added By Page selector, smart suggestions
- Various mobile screens -- Char-level mistake rendering fixes, light mode improvements

**Removed:**
- `quran_mobile/lib/core/services/qpc_font_io_mobile.dart` -- No longer needed with bundled fonts
- `quran_mobile/lib/core/services/qpc_font_io_stub.dart` -- No longer needed with bundled fonts
- `quran_backend/create_test_users.py` -- Moved to scripts/
- `quran_backend/clear_mistakes.py` -- Moved to scripts/
- `quran_backend/seed_database.py` -- Moved to scripts/

**Stats:**
- Total files: 2854 -> 3673
- Total folders: 96 -> 119
- Total commits: 58 -> 108

---

### February 15, 2026 - Update 4

Updated project map to reflect the deletion of Test_System.md and recent documentation changes.

**Removed:**
- `docs/Technical Implementation Journey/Test_System.md` -- Test class and scoring system documentation (deleted)

**Updated:**
- Git history -- Added commits 0ca0779 and e7f47e1
- Total commits: 56 -> 58
- docs/README.md -- Added as new documentation navigation guide
- AGENTS.md, CLAUDE.md, PROJECT_MAP.html -- Minor updates
- docs/Logs/TEMPLATE.md -- Moved from root to docs/Logs/
- docs/Logs/2026-02-15-001-session-log.md -- Renamed to docs/Logs/2026-02-15-001-docs-overhaul-audit.md

---

### February 15, 2026 - Update 3

Major update after 40 commits spanning Phases 12-16 of development (Supabase migration, Flutter overhaul, Web Quran Reader responsive, light mode, documentation overhaul).

**Added (new files/directories):**
- `AGENTS.md` -- AI agent instructions mirroring CLAUDE.md
- `scripts/convert_fonts.py` -- WOFF2 to TTF font converter
- `quran_backend/sync_service.py` -- Supabase bidirectional sync
- `quran_backend/fonts/qpc/` -- 604 QPC TTF fonts for Flutter mobile
- `quran_mobile/assets/quran-pages/` -- 605 bundled QPC page JSON files
- `quran_mobile/lib/core/auth/` -- Supabase auth service and config
- `quran_mobile/lib/core/services/` -- QPC font service, page data service
- `quran_mobile/lib/data/models/` -- quran_page_data.dart, quran_page_word.dart, app_user.dart
- `quran_mobile/lib/data/quran_data.dart` -- Static Quran metadata
- `quran_mobile/lib/presentation/providers/` -- auth_provider, theme_provider, quran_page_provider
- `quran_mobile/lib/presentation/screens/auth/` -- login, signup, forgot password screens
- `quran_mobile/lib/presentation/widgets/` -- mushaf_page_widget, surah_header, bismillah, common/
- `quran_frontend/src/components/FittedLine.tsx` -- QPC line width-fitting component
- `quran_frontend/src/contexts/ThemeContext.tsx` -- Dark/light mode context
- `quran_frontend/src/lib/` -- supabase.ts, supabase-api.ts, quran-api.ts, local-api.ts, cache.ts, database.types.ts
- `quran_frontend/src/pages/Settings.tsx` -- User settings page
- `quran_frontend/src/pages/ForgotPassword.tsx` -- Password reset request
- `quran_frontend/src/pages/ResetPassword.tsx` -- Password reset confirmation
- `docs/Architecture/Supabase_Migration_Architecture.md` + `.html`
- `docs/Technical Implementation Journey/Flutter App Overhaul/` -- 7 files (00-06)
- `docs/Technical Implementation Journey/Quran Reader/` -- 2 files
- `docs/Technical Implementation Journey/Supabase Implementation/` -- 3 files
- `docs/Technical Implementation Journey/Auth_Navigation_Fixes.md`
- `docs/Technical Implementation Journey/Light_Dark_Mode_Implementation.md`
- `docs/PRODUCTION_READINESS.md` (moved from root)
- `docs/TEMPLATE.md` (moved from root)
- `docs/Logs/` -- New directory with session log

**Updated (modified files):**
- `CLAUDE.md` -- Completely rewritten with comprehensive codebase map
- `quran_backend/main.py` -- Added sync endpoints, font serving, local-first endpoints
- `quran_frontend/src/api.ts` -- Refactored to facade re-exporting from specialized modules
- `quran_frontend/src/App.tsx` -- Added ThemeProvider, new routes, role-based routing
- `quran_frontend/src/contexts/AuthContext.tsx` -- Rewritten for Supabase Auth with timeout protection
- `quran_frontend/src/components/Layout.tsx` -- Responsive bottom nav, theme toggle, light mode
- `quran_frontend/src/pages/QuranReader.tsx` -- FittedLine, responsive 3-tier, overflow fix
- `quran_frontend/src/pages/Classroom.tsx` -- FittedLine, light/dark mode, responsive, isMounted
- All Teacher/Student pages -- Light/dark mode, isMounted cleanup, Supabase migration
- All doc files renamed from ALL_CAPS to Title_Case
- `docs/PROJECT_CHANGELOG.md` -- Added Phases 12-15 documentation
- `docs/Technical Implementation Journey/Technical_Documentation.md` -- Added 8 missing endpoints, 3 tables

**Removed:**
- `PRODUCTION_READINESS.md` (moved to docs/)
- `TEMPLATE.md` (moved to docs/)
- `quran_frontend/src/pages/QuranPageTest.tsx` (deleted)

**Stats:**
- Total files: 1353 -> 2854
- Total folders: 81 -> 96
- Total commits: 16 -> 56

---

### December 31, 2025 - Update 2

Updated project map after initial commit.

**Added:**
- `PROJECT_MAP.md` -- This documentation file
- `PROJECT_MAP.html` -- Interactive HTML viewer

**Updated:**
- Git History -- Added commit 4b2dbf4
- Total files: 1351 -> 1353

---

### December 31, 2025 - Update 1 (Initial)

Initial project map created with 1351 files across 81 folders.

**Key directories documented:**
- `quran_backend/` -- FastAPI backend with auth module
- `quran_frontend/` -- React + TypeScript web app
- `quran_mobile/` -- Flutter mobile app
- `docs/` -- Project documentation
