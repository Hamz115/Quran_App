---
project: QuranTrack
created: 2025-12-31T14:46:00
last_updated: 2025-12-31T14:46:00
last_commit: 297ee1a
update_count: 1
total_files: 1351
total_folders: 81
---

# Project Map: QuranTrack

## Overview

QuranTrack is a Quran memorization and recitation tracking application designed for teachers (Ustadh/Ustadha) who conduct Hifz (memorization) classes. The app provides a digital platform to track student progress, mark mistakes during recitation sessions, and maintain detailed class records.

The application uses QPC (Quran Printing Complex) fonts from the King Fahd Complex to render Quran pages pixel-perfect, exactly matching the printed Madani Mushaf. Each of the 604 pages has its own dedicated font file for perfect glyph accuracy. The system supports word-level and character-level mistake tracking with color-coded severity based on error frequency.

The architecture follows a three-tier approach with a FastAPI backend serving a React web frontend and a Flutter mobile app. Data is stored in SQLite databases - a read-only Quran database bundled with the apps and a read-write application database for users, classes, and mistakes. JWT-based authentication with role-based access control (Teacher vs Student) manages user permissions.

## Tech Stack

**Languages:** Python 3.x, TypeScript, JavaScript, Dart, Kotlin, Java
**Frameworks:** FastAPI, React 18, Flutter, Tailwind CSS
**Tools:** Vite, SQLite, Riverpod (Flutter state management), JWT
**Databases:** SQLite (quran.db read-only, app.db read-write)

## Architecture

```
                    +------------------+
                    |   React Frontend |
                    |  (quran_frontend)|
                    +--------+---------+
                             |
                             | HTTP/REST
                             v
+------------------+   +-------------+   +------------------+
| Flutter Mobile   |-->|   FastAPI   |<--| QPC Fonts (604)  |
| (quran_mobile)   |   |  Backend    |   | page-specific    |
+------------------+   +------+------+   +------------------+
                             |
              +--------------+--------------+
              |                             |
       +------v------+              +-------v------+
       |  quran.db   |              |   app.db     |
       | (read-only) |              | (read-write) |
       | Quran text  |              | Users/Classes|
       +-------------+              +--------------+
```

## Directory Structure

### 📄 README.md

**Path:** `README.md`

**Purpose:** Main project documentation and introduction.

**What it does:**
- Introduces QuranTrack as a Quran memorization tracking app
- Explains features for teachers (conduct classes, track mistakes, manage students)
- Explains features for students (view progress, review mistakes)
- Documents the tech stack (React, FastAPI, Flutter)
- Links to detailed documentation in the docs/ folder

---

### 📂 quran_backend/

**Purpose:** FastAPI Python backend serving REST APIs for the web and mobile apps.

**What it does:**
- Provides all API endpoints for authentication, classes, mistakes, and Quran data
- Manages two SQLite databases (quran.db and app.db)
- Serves QPC word data from JSON files for each Quran page
- Handles JWT authentication with access/refresh tokens

**Contains:** main.py, auth/, quran-pages/, Backups/

---

#### 🐍 main.py

**Path:** `quran_backend/main.py`

**Purpose:** Main FastAPI application with all API endpoint definitions.

**What it does:**
- Initializes FastAPI app with CORS middleware for frontend/mobile access
- Creates database tables on startup with migration support
- Defines all REST endpoints for classes, mistakes, tests, and Quran data
- Implements role-based access control (teacher vs student views)
- Handles test class functionality with scoring and tanbeeh (warnings)

**Key Functions:**
- `init_app_db()` — Creates/migrates database tables on startup
- `get_quran_page_words(page_number)` — Returns QPC word data for a page
- `get_all_classes()` — Returns classes based on user role
- `create_class()` — Creates class with assignments and student associations
- `addMistake()` / `removeMistake()` — Mistake CRUD operations
- `get_suggested_portions()` — Smart portion suggestions based on last class

**Key Classes:**
- `AssignmentCreate` — Pydantic model for assignment creation
- `ClassCreate` — Pydantic model for class with students and assignments
- `MistakeCreate` — Pydantic model for mistake tracking
- `TestMistakeCreate` — Pydantic model for test-specific mistakes

