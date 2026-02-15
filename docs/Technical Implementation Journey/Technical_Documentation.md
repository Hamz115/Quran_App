# Quran Logbook - Technical Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Backend API Endpoints](#backend-api-endpoints)
6. [Frontend Architecture](#frontend-architecture)
7. [Mobile App (Flutter)](#mobile-app-flutter)
8. [Features](#features)
9. [Data Flow](#data-flow)
10. [Sync System](#sync-system)
11. [Backup System](#backup-system)
12. [Setup & Running](#setup--running)
13. [Related Documentation](#related-documentation)

---

## Project Overview

QuranTrack is a full-stack application designed to track Quran teaching sessions. It helps teachers monitor student mistakes during memorization (Hifz), recent revision (Sabqi), and long-term revision (Manzil) sessions.

**Important Design Decisions:**
- **Multi-User System:** Teachers can have multiple students; classes support 1-on-1 or group halaqah
- **GLOBAL Mistakes (per student):** Mistakes are tracked GLOBALLY per student across all classes. Each student has their own mistakes.
- **Class Visibility:** Classes are hidden by default (`is_published = false`); students only see published classes they're part of
- **Privacy:** Students never see other students in a class or their mistakes
- **Class Performance:** Teachers rate each class after completion (Excellent, Very Good, Good, Needs Work)

### Key Capabilities
- Track classes with multiple portions (Hifz, Sabqi, Revision)
- Mark mistakes at word-level or character-level (harakat)
- **Global mistake tracking** - mistakes persist across all classes
- Track mistake occurrences to identify repeated problem areas
- View class-specific and historical mistake data
- Rate class performance after each session
- Table view with week/month grouping
- Mobile app with offline support and sync
- Backup and restore database

---

## Tech Stack

### Backend
- **Python 3.x** - Programming language
- **FastAPI** - Web framework for building APIs
- **SQLite** - Database (two separate databases)
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation

### Frontend (Web)
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing

### Mobile App
- **Flutter** - Cross-platform mobile framework
- **Dart** - Programming language
- **Riverpod** - State management
- **SQLite (sqflite)** - Local database
- **SharedPreferences** - Settings persistence
- **Dio** - HTTP client

---

## Project Structure

```
Quran_App/
├── quran_backend/
│   ├── main.py              # FastAPI application (all endpoints)
│   ├── quran.db             # Quran text database (read-only)
│   ├── app.db               # Application data (classes, mistakes)
│   ├── Backups/             # Database backup files
│   └── requirements.txt     # Python dependencies
│
├── quran_frontend/
│   ├── src/
│   │   ├── main.tsx         # React entry point
│   │   ├── App.tsx          # Root component with routing
│   │   ├── api.ts           # API client functions
│   │   ├── index.css        # Global styles + Tailwind
│   │   └── pages/
│   │       ├── Dashboard.tsx    # Home dashboard
│   │       ├── Classes.tsx      # Class list (table view)
│   │       └── Classroom.tsx    # Individual class view
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── quran_mobile/
│   ├── lib/
│   │   ├── main.dart                    # App entry point
│   │   ├── core/
│   │   │   ├── database/                # SQLite setup
│   │   │   ├── network/                 # API client
│   │   │   ├── sync/                    # Sync service
│   │   │   └── theme/                   # App theming
│   │   ├── data/
│   │   │   ├── models/                  # Data models
│   │   │   └── repositories/            # Data access
│   │   └── presentation/
│   │       ├── screens/                 # UI screens
│   │       └── providers/               # Riverpod providers
│   └── pubspec.yaml
│
└── TECHNICAL_DOCUMENTATION.md
```

---

## Database Schema

### Database 1: `quran.db` (Read-Only)
Contains the Quran text data.

#### Table: `surahs`
| Column | Type | Description |
|--------|------|-------------|
| number | INTEGER | Surah number (1-114) |
| name | TEXT | Arabic name |
| englishName | TEXT | English name |
| englishNameTranslation | TEXT | English translation of name |
| numberOfAyahs | INTEGER | Number of ayahs |
| revelationType | TEXT | Meccan or Medinan |

#### Table: `ayahs`
| Column | Type | Description |
|--------|------|-------------|
| surahNumber | INTEGER | Foreign key to surahs |
| ayahNumber | INTEGER | Ayah number within surah |
| text | TEXT | Arabic text of the ayah |

---

### Database 2: `app.db` (Read-Write)
Contains application data.

#### Table: `classes`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (auto-increment) |
| date | TEXT | Class date (YYYY-MM-DD) |
| day | TEXT | Day of week |
| notes | TEXT | Optional class notes |
| **performance** | TEXT | Class rating: 'Excellent', 'Very Good', 'Good', 'Needs Work' |
| **teacher_id** | INTEGER | Foreign key to users (class owner) |
| **is_published** | BOOLEAN | Default false; when true, students can see class |
| **class_type** | TEXT | `'regular'` (default) or `'test'` |
| created_at | TEXT | Timestamp |
| updated_at | TEXT | Timestamp |
| device_id | TEXT | For sync identification |
| **supabase_id** | TEXT | Supabase UUID (UNIQUE) - links to cloud record |
| **sync_status** | TEXT | `'pending'`, `'synced'`, or `'error'` (default `'pending'`) |
| **supabase_teacher_id** | TEXT | Supabase user UUID of the teacher |
| **last_synced_at** | TEXT | Timestamp of last successful sync |

#### Table: `class_students` (Junction Table)
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| class_id | INTEGER | Foreign key to classes (CASCADE delete) |
| student_id | INTEGER | Foreign key to users |
| **performance** | TEXT | Per-student performance rating for this class |

**Unique Constraint:** `(class_id, student_id)`

Links multiple students to each class, supporting both 1-on-1 and group halaqah sessions.

#### Table: `assignments`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| class_id | INTEGER | Foreign key to classes (CASCADE delete) |
| type | TEXT | 'hifz', 'sabqi', or 'revision' |
| start_surah | INTEGER | Starting surah number |
| end_surah | INTEGER | Ending surah number |
| start_ayah | INTEGER | Optional starting ayah |
| end_ayah | INTEGER | Optional ending ayah |
| **student_id** | INTEGER | Foreign key to users (per-student portions; NULL = all students) |
| updated_at | TEXT | Timestamp |
| **supabase_id** | TEXT | Supabase UUID (UNIQUE) - links to cloud record |
| **sync_status** | TEXT | `'pending'`, `'synced'`, or `'error'` (default `'pending'`) |

#### Table: `mistakes` (GLOBAL per Student - Not Class-Specific)
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| **student_id** | INTEGER | Foreign key to users (which student made this mistake) |
| surah_number | INTEGER | Surah where mistake occurred |
| ayah_number | INTEGER | Ayah number |
| word_index | INTEGER | Word position in ayah (0-indexed) |
| word_text | TEXT | The Arabic word/text |
| char_index | INTEGER | **Optional:** character position for harakat mistakes (null = whole word) |
| error_count | INTEGER | Total times this mistake was made |
| updated_at | TEXT | Timestamp |
| device_id | TEXT | For sync identification |
| **supabase_id** | TEXT | Supabase UUID (UNIQUE) - links to cloud record |
| **sync_status** | TEXT | `'pending'`, `'synced'`, or `'error'` (default `'pending'`) |
| **supabase_student_id** | TEXT | Supabase user UUID of the student |
| **last_synced_at** | TEXT | Timestamp of last successful sync |

**Unique Constraint:** `(student_id, surah_number, ayah_number, word_index, char_index)`

**IMPORTANT:** Mistakes are GLOBAL per student. They are NOT tied to any specific class. Each student has their own mistakes tracked separately. Teachers record mistakes for specific students; students can only view their own.

#### Table: `mistake_occurrences`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| mistake_id | INTEGER | Foreign key to mistakes (CASCADE delete) |
| class_id | INTEGER | Foreign key to classes (CASCADE delete) |
| occurred_at | TEXT | Timestamp of occurrence |
| **supabase_id** | TEXT | Supabase UUID (UNIQUE) - links to cloud record |
| **sync_status** | TEXT | `'pending'`, `'synced'`, or `'error'` (default `'pending'`) |

This table tracks WHEN a mistake was made in WHICH class, enabling:
- Tracking repeated mistakes across classes
- Historical analysis of when mistakes were made
- Identifying if a mistake was made in current class vs previous

#### Table: `tests`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| class_id | INTEGER | Foreign key to classes (UNIQUE) |
| student_id | INTEGER | Foreign key to users |
| total_score | REAL | Final test score |
| max_score | REAL | Maximum possible score (default 100) |
| status | TEXT | `'not_started'`, `'in_progress'`, or `'completed'` |
| started_at | TEXT | Timestamp when test started |
| completed_at | TEXT | Timestamp when test completed |

#### Table: `test_questions`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| test_id | INTEGER | Foreign key to tests |
| question_number | INTEGER | Question order (1, 2, 3...) |
| start_surah | INTEGER | Starting surah number |
| start_ayah | INTEGER | Starting ayah number |
| end_surah | INTEGER | Ending surah number |
| end_ayah | INTEGER | Ending ayah number |
| points_earned | REAL | Calculated score for this question |
| points_possible | REAL | Max points for this question |
| status | TEXT | `'pending'`, `'in_progress'`, `'completed'`, or `'cancelled'` |
| started_at | TEXT | Timestamp when question started |
| completed_at | TEXT | Timestamp when question completed |

#### Table: `test_mistakes`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| test_id | INTEGER | Foreign key to tests |
| question_id | INTEGER | Foreign key to test_questions |
| mistake_id | INTEGER | Foreign key to mistakes (links to global mistake) |
| surah_number | INTEGER | Surah where mistake occurred |
| ayah_number | INTEGER | Ayah number |
| word_index | INTEGER | Word position in ayah |
| word_text | TEXT | The Arabic word |
| char_index | INTEGER | Character position (null = whole word) |
| **is_tanbeeh** | BOOLEAN | True = teacher warning/self-correction (-0.5 pts), False = full mistake (default 0) |
| is_repeated | BOOLEAN | True if student made this mistake before |
| previous_error_count | INTEGER | Number of times made before this test |
| points_deducted | REAL | Points deducted for this mistake |
| created_at | TEXT | Timestamp |

#### Table: `users`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (auto-increment) |
| student_id | TEXT | Unique student identifier |
| username | TEXT | Unique username |
| email | TEXT | Unique email |
| password_hash | TEXT | Hashed password |
| first_name | TEXT | First name |
| last_name | TEXT | Last name |
| is_verified | BOOLEAN | Default 0; teachers are verified |
| verification_token | TEXT | Token for email verification |
| verification_token_expires_at | TEXT | Token expiry |
| created_at | TEXT | Timestamp |
| updated_at | TEXT | Timestamp |
| last_login_at | TEXT | Timestamp of last login |
| **supabase_id** | TEXT | Supabase UUID (UNIQUE) - links to cloud user |

#### Table: `teacher_student_relationships`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| teacher_id | INTEGER | Foreign key to users (CASCADE delete) |
| student_id | INTEGER | Foreign key to users (CASCADE delete) |
| added_at | TEXT | Timestamp |

**Unique Constraint:** `(teacher_id, student_id)`

#### Table: `refresh_tokens`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| user_id | INTEGER | Foreign key to users (CASCADE delete) |
| token_hash | TEXT | Unique token hash |
| expires_at | TEXT | Expiry timestamp |
| created_at | TEXT | Timestamp |

#### Table: `sync_log`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (auto-increment) |
| table_name | TEXT | Name of the table being synced |
| record_id | INTEGER | Local record ID in the source table |
| supabase_id | TEXT | Supabase UUID of the synced record |
| operation | TEXT | `'create'`, `'update'`, or `'delete'` |
| status | TEXT | `'pending'`, `'synced'`, or `'error'` (default `'pending'`) |
| error_message | TEXT | Error details if sync failed |
| created_at | TEXT | Timestamp of log entry creation |
| synced_at | TEXT | Timestamp of successful sync |

**Indexes:** `idx_sync_log_status` (on status), `idx_sync_log_table` (on table_name)

Tracks every sync operation between local app.db and Supabase. Used to retry failed syncs and audit sync history.

---

## Backend API Endpoints

Base URL: `http://localhost:8000/api`

### Quran Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/surahs` | Get all 114 surahs |
| GET | `/surahs/{surah_number}` | Get specific surah with ayahs |
| GET | `/quran/page/{page_number}` | Get word-by-word data for a page (1-604) with QPC glyph codes |
| GET | `/fonts/qpc/{page_number}` | Serve QPC `.ttf` font file for a page (1-604) |

#### GET `/quran/page/{page_number}` Response:
```json
{
  "data": [
    {"id": 123, "s": 2, "a": 1, "p": 1, "t": "بِسْمِ", "c1": "ﭑ", "l": 3, "ct": "word"},
    ...
  ],
  "page": 1
}
```
Returns the page's word data from JSON files in `quran-pages/`. Each word includes surah number (`s`), ayah number (`a`), word position (`p`), Arabic text (`t`), QPC glyph code (`c1`), line number (`l`), and content type (`ct`: `"word"` or `"end"`).

#### GET `/fonts/qpc/{page_number}` Response:
Returns a `.ttf` font file (`QCF_P{NNN}.ttf`) with `Cache-Control: public, max-age=31536000` (1-year cache). Each Quran page has its own QPC font for rendering page-specific glyphs. Returns 404 if page is out of range or font file is missing.

### Class Endpoints (Authenticated)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/classes` | Any | Teachers: their classes; Students: published classes they're in |
| GET | `/classes/{class_id}` | Any | Get specific class (with auth check) |
| POST | `/classes` | Teacher | Create new class with student_ids |
| DELETE | `/classes/{class_id}` | Teacher | Delete class (owner only, cascades) |
| PATCH | `/classes/{class_id}/notes` | Teacher | Update class notes (owner only) |
| PATCH | `/classes/{class_id}/performance` | Teacher | Update class rating (owner only) |
| **PATCH** | `/classes/{class_id}/publish` | Teacher | **Toggle visibility for students** |
| **POST** | `/classes/{class_id}/students` | Teacher | **Add students to class** |
| **DELETE** | `/classes/{class_id}/students/{student_id}` | Teacher | **Remove student from class** |
| POST | `/classes/{class_id}/assignments` | Teacher | Add assignments (owner only) |
| PATCH | `/assignments/{assignment_id}` | Teacher | Update an assignment |

#### POST `/classes` Request Body:
```json
{
  "date": "2025-12-13",
  "day": "Friday",
  "notes": "Optional notes",
  "student_ids": [1, 2, 3],
  "assignments": [...]
}
```

#### PATCH `/classes/{id}/publish` Request Body:
```json
{
  "is_published": true
}
```

### Mistake Endpoints (Authenticated)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/mistakes` | Any | Teachers: filter by `?student_id=N`; Students: own mistakes only |
| GET | `/mistakes/with-occurrences` | Any | Same as above with class occurrence info |
| POST | `/mistakes` | Teacher | Record mistake for a student (requires student_id) |
| DELETE | `/mistakes/{mistake_id}` | Teacher | Remove mistake (for their students only) |

#### POST `/mistakes` Request Body:
```json
{
  "student_id": 5,       // REQUIRED: which student made this mistake
  "surah_number": 96,
  "ayah_number": 1,
  "word_index": 0,
  "word_text": "اقْرَأْ",
  "char_index": null,    // null = whole word, number = specific character/harakat
  "class_id": 3          // optional: links occurrence to class
}
```

### Stats Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | Get dashboard statistics |

### Backup Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/backup/create` | Create backup in Backups folder |
| GET | `/backup/list` | List all backup files |
| POST | `/backup/restore` | Restore from backup file |

### Sync Endpoints (Mobile App - Legacy)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/sync/pull` | None | Pull all classes/mistakes from server to mobile |
| POST | `/sync/push` | None | Push local changes from mobile to server |

*Note: These legacy endpoints pre-date the multi-user auth system and do not require authentication.*

#### POST `/sync/pull` Request Body:
```json
{ "last_sync_at": "2025-01-01T00:00:00" }
```
Returns all classes (with assignments) and mistakes. `last_sync_at` is accepted but currently returns all data regardless.

#### POST `/sync/push` Request Body:
```json
{
  "device_id": "optional-device-id",
  "classes": [
    {
      "local_id": 1,
      "server_id": null,
      "date": "2025-12-13",
      "day": "Friday",
      "notes": "...",
      "is_deleted": false,
      "assignments": [{"type": "hifz", "start_surah": 67, "end_surah": 67, "start_ayah": 1, "end_ayah": 10}]
    }
  ],
  "mistakes": [
    {
      "local_id": 1,
      "server_id": null,
      "surah_number": 96,
      "ayah_number": 1,
      "word_index": 0,
      "word_text": "اقْرَأْ",
      "error_count": 1,
      "is_deleted": false
    }
  ]
}
```
Returns `class_id_mapping` and `mistake_id_mapping` (local_id -> server_id) plus `server_time`.

### Supabase Sync Endpoints (Cloud Sync)

These endpoints sync data between local `app.db` and Supabase (cloud PostgreSQL). All require a valid Supabase JWT token.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/sync` | Supabase JWT | Trigger full background sync (push + pull) |
| POST | `/sync/push` | Supabase JWT | Push pending local changes to Supabase |
| POST | `/sync/pull` | Supabase JWT | Pull changes from Supabase to local app.db |
| GET | `/sync/status` | Supabase JWT | Get pending/synced/error counts |

*Note: `/sync/push` and `/sync/pull` are overloaded - when called with a Supabase JWT they use the Supabase sync logic; without auth they fall through to the legacy mobile sync.*

#### POST `/sync` Response:
```json
{ "message": "Sync started", "user_id": "supabase-uuid", "role": "teacher" }
```
Accepts optional `role` query param. Runs `full_sync()` as a background task and returns immediately.

#### GET `/sync/status` Response:
```json
{
  "pending": { "classes": 2, "mistakes": 5 },
  "errors": { "classes": 0, "mistakes": 1 },
  "synced": false
}
```
Counts records by `sync_status` column. `synced` is `true` only when all pending counts are zero.

### Local-First Endpoints (Supabase Auth)

These endpoints write to local `app.db` first for instant response, then trigger background sync to Supabase. All require a valid Supabase JWT token.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/local/classes` | Supabase JWT | Create class locally, sync in background |
| GET | `/local/classes` | Supabase JWT | Get classes from app.db (synced + pending) |
| POST | `/local/mistakes` | Supabase JWT | Add mistake locally, sync in background |
| GET | `/local/mistakes` | Supabase JWT | Get mistakes from app.db |

#### POST `/local/classes` Request Body:
Same as `POST /classes` (ClassCreate model):
```json
{
  "date": "2025-12-13",
  "day": "Friday",
  "notes": "...",
  "student_ids": [],
  "assignments": [{"type": "hifz", "start_surah": 67, "end_surah": 67, "start_ayah": 1, "end_ayah": 10}],
  "class_type": "regular"
}
```
Response:
```json
{ "id": 42, "message": "Class created locally", "sync_status": "pending" }
```
Sets `supabase_teacher_id` from the JWT, inserts with `sync_status = 'pending'`, and triggers `push_pending_classes()` in background.

#### GET `/local/classes` Response:
Same structure as `GET /classes` but includes `sync_status` on each class and assignment. Accepts optional `role` query param. Teachers see classes matching their `supabase_teacher_id`; students see published classes.

#### POST `/local/mistakes` Request Body:
Same as `POST /mistakes` (MistakeCreate model). Response:
```json
{ "id": 15, "error_count": 2, "sync_status": "pending" }
```
If mistake already exists (matched by `supabase_student_id` + location), increments `error_count`. Otherwise creates new. Triggers `push_pending_mistakes()` in background.

#### GET `/local/mistakes` Response:
Returns mistakes where `supabase_student_id` matches the JWT user. Accepts optional `surah_number` query param. Ordered by `error_count DESC`.

---

## Frontend Architecture

### Pages

#### 1. Dashboard (`/`)
- Overview statistics:
  - **Current Progress** - Last Hifz surah
  - **Total Classes** - Count of all classes
  - **Repeated Mistakes** - Mistakes made multiple times
- Quick link to last class
- Surahs needing attention (most mistakes)
- Top repeated mistakes list
- Recent classes table

#### 2. Classes (`/classes`)
- **Table View Only** (card view removed)
- Grouped by **Month** (e.g., "December 2024")
- Each row shows:
  - **Week number** (W1, W2... from first class)
  - Date (DD/MM)
  - Day (Mon, Tue...)
  - Hifz portion(s)
  - Sabqi portion(s)
  - Manzil portion(s)
  - **Performance** (clickable dropdown: Excellent/Very Good/Good/Needs Work)
  - **Notes** (clickable edit icon)
  - Delete button
- Create new class modal
- Backup/Restore functionality

#### 3. Classroom (`/classes/:id`)
- Section tabs (Hifz, Sabqi, Revision)
- Portion navigation (for multiple portions)
- Surah navigation (for multi-surah assignments)
- Ayah display with Arabic text
- **Click word to mark GLOBAL mistake**
- **Long-press/right-click for character-level (harakat) mistakes**
- Right-click to remove mistake
- Mistake color coding by severity (1x-5x)
- Mistake summary sections:
  - "Mistakes in This Class" (made during current class)
  - "Mistakes from Previous Classes" (historical)
- Add/Edit portion modals
- Class notes editor

#### 4. Settings (`/settings`)
- Protected route (requires authentication)
- Three card-based sections:
  - **Profile Information**: Edit first name and last name
  - **Account Information** (read-only): Email, role badge, "Member Since" date
  - **Change Password**: New password + confirm, minimum 8 characters
- Color-coded section icons (Cyan, Purple, Amber)
- Success/error notifications per section (auto-dismiss after 3 seconds)
- Dark/light mode support

#### 5. ForgotPassword (`/forgot-password`)
- Public route (no authentication required)
- Email input form to request password reset link via Supabase Auth
- Success state shows confirmation with submitted email
- Links to Login page

#### 6. ResetPassword (`/reset-password`)
- Public route, accessed via email reset link
- Validates `access_token` in URL hash on mount
- Three states: Invalid Link, Form (new + confirm password), Success (auto-redirect to login)
- Minimum 8 character password requirement

### Components

#### ProtectedRoute (`src/components/ProtectedRoute.tsx`)
- Wraps all authenticated routes in `App.tsx`
- Props: `children` (required), `requireVerified` (optional, defaults to `false`)
- **Loading state**: Shows spinner while auth is initializing
- **Not authenticated**: Redirects to `/login` with current location saved in state
- **Requires verification**: If `requireVerified=true` and user is unverified, shows a "Verification Required" message with a "Go to Dashboard" button
- Uses `isAuthenticated`, `isVerified`, `isLoading` from `useAuth()`

See: [Settings_Password_Reset.md](./Settings_Password_Reset.md)

---

## Mobile App (Flutter)

### App Name: QuranTrack

### Features
- Offline-first with local SQLite database
- Sync with backend server via WiFi
- Same functionality as web app
- Performance rating per class
- Settings screen to configure server URL

### Key Files
- `lib/core/network/api_client.dart` - API communication, URL persistence
- `lib/core/sync/sync_service.dart` - Two-way sync logic
- `lib/data/models/` - ClassSession, Assignment, Mistake models
- `lib/presentation/screens/` - Dashboard, Classes, Classroom, Settings

### Sync Requirements
- Mobile and server must be on same WiFi network
- Server URL format: `http://192.168.x.x:8000`
- Alternative: Use ngrok for remote access

---

## Features

### 1. GLOBAL Mistake Tracking (Per Student)
**Mistakes are NOT class-specific but ARE student-specific.** When a teacher marks a word as a mistake for a student:
- It is stored globally per student in the `mistakes` table
- It will appear highlighted wherever that word shows up (for that student)
- The `mistake_occurrences` table tracks WHEN it was marked
- Each student has their own independent mistake tracking
- Students can only see their own mistakes (privacy enforced)

### 2. Word-Level vs Character-Level Mistakes
- **Word-level:** `char_index = null` - entire word is highlighted with background gradient
- **Letter-level:** `char_index = N` (base letter) - letter + its harakat highlighted with background
- **Harakat-level:** `char_index = N` (diacritical mark) - ONLY the harakat is highlighted
  - Uses bright color + glow effect (text-shadow) for visibility
  - Base letter remains unchanged - only the diacritical mark glows
  - Larger font-size (1.3em) and bold to make small marks visible
  - Allows precise tracking of vowel mark mistakes (fatha, damma, kasra, etc.)

### 3. Mistake Color Coding
| Count | Color | Meaning |
|-------|-------|---------|
| 1x | Yellow | First occurrence |
| 2x | Blue | Repeated once |
| 3x | Orange | Needs attention |
| 4x | Purple | Significant issue |
| 5x+ | Red | Critical - needs focus |

### 4. Class Performance Rating
Teachers can rate each class after completion:
- **Excellent** (Green) - Outstanding performance
- **Very Good** (Teal) - Above expectations
- **Good** (Amber) - Met expectations
- **Needs Work** (Red) - Below expectations

### 5. Table View with Week/Month Grouping
- Classes organized by month
- Week numbers calculated from first class date
- Compact view to see many classes at once
- Similar to Excel spreadsheet format

### 6. Section Types
- **Hifz (Memorization):** New memorization portion
- **Sabqi (Recent):** Recently memorized, needs reinforcement
- **Revision (Manzil):** Long-term revision of older portions

### 7. Multiple Portions Per Section
Each class can have multiple portions:
- Example: Hifz could have Surah 92:12-21 AND Surah 93:1-5
- Portion navigation allows switching between them

---

## Data Flow

### Adding a Mistake (Teacher Only)
```
Teacher clicks word in Classroom (student selected)
    ↓
Frontend: addMistake(data) with student_id (required) and class_id (optional)
    ↓
Backend: Auth check - must be verified teacher
    ↓
Backend: Check if mistake exists for THIS STUDENT (student_id + surah + ayah + word_index + char_index)
    ↓
If exists: INCREMENT error_count
If new: INSERT into mistakes table with student_id
    ↓
INSERT into mistake_occurrences (links this occurrence to class)
    ↓
Return updated mistake with error_count
    ↓
Frontend: Reload mistakes - highlighted for that student
```

### Viewing Mistakes (Role-Based)
```
Teacher: getMistakesWithOccurrences(studentId)
    ↓
Backend: Auth check, returns mistakes for specified student
    ↓
Frontend filters for display:
  - "Mistakes in This Class": occurrences where class_id = current
  - "Mistakes from Previous Classes": occurrences with earlier dates
  - Mistakes highlighted for the selected student

Student: getMistakesWithOccurrences() (no studentId param)
    ↓
Backend: Auth check, returns ONLY the student's own mistakes
    ↓
Frontend displays student's personal mistake history
  - Privacy enforced: cannot see other students' mistakes
```

---

## Sync System

### Mobile to Server (Push)
```
Mobile: Collect local changes (new classes, mistakes)
    ↓
POST /sync/push with payload
    ↓
Server: Validate and insert/update records
    ↓
Return success/failure
```

### Server to Mobile (Pull)
```
Mobile: GET /sync/pull
    ↓
Server: Return all classes and mistakes
    ↓
Mobile: Upsert into local SQLite
```

### Sync Considerations
- Classes without assignments are skipped
- Duplicate prevention by date + day
- Performance and notes sync both ways

---

## Backup System

### Creating Backup
1. User clicks "Create Backup" button
2. Backend copies `app.db` to `Backups/quran_logbook_backup_TIMESTAMP.db`
3. Returns filename for confirmation

### Restoring Backup
1. User clicks "Restore Backup"
2. Modal shows list of available backups
3. User selects backup file
4. Confirmation dialog
5. Backend copies backup file over `app.db`
6. Page reloads with restored data

---

## Setup & Running

### Backend Setup
```bash
cd quran_backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn pydantic

# Run server
python main.py
# or
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
cd quran_frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

### Mobile Setup
```bash
cd quran_mobile

# Get dependencies
flutter pub get

# Run on connected device
flutter run
```

### Access URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Mobile connects to: http://[YOUR_IP]:8000

---

## Environment

- Development Platform: Windows 11 with WSL2
- Node.js: v18+
- Python: 3.10+
- Flutter: 3.x
- Database: SQLite 3

---

## Related Documentation

- **[AUTH_SYSTEM.md](./AUTH_SYSTEM.md)** - Authentication system, JWT tokens, user roles, student management
- **[CLASSES_AND_MISTAKES.md](./CLASSES_AND_MISTAKES.md)** - Classes, assignments, mistake tracking, page-based Quran display
- **[PROJECT_CHANGELOG.md](../PROJECT_CHANGELOG.md)** - Chronological development history (main reference)

---

## Recent Updates (Phase 10)

### Harakat Highlighting Enhancement
- **Harakat-Only Glow**: Harakat mistakes now highlighted separately from base letter
- **CSS Glow Effect**: Bright color + text-shadow glow instead of background-color
- **No Vertical Line**: Solved the issue of background-color creating vertical bars on zero-width combining characters
- **Visibility**: Larger font-size (1.3em) and bold weight for small diacritical marks

### Uthmani Text Alignment
- **Baseline Alignment**: Uthmani text aligned with QPC glyphs using relative positioning
- **Sizing**: fontSize 0.85em, fontWeight 400 to match QPC rendering
- **Vertical Shift**: top: -0.3em to align baselines

### Student Classes UI Redesign
- **Card Layout**: Redesigned from table to card-based layout matching Teacher view
- **Portions Display**: Each portion type (Hifz, Sabqi, Manzil) on its own colored row
- **Mistake Counts**: Students now see their own mistake counts per portion
- **Performance Badge**: Read-only badge showing teacher's rating
- **Backend Update**: API now returns `mistake_counts` and `performance` for student view

---

## Previous Updates (Phase 7)

### QuranReader Enhancements
- **Surah Dropdown**: Select any surah to navigate to its first page
- **Surah Headers**: Displays "سُورَةُ [name]" when a new surah starts on a page
- **Bismillah Display**: Shows bismillah for surahs 2-114 (except surah 9)

### Classroom Enhancements
- **Portion Highlighting**: Words outside assigned ayah range are dimmed (opacity 0.25)
- Prevents accidental mistake marking on unassigned content

### Login Page
- **Demo User Buttons**: 17 clickable buttons to auto-fill demo account credentials
- Organized by role: Personal, Teachers, Students

### Utility Scripts
- `clear_mistakes.py`: Clears all mistakes while preserving users/classes
- `create_test_users.py`: Creates demo accounts for testing

---

*Last Updated: February 15, 2026*
