# QuranTrack - Application Overview

## Executive Summary

QuranTrack is a locally hosted, full-stack Learning Management System (LMS) for Quran teaching. It tracks student progress, mistakes, and class performance across memorization (Hifz), recent revision (Sabqi), and long-term revision (Manzil) sessions.

**Key Design Principle:** Mistakes are tracked GLOBALLY - not per class. When you mark a mistake, it persists everywhere.

## Technology Stack

### Web Application
| Component | Technology |
|-----------|------------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend | Python + FastAPI |
| Database | SQLite (two databases: quran.db + app.db) |

### Mobile Application
| Component | Technology |
|-----------|------------|
| Framework | Flutter (Dart) |
| State | Riverpod |
| Database | SQLite (sqflite) |
| HTTP | Dio |

## Database Schema

### classes Table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| date | TEXT | YYYY-MM-DD |
| day | TEXT | Day of week |
| notes | TEXT | Optional notes |
| performance | TEXT | Excellent/Very Good/Good/Needs Work |

### assignments Table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| class_id | INTEGER | FK to classes |
| type | TEXT | hifz/sabqi/revision |
| start_surah | INTEGER | Starting surah (1-114) |
| end_surah | INTEGER | Ending surah |
| start_ayah | INTEGER | Optional start ayah |
| end_ayah | INTEGER | Optional end ayah |

### mistakes Table (GLOBAL)
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| surah_number | INTEGER | Surah number |
| ayah_number | INTEGER | Ayah number |
| word_index | INTEGER | Word position (0-indexed) |
| word_text | TEXT | Arabic word |
| char_index | INTEGER | NULL = whole word, N = specific character |
| error_count | INTEGER | Times mistake was made |

**IMPORTANT:** Mistakes are NOT tied to classes. They are global and appear everywhere.

### mistake_occurrences Table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| mistake_id | INTEGER | FK to mistakes |
| class_id | INTEGER | FK to classes |
| occurred_at | TEXT | Timestamp |

Tracks WHEN a mistake was made in WHICH class.

## API Endpoints

### Classes
- GET /api/classes - List all classes
- POST /api/classes - Create class
- DELETE /api/classes/{id} - Delete class
- PATCH /api/classes/{id}/notes - Update notes
- PATCH /api/classes/{id}/performance - Update performance rating

### Mistakes
- GET /api/mistakes - Get all GLOBAL mistakes
- POST /api/mistakes - Add/increment mistake
- DELETE /api/mistakes/{id} - Remove mistake

### Sync (Mobile)
- GET /api/sync/pull - Pull data to mobile
- POST /api/sync/push - Push data from mobile

## Features

### 1. Global Mistake Tracking
- Mistakes persist across all classes
- Character-level tracking for harakat mistakes
- Color-coded severity (1x-5x: yellow, blue, orange, purple, red)

### 2. Class Management
- Table view grouped by month
- Week numbers from first class
- Performance ratings (Excellent/Very Good/Good/Needs Work)
- Editable notes

### 3. Section Types
- **Hifz:** New memorization
- **Sabqi:** Recent revision
- **Manzil:** Long-term revision

### 4. Mobile App
- Offline-first with local database
- Sync with server over WiFi
- Same features as web app

## Running the Application

### Backend
cd quran_backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install fastapi uvicorn pydantic
uvicorn main:app --reload --host 0.0.0.0 --port 8000

### Frontend
cd quran_frontend
npm install
npm run dev

### Mobile
cd quran_mobile
flutter pub get
flutter run

## Access URLs
- Web Frontend: http://localhost:5173
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Mobile: Configure server URL in Settings

---

*Last Updated: December 11, 2025*
