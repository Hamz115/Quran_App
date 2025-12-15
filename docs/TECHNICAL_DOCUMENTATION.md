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
| created_at | TEXT | Timestamp |
| updated_at | TEXT | Timestamp |
| device_id | TEXT | For sync identification |

#### Table: `class_students` (Junction Table)
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| class_id | INTEGER | Foreign key to classes (CASCADE delete) |
| student_id | INTEGER | Foreign key to users |

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

**Unique Constraint:** `(student_id, surah_number, ayah_number, word_index, char_index)`

**IMPORTANT:** Mistakes are GLOBAL per student. They are NOT tied to any specific class. Each student has their own mistakes tracked separately. Teachers record mistakes for specific students; students can only view their own.

#### Table: `mistake_occurrences`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| mistake_id | INTEGER | Foreign key to mistakes (CASCADE delete) |
| class_id | INTEGER | Foreign key to classes (CASCADE delete) |
| occurred_at | TEXT | Timestamp of occurrence |

This table tracks WHEN a mistake was made in WHICH class, enabling:
- Tracking repeated mistakes across classes
- Historical analysis of when mistakes were made
- Identifying if a mistake was made in current class vs previous

---

## Backend API Endpoints

Base URL: `http://localhost:8000/api`

### Quran Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/surahs` | Get all 114 surahs |
| GET | `/surahs/{surah_number}` | Get specific surah with ayahs |

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

### Sync Endpoints (For Mobile App)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sync/pull` | Pull data from server to mobile |
| POST | `/sync/push` | Push data from mobile to server |

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
- **Word-level:** `char_index = null` - entire word is highlighted
- **Character-level:** `char_index = N` - specific letter/harakat highlighted
  - Used for harakat (diacritical marks) mistakes
  - Allows tracking if student struggles with specific vowel marks

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
- **[PROJECT_CHANGELOG.md](./PROJECT_CHANGELOG.md)** - Chronological development history

---

*Last Updated: December 14, 2025*