**Integrates with:** → `auth/routes.py`, → `auth/dependencies.py`, → `quran-pages/*.json`

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
- `signup()` — Creates user account with role-based verification
- `login()` — Authenticates user and issues tokens
- `refresh_tokens()` — Rotates JWT tokens
- `lookup_student()` — Find student by email (teacher only)
- `add_student()` — Add student to teacher's roster
- `get_my_students()` — List all students for a teacher
- `get_my_teachers()` — List teachers who added the current student

**Integrates with:** → `auth/models.py`, → `auth/utils.py`, → `auth/dependencies.py`

---

#### 🐍 auth/models.py

**Path:** `quran_backend/auth/models.py`

**Purpose:** Pydantic request/response models for authentication.

**What it does:**
- Defines request validation schemas for signup, login, token refresh
- Defines response schemas for user data and auth tokens
- Enforces field validation (email format, username pattern, password length)

**Key Classes:**
- `SignupRequest` — Validates signup with role (teacher/student)
- `LoginRequest` — Accepts email or username identifier
- `UserResponse` — User profile response shape
- `AuthResponse` — Contains user + access_token + refresh_token
- `StudentListItem` / `TeacherListItem` — Roster list items

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
- `get_current_user()` — Returns decoded token payload or raises 401
- `get_current_verified_user()` — Requires is_verified=True (Teacher)
- `get_optional_user()` — Returns user if authenticated, None otherwise

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
- `hash_password()` / `verify_password()` — Password hashing with bcrypt
- `generate_student_id()` — Creates unique STU-XXXXXX identifier
- `create_access_token()` / `create_refresh_token()` — JWT generation
- `decode_token()` — JWT validation and decoding
- `create_user_token_data()` — Builds token payload from user dict

---

#### 🐍 create_test_users.py

**Path:** `quran_backend/create_test_users.py`

**Purpose:** Script to seed the database with test users for development.

**What it does:**
- Creates 10 student accounts with Muslim names
- Creates 5 teacher accounts (verified)
- All accounts use password "Test123!"
- Generates unique student IDs for each user

---

#### 🐍 clear_mistakes.py

**Path:** `quran_backend/clear_mistakes.py`

**Purpose:** Utility script to clear all mistakes from the database for testing.

**What it does:**
- Deletes all records from mistake_occurrences table
- Deletes all records from mistakes table
- Preserves users, classes, and assignments

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

**Contains:** src/, public/, scripts/, config files

---

#### 📄 src/api.ts

**Path:** `quran_frontend/src/api.ts`

**Purpose:** API client layer with all backend communication functions.

**What it does:**
- Manages access/refresh token storage in localStorage
- Implements automatic token refresh on 401 responses
- Provides typed functions for all API endpoints
- Handles authentication, classes, mistakes, tests, and stats

**Key Functions:**
- `signup()` / `login()` / `logout()` — Authentication flows
- `getClasses()` / `createClass()` / `deleteClass()` — Class management
- `getMistakes()` / `addMistake()` / `removeMistake()` — Mistake tracking
- `getTest()` / `startTest()` / `completeTest()` — Test management
- `getSuggestedPortions()` — Smart portion recommendations

**Key Interfaces:**
- `ClassData` — Class with assignments and students
- `MistakeData` — Mistake with surah/ayah/word info
- `TestData` / `TestQuestion` / `TestMistake` — Test-related types

---

#### 📄 src/App.tsx

**Path:** `quran_frontend/src/App.tsx`

**Purpose:** Main React application with routing configuration.

**What it does:**
- Sets up React Router with protected routes
- Wraps app in AuthProvider for authentication context
- Defines teacher routes (require verification)
- Defines student routes (any authenticated user)

**Integrates with:** → `contexts/AuthContext`, → `components/Layout`, → `pages/*`

---

#### 📄 src/contexts/AuthContext.tsx

**Path:** `quran_frontend/src/contexts/AuthContext.tsx`

**Purpose:** React context for authentication state management.

**What it does:**
- Provides user state and authentication methods to entire app
- Checks for existing session on mount
- Exposes login, signup, logout, and refreshUser functions
- Tracks isAuthenticated and isVerified states

**Key Functions:**
- `login()` — Authenticates and sets user state
- `signup()` — Creates account and sets user state
- `logout()` — Clears tokens and user state
- `refreshUser()` — Fetches latest user data from API

---

#### 📄 src/components/Layout.tsx

**Path:** `quran_frontend/src/components/Layout.tsx`

