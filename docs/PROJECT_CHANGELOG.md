# QuranTrack - Project Changelog

A chronological record of what has been built.

---

## Phase 1: Foundation

**Status:** Complete

- Core Quran Reader with Arabic text display
- Mistake tracking (tap to mark, frequency tracked)
- Class session recording
- Practice mode with mistake highlights
- Dark theme UI (emerald/teal on slate)

**Stack:** React + TypeScript frontend, FastAPI backend, Flutter mobile

See: [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md)

---

## Phase 2: Multi-User Expansion

**Status:** In Progress

### Done
- Teacher Dashboard view (`/teacher`)
- Student Dashboard view (`/student`)
- Teacher Classes list (`/teacher/classes`)
- Student Classes list (`/student/classes`)
- Teacher Classroom with Student Switcher (`/teacher/classes/:id`)
- Student Classroom read-only view (`/student/classes/:id`)
- Role switcher in navigation

### Next
- Authentication system (JWT)
- User database tables
- Student ID system

See: [QuranTrack Academy_ Architecture Blueprint.md](./QuranTrack%20Academy_%20Architecture%20Blueprint.md)

See: [Logical Architecture Blueprint_ User Identity & Relationships.md](./Logical%20Architecture%20Blueprint_%20User%20Identity%20&%20Relationships.md)

---

## Running the Project

**Backend:** `cd quran_backend && python main.py`

**Frontend:** `cd quran_frontend && npm run dev`

**Mobile:** `cd quran_mobile && flutter run`