**Purpose:** Main layout component with navigation and role switcher.

**What it does:**
- Renders navbar with QuranTrack branding
- Provides tab navigation based on current role (teacher/student)
- Shows role switcher for verified users (teachers)
- Displays user profile dropdown with logout

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

#### 📄 src/pages/QuranReader.tsx

**Path:** `quran_frontend/src/pages/QuranReader.tsx`

**Purpose:** Quran page viewer with QPC font rendering and mistake display.

**What it does:**
- Loads QPC words from API for current page
- Dynamically loads page-specific QPC fonts
- Displays mistakes with color-coded severity (amber to red)
- Supports page navigation and surah dropdown
- Handles surah headers and bismillah display

**Key Features:**
- Page-specific font loading (QCF_P001.woff2 to QCF_P604.woff2)
- Previous page font loading for overflow ayahs
- Line-based word layout matching printed Mushaf
- Mistake highlighting with error count badges

---

#### 📄 src/pages/Classroom.tsx

**Path:** `quran_frontend/src/pages/Classroom.tsx`

**Purpose:** Class session view for conducting lessons and marking mistakes.

**What it does:**
- Displays class with portions (Hifz, Sabqi, Revision)
- Allows teachers to mark word/character-level mistakes
- Shows word popup for mistake details and removal
- Supports test mode with question flow and scoring
- Manages per-student performance ratings

**Key Features:**
- Section-based portion highlighting
- Character-level mistake selection (harakat support)
- Test mode with start/end question flow
- Tanbeeh (warning) vs full mistake deduction

---

#### 📄 src/pages/TeacherDashboard.tsx

**Path:** `quran_frontend/src/pages/TeacherDashboard.tsx`

**Purpose:** Teacher's main dashboard with student roster and quick stats.

**What it does:**
- Displays total students, classes this week, and other stats
- Shows student roster with add/remove functionality
- Provides quick actions to start new class
- Links to Quran page test tool

---

### 📂 quran_frontend/public/fonts/qpc/

**Purpose:** Contains 604 QPC font files for Quran page rendering.

**What it does:**
- Stores WOFF2 font files (QCF_P001.woff2 to QCF_P604.woff2)
- Each font contains glyphs specific to that page
- Fonts are loaded dynamically based on current page
- Total size approximately 48MB

---

### 📂 quran_mobile/

**Purpose:** Flutter mobile application for Android/iOS.

**What it does:**
- Provides native mobile experience for QuranTrack
- Supports offline-first with local SQLite database
- Syncs data with backend when online
- Uses Riverpod for state management

**Contains:** lib/, android/, assets/, test/

---

#### 📄 lib/main.dart

**Path:** `quran_mobile/lib/main.dart`

**Purpose:** Flutter app entry point with navigation setup.

**What it does:**
- Initializes Flutter bindings and system UI style
- Wraps app in ProviderScope for Riverpod
- Configures Material theme matching web dark theme
- Sets up bottom navigation with 4 screens

**Key Screens:**
- DashboardScreen — Overview and stats
- ClassesScreen — Class list and creation
- QuranReaderScreen — Quran viewing
- SettingsScreen — App configuration

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

#### 📄 lib/core/database/database_helper.dart

**Path:** `quran_mobile/lib/core/database/database_helper.dart`

**Purpose:** SQLite database initialization and access.

**What it does:**
- Manages singleton database instances
- Copies bundled quran.db from assets on first run
- Creates app.db schema with migrations
- Provides separate getters for Quran and App databases

**Key Functions:**
- `quranDatabase` — Read-only Quran database getter
- `appDatabase` — Read-write app database getter
- `_initQuranDatabase()` — Copies from assets if needed
- `_createAppDatabase()` — Creates tables and indexes

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
- `get()` / `post()` / `put()` / `delete()` — HTTP methods
- `syncPull()` / `syncPush()` — Sync operations
- `setBaseUrl()` — Allows changing API URL at runtime

---

#### 📄 lib/presentation/providers/providers.dart

**Path:** `quran_mobile/lib/presentation/providers/providers.dart`

**Purpose:** Riverpod providers for state management.

**What it does:**
- Defines providers for repositories and services
- Implements ClassesNotifier and MistakesNotifier state classes
- Provides family providers for single entities
- Handles web mock data for development

**Key Providers:**
- `classesProvider` — StateNotifier for class list
- `mistakesProvider` — StateNotifier for mistake list
- `surahListProvider` — FutureProvider for surah data
- `syncServiceProvider` — Sync service instance

---

### 📂 quran_mobile/lib/data/models/

**Purpose:** Dart model classes for data entities.

**Contains:** assignment.dart, class_session.dart, mistake.dart, surah.dart

---

### 📂 quran_mobile/lib/data/repositories/

**Purpose:** Repository classes for data access abstraction.

**Contains:** class_repository.dart, mistake_repository.dart, quran_repository.dart

---

### 📂 quran_mobile/lib/presentation/screens/

**Purpose:** UI screens for the mobile app.

**Contains:** classes/, classroom/, dashboard/, reader/, settings/

---

### 📂 docs/

**Purpose:** Project documentation organized by category.

**What it does:**
- Contains all project documentation in organized subfolders
- Main entry point is PROJECT_CHANGELOG.md
- Architecture docs for system design and planning
- Technical implementation details for developers
- Troubleshooting guides for AI assistants

**Contains:** PROJECT_CHANGELOG.md, Architecture/, Technical Implementation Journey/, Guides/

---

#### 📄 docs/PROJECT_CHANGELOG.md

**Path:** `docs/PROJECT_CHANGELOG.md`

**Purpose:** Main reference guide and chronological record of what has been built.

**What it does:**
- Documents all development phases (Foundation, Multi-User, Classes & Mistakes, etc.)
- Provides a directory map of all documentation
- Links to detailed implementation docs
- Tracks feature completion status

---

### 📂 docs/Architecture/

**Purpose:** High-level system design and planning documents.

**What it does:**
- Contains architecture blueprints created during planning
- Documents user identity and relationships design
- Provides system overview diagrams

**Contains:** 3 markdown files

---

#### 📄 docs/Architecture/QuranTrack Academy_ Architecture Blueprint.md

**Path:** `docs/Architecture/QuranTrack Academy_ Architecture Blueprint.md`

**Purpose:** Main architecture blueprint for the application.

**What it does:**
- Defines overall system architecture
- Documents component relationships
- Outlines data flow between frontend, backend, and databases

---

#### 📄 docs/Architecture/Logical Architecture Blueprint_ User Identity & Relationships.md

**Path:** `docs/Architecture/Logical Architecture Blueprint_ User Identity & Relationships.md`

**Purpose:** User identity and relationship system design.

**What it does:**
- Documents teacher-student relationships
- Defines user roles and permissions
- Explains class-student associations

---

#### 📄 docs/Architecture/Quran Full App.md

**Path:** `docs/Architecture/Quran Full App.md`

**Purpose:** Full application overview and feature planning.

**What it does:**
- Comprehensive app feature documentation
- Planning document for all app capabilities

---

### 📂 docs/Technical Implementation Journey/

**Purpose:** Detailed documentation of how features were actually built.

**What it does:**
- Provides implementation details for developers
- Documents API endpoints and data models
- Explains complex features like QPC rendering and test scoring

**Contains:** 5 markdown files

---

#### 📄 docs/Technical Implementation Journey/TECHNICAL_DOCUMENTATION.md

**Path:** `docs/Technical Implementation Journey/TECHNICAL_DOCUMENTATION.md`

**Purpose:** Full technical overview of the system.

**What it does:**
- Comprehensive technical documentation
- API reference and data models
- Database schema documentation

---

#### 📄 docs/Technical Implementation Journey/AUTH_SYSTEM.md

**Path:** `docs/Technical Implementation Journey/AUTH_SYSTEM.md`

**Purpose:** Authentication system documentation.

**What it does:**
- Documents JWT authentication flow (signup, login, refresh)
- Explains user roles (Teacher = verified, Student = unverified)
- Documents Student ID generation (STU-XXXXXX format)
- Lists all auth-related API endpoints

---

#### 📄 docs/Technical Implementation Journey/CLASSES_AND_MISTAKES.md

**Path:** `docs/Technical Implementation Journey/CLASSES_AND_MISTAKES.md`

**Purpose:** Class and mistake tracking system documentation.

**What it does:**
- Documents class creation and management
- Explains assignment types (Hifz, Sabqi, Revision)
- Details mistake tracking (word-level and character-level)
- Covers mistake occurrence tracking per class

---

#### 📄 docs/Technical Implementation Journey/QPC_QURAN_RENDERING.md

**Path:** `docs/Technical Implementation Journey/QPC_QURAN_RENDERING.md`

**Purpose:** QPC font rendering system documentation.

**What it does:**
- Explains QPC (Quran Printing Complex) font system
- Documents page-specific font loading (604 fonts)
- Covers glyph codes and line number system
- Details overflow ayah handling with previous page fonts

---

#### 📄 docs/Technical Implementation Journey/TEST_SYSTEM.md

**Path:** `docs/Technical Implementation Journey/TEST_SYSTEM.md`

**Purpose:** Test class and scoring system documentation.

**What it does:**
- Documents test class creation workflow
- Explains question flow (start/end question)
- Details scoring system with tanbeeh (warnings)
- Covers repeated mistake detection and point deduction

---

### 📂 docs/Guides/

**Purpose:** Troubleshooting guides for AI assistants and developers.

**What it does:**
- Provides specific fix guides for common issues
- Written for AI assistants working on the codebase
- Step-by-step instructions with code examples

**Contains:** 3 markdown files

---

#### 📄 docs/Guides/PAGE_LAYOUT_FIX_GUIDE.md

**Path:** `docs/Guides/PAGE_LAYOUT_FIX_GUIDE.md`

**Purpose:** Guide for fixing Quran page layout issues.

**What it does:**
- Explains the `l` (line number) field in page JSON
- Documents how to fix ayah positioning issues
- Provides Python script for batch fixes
- Includes common issue symptoms and solutions

---

#### 📄 docs/Guides/FONT_OVERFLOW_FIX_GUIDE.md

**Path:** `docs/Guides/FONT_OVERFLOW_FIX_GUIDE.md`

**Purpose:** Guide for fixing font overflow issues on page boundaries.

**What it does:**
- Explains overflow glyph codes (> 0xFC00)
- Documents previous page font loading requirement
- Provides troubleshooting steps

---

#### 📄 docs/Guides/SEEDING_DATABASE.md

**Path:** `docs/Guides/SEEDING_DATABASE.md`

**Purpose:** Guide for seeding the database with test data.

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
- Documents the tech stack (React, FastAPI, Flutter)
- Links to detailed documentation in the docs/ folder

---

### docs/PROJECT_CHANGELOG.md

**Path:** `docs/PROJECT_CHANGELOG.md`

**Purpose:** Main reference guide and chronological record of what has been built.

- Documents all development phases (Foundation, Multi-User, Classes & Mistakes, etc.)
- Provides a directory map of all documentation
- Links to detailed implementation docs
- Tracks feature completion status

---

### docs/Architecture/QuranTrack Academy_ Architecture Blueprint.md

**Path:** `docs/Architecture/QuranTrack Academy_ Architecture Blueprint.md`

**Purpose:** Main architecture blueprint for the application.

- Defines overall system architecture
- Documents component relationships
- Outlines data flow between frontend, backend, and databases

---

### docs/Architecture/Logical Architecture Blueprint_ User Identity & Relationships.md

**Path:** `docs/Architecture/Logical Architecture Blueprint_ User Identity & Relationships.md`

**Purpose:** User identity and relationship system design.

- Documents teacher-student relationships
- Defines user roles and permissions
- Explains class-student associations

---

### docs/Architecture/Quran Full App.md

**Path:** `docs/Architecture/Quran Full App.md`

**Purpose:** Full application overview and feature planning.

- Comprehensive app feature documentation
- Planning document for all app capabilities

---

### docs/Technical Implementation Journey/TECHNICAL_DOCUMENTATION.md

**Path:** `docs/Technical Implementation Journey/TECHNICAL_DOCUMENTATION.md`

**Purpose:** Full technical overview of the system.

- Comprehensive technical documentation
- API reference and data models
- Database schema documentation

---

### docs/Technical Implementation Journey/AUTH_SYSTEM.md

**Path:** `docs/Technical Implementation Journey/AUTH_SYSTEM.md`

**Purpose:** Authentication system documentation.

- Documents JWT authentication flow (signup, login, refresh)
- Explains user roles (Teacher = verified, Student = unverified)
- Documents Student ID generation (STU-XXXXXX format)
- Lists all auth-related API endpoints

---

### docs/Technical Implementation Journey/CLASSES_AND_MISTAKES.md

**Path:** `docs/Technical Implementation Journey/CLASSES_AND_MISTAKES.md`

**Purpose:** Class and mistake tracking system documentation.

- Documents class creation and management
- Explains assignment types (Hifz, Sabqi, Revision)
- Details mistake tracking (word-level and character-level)
- Covers mistake occurrence tracking per class

---

### docs/Technical Implementation Journey/QPC_QURAN_RENDERING.md

**Path:** `docs/Technical Implementation Journey/QPC_QURAN_RENDERING.md`

**Purpose:** QPC font rendering system documentation.

- Explains QPC (Quran Printing Complex) font system
- Documents page-specific font loading (604 fonts)
- Covers glyph codes and line number system
- Details overflow ayah handling with previous page fonts

---

### docs/Technical Implementation Journey/TEST_SYSTEM.md

**Path:** `docs/Technical Implementation Journey/TEST_SYSTEM.md`

**Purpose:** Test class and scoring system documentation.

- Documents test class creation workflow
- Explains question flow (start/end question)
- Details scoring system with tanbeeh (warnings)
- Covers repeated mistake detection and point deduction

---

### docs/Guides/PAGE_LAYOUT_FIX_GUIDE.md

**Path:** `docs/Guides/PAGE_LAYOUT_FIX_GUIDE.md`

**Purpose:** Guide for fixing Quran page layout issues.

- Explains the `l` (line number) field in page JSON
- Documents how to fix ayah positioning issues
- Provides Python script for batch fixes
- Includes common issue symptoms and solutions

---

### docs/Guides/FONT_OVERFLOW_FIX_GUIDE.md

**Path:** `docs/Guides/FONT_OVERFLOW_FIX_GUIDE.md`

**Purpose:** Guide for fixing font overflow issues on page boundaries.

- Explains overflow glyph codes (> 0xFC00)
- Documents previous page font loading requirement
- Provides troubleshooting steps

---

### docs/Guides/SEEDING_DATABASE.md

**Path:** `docs/Guides/SEEDING_DATABASE.md`

**Purpose:** Guide for seeding the database with test data.

- Documents the create_test_users.py script
- Lists all test accounts created
- Explains password and student ID format

---

## Git History

**Branch:** main
**Last Commit:** 297ee1a
**Total Commits:** 15
**Repository:** Local

### Recent Commits

#### 🔵 297ee1a — Add database seeding script, month filtering, and bug fixes
**Author:** Hamza Feroze
**Date:** December 30, 2025

#### 🔵 40c5dc2 — Redesign Student Classes UI with card layout and mistake counts
**Author:** Hamza Feroze
**Date:** December 28, 2025

#### 🔵 81c1cb6 — Fine-tune Uthmani text alignment to match QPC glyph rendering
**Author:** Hamza Feroze
**Date:** December 28, 2025

#### 🔵 88527c5 — Enhance harakat highlighting with glow effect (harakat-only, not base letter)
**Author:** Hamza Feroze
**Date:** December 27, 2025

#### 🔵 f9659ee — Add class filtering, mistake counts per portion, and auto-select student
**Author:** Hamza Feroze
**Date:** December 26, 2025

#### 🔵 7627654 — Add smart portion suggestions, card layout, and UI improvements
**Author:** Hamza Feroze
**Date:** December 22, 2025

#### 🔵 8a73686 — Add Test Class feature with scoring, Tanbeeh, and results display
**Author:** Hamza Feroze
**Date:** December 17, 2025

#### 🔵 bd66185 — Add surah dropdown, headers, bismillah, portion highlighting, and reorganize docs
**Author:** Hamza Feroze
**Date:** December 17, 2025

#### 🔵 65febbc — Add mistake summary sections and update documentation
**Author:** Hamza Feroze
**Date:** December 16, 2025

#### 🔵 5b20318 — Fix Quran page layout, add character-level mistake highlighting
**Author:** Hamza Feroze
**Date:** December 16, 2025

### Top Contributors

1. Hamza Feroze (15 commits)

---

## Update History

### December 31, 2025 (Latest)

Initial project map created with 1351 files across 81 folders.

**Key directories documented:**
- `quran_backend/` — FastAPI backend with auth module
- `quran_frontend/` — React + TypeScript web app
- `quran_mobile/` — Flutter mobile app
- `docs/` — Project documentation
