# QuranTrack Architecture: Migration to Supabase

## Document Info
- **Created:** January 18, 2026
- **Author:** Architecture Planning Session
- **Status:** Proposed
- **Affects:** Desktop App, Mobile App, Backend

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture](#current-architecture)
3. [Problems with Current Architecture](#problems-with-current-architecture)
4. [Why We Need a New Architecture](#why-we-need-a-new-architecture)
5. [Proposed Architecture: Supabase](#proposed-architecture-supabase)
6. [Technical Deep Dive](#technical-deep-dive)
7. [Authentication Flow](#authentication-flow)
8. [Data Sync Architecture](#data-sync-architecture)
9. [Offline Support](#offline-support)
10. [Security Model](#security-model)
11. [Cost Analysis](#cost-analysis)
12. [Migration Plan](#migration-plan)
13. [File Changes Summary](#file-changes-summary)

---

## Executive Summary

QuranTrack currently uses a **three-tier architecture** with a FastAPI backend that must be running for the app to function. This creates challenges for distribution as a standalone desktop application and adds hosting costs.

**The proposed solution:** Replace the FastAPI backend with **Supabase**, a Backend-as-a-Service platform that provides:
- Authentication (signup, login, JWT)
- PostgreSQL database with REST API
- Real-time subscriptions
- Row Level Security

This allows us to:
- Distribute a **standalone desktop app** (no server required)
- Support **mobile apps** with the same backend
- Enable **real-time sync** between teacher and student
- Reduce costs to **$0/month** on free tier
- Maintain **offline support** with local SQLite cache

---

## Current Architecture

### Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           LOCAL MACHINE                                 │
│                                                                         │
│  ┌─────────────────────┐         ┌─────────────────────────────────┐    │
│  │   React Frontend    │────────►│        FastAPI Backend          │    │
│  │   (quran_frontend)  │  HTTP   │        (quran_backend)          │    │
│  │                     │         │                                 │    │
│  │  • Pages            │         │  • Auth endpoints               │    │
│  │  • Components       │         │  • Class endpoints              │    │
│  │  • API calls        │         │  • Mistake endpoints            │    │
│  │                     │         │  • Test endpoints               │    │
│  └─────────────────────┘         │                                 │    │
│                                  └──────────────┬──────────────────┘    │
│                                                 │                       │
│                                                 ▼                       │
│                                  ┌──────────────────────────────────┐   │
│                                  │           SQLite                 │   │
│                                  │  ┌──────────┐    ┌──────────┐    │   │
│                                  │  │ app.db   │    │ quran.db │    │   │
│                                  │  │ (R/W)    │    │ (R/O)    │    │   │
│                                  │  └──────────┘    └──────────┘    │   │
│                                  └──────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         MOBILE (Separate)                               │
│                                                                         │
│  ┌─────────────────────┐         ┌─────────────────────────────────┐    │
│  │   Flutter App       │────────►│        Same FastAPI             │    │
│  │   (quran_mobile)    │  HTTP   │        (must be reachable)      │    │
│  │                     │         │                                 │    │
│  │  • Local SQLite     │         │  Requires:                      │    │
│  │  • Sync service     │         │  • Same network (WiFi)          │    │
│  │  • Offline mode     │         │  • Or ngrok tunnel              │    │
│  └─────────────────────┘         └─────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Current Technology Stack

| Layer | Technology | Location |
|-------|------------|----------|
| Frontend | React + TypeScript + Tailwind | `quran_frontend/` |
| Backend | FastAPI (Python) | `quran_backend/` |
| Mobile | Flutter + Dart + Riverpod | `quran_mobile/` |
| Database | SQLite (app.db + quran.db) | `quran_backend/` |
| Auth | Custom JWT implementation | `quran_backend/auth/` |

### Current Data Flow

```
USER ACTION                    FRONTEND                 BACKEND                 DATABASE
───────────                    ────────                 ───────                 ────────

Teacher Login
    │
    ├──────────────────► POST /auth/login ─────────► Verify password ────► SELECT from users
    │                                                     │
    │                                                     ▼
    │                    ◄─────────────────────── Generate JWT
    │                    { access_token, user }
    │
Teacher Creates Class
    │
    ├──────────────────► POST /classes ────────────► Validate JWT ─────► INSERT into classes
    │                    { date, students,                │
    │                      assignments }                  ▼
    │                                              INSERT into assignments
    │                                                     │
    │                    ◄─────────────────────── Return class data
    │
Student Views Classes
    │
    ├──────────────────► GET /classes ─────────────► Validate JWT
    │                    Authorization: Bearer xxx        │
    │                                                     ▼
    │                                              Check: is_published?
    │                                              Check: student in class?
    │                                                     │
    │                    ◄─────────────────────── Return filtered classes
```

---

## Problems with Current Architecture

### 1. Distribution Challenge

```
PROBLEM: Can't easily distribute as standalone app

Current state:
┌─────────────────┐
│ To run the app: │
│                 │
│ 1. Install Python
│ 2. Install dependencies
│ 3. Run: python main.py
│ 4. Run: npm run dev
│ 5. Keep both running
└─────────────────┘

Desired state:
┌─────────────────┐
│ Double-click    │
│ QuranTrack.exe  │
│                 │
│ That's it.      │
└─────────────────┘
```

**Impact:** Users can't easily install and use the app. Teachers need technical knowledge.

### 2. Mobile Connectivity

```
PROBLEM: Mobile app can't connect without complex setup

┌─────────────────┐              ┌─────────────────┐
│ Mobile App      │──────X──────►│ FastAPI Backend │
│                 │              │ (on computer)   │
└─────────────────┘              └─────────────────┘
        │
        │ Current solutions (all problematic):
        │
        ├─► Same WiFi network (home only)
        ├─► ngrok tunnel (complex, unreliable)
        └─► Deploy to cloud (expensive)
```

**Impact:** Mobile app is effectively unusable outside home network.

### 3. No Real-Time Sync

```
PROBLEM: Student doesn't know when teacher publishes

Teacher publishes class
        │
        ▼
┌─────────────────┐
│ Database        │
│ updated         │
└─────────────────┘
        │
        │ ??? How does student know ???
        │
        ▼
┌─────────────────┐
│ Student must    │
│ manually        │
│ refresh         │
└─────────────────┘
```

**Impact:** Poor user experience. Students miss updates.

### 4. Single Point of Failure

```
PROBLEM: If backend stops, everything breaks

┌─────────────────┐              ┌─────────────────┐
│ Frontend        │──────────────│ Backend DOWN    │
│                 │              │ ⚠️ 500 Error    │
│ ⚠️ Can't login  │              │                 │
│ ⚠️ Can't view   │              │ • Computer off  │
│ ⚠️ Can't save   │              │ • Python crash  │
└─────────────────┘              │ • Port conflict │
                                 └─────────────────┘
```

### 5. Cost for Multi-User

```
PROBLEM: Scaling requires expensive cloud hosting

For 10 users:    Free (localhost)
For 100 users:   Need cloud server (~$20-50/month)
For 1000 users:  Need bigger server (~$100+/month)

Plus:
• Server maintenance
• Security updates
• Database backups
• SSL certificates
```

---

## Why We Need a New Architecture

### Requirements

| Requirement | Current | Needed |
|-------------|---------|--------|
| Standalone installer | ❌ No | ✅ Yes |
| No server required | ❌ No | ✅ Yes |
| Mobile works anywhere | ❌ No | ✅ Yes |
| Real-time sync | ❌ No | ✅ Yes |
| Offline support | ⚠️ Mobile only | ✅ All platforms |
| Low/no cost | ⚠️ If cloud | ✅ Yes |
| Multi-platform auth | ❌ DIY | ✅ Built-in |

### The Core Question

> How do we connect Teacher's app to Student's app without running our own server 24/7?

### Answer: Backend-as-a-Service (BaaS)

Instead of running our own backend, we use a **managed service** that:
- Handles authentication
- Stores data in the cloud
- Provides real-time sync
- Scales automatically
- Has generous free tier

**Our choice: Supabase**

---

## Proposed Architecture: Supabase

### Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                   │
│                                                                         │
│                    ┌─────────────────────────────┐                      │
│                    │         SUPABASE            │                      │
│                    │                             │                      │
│                    │  ┌─────────┐ ┌──────────┐   │                      │
│                    │  │  AUTH   │ │ DATABASE │   │                      │
│                    │  │         │ │ Postgres │   │                      │
│                    │  │ • JWT   │ │          │   │                      │
│                    │  │ • Users │ │ • Tables │   │                      │
│                    │  └─────────┘ │ • RLS    │   │                      │
│                    │              └──────────┘   │                      │
│                    │  ┌─────────┐ ┌──────────┐   │                      │
│                    │  │REALTIME │ │ STORAGE  │   │                      │
│                    │  │         │ │(optional)│   │                      │
│                    │  │• WebSocket│          │   │                      │
│                    │  │• Subscribe│          │   │                      │
│                    │  └─────────┘ └──────────┘   │                      │
│                    │                             │                      │
│                    └──────────────┬──────────────┘                      │
│                                   │                                     │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│  DESKTOP APP      │     │   MOBILE APP      │     │   MOBILE APP      │
│  (Electron)       │     │   (Android)       │     │   (iOS)           │
│                   │     │                   │     │                   │
│ ┌───────────────┐ │     │ ┌───────────────┐ │     │ ┌───────────────┐ │
│ │ React + TS    │ │     │ │ Flutter       │ │     │ │ Flutter       │ │
│ │               │ │     │ │               │ │     │ │               │ │
│ │ Supabase JS   │ │     │ │ Supabase      │ │     │ │ Supabase      │ │
│ │ Client        │ │     │ │ Flutter SDK   │ │     │ │ Flutter SDK   │ │
│ └───────────────┘ │     │ └───────────────┘ │     │ └───────────────┘ │
│                   │     │                   │     │                   │
│ ┌───────────────┐ │     │ ┌───────────────┐ │     │ ┌───────────────┐ │
│ │ Local SQLite  │ │     │ │ Local SQLite  │ │     │ │ Local SQLite  │ │
│ │ (offline)     │ │     │ │ (sqflite)     │ │     │ │ (sqflite)     │ │
│ └───────────────┘ │     │ └───────────────┘ │     │ └───────────────┘ │
│                   │     │                   │     │                   │
│ ┌───────────────┐ │     │ ┌───────────────┐ │     │ ┌───────────────┐ │
│ │ Bundled:      │ │     │ │ Bundled:      │ │     │ │ Bundled:      │ │
│ │ • quran.db    │ │     │ │ • quran.db    │ │     │ │ • quran.db    │ │
│ │ • QPC fonts   │ │     │ │ • QPC fonts   │ │     │ │ • QPC fonts   │ │
│ │ • page JSONs  │ │     │ │ • page JSONs  │ │     │ │ • page JSONs  │ │
│ └───────────────┘ │     │ └───────────────┘ │     │ └───────────────┘ │
└───────────────────┘     └───────────────────┘     └───────────────────┘
```

### What Supabase Replaces

| Current Component | Supabase Replacement |
|-------------------|----------------------|
| `auth/routes.py` (signup, login) | Supabase Auth |
| `auth/utils.py` (JWT, bcrypt) | Supabase Auth |
| `main.py` API endpoints | Supabase REST API (auto-generated) |
| `app.db` (users, classes, mistakes) | Supabase PostgreSQL |
| Manual polling for updates | Supabase Realtime |

### What Stays Local

| Component | Reason |
|-----------|--------|
| `quran.db` (Quran text) | Read-only, never changes, bundled |
| `quran-pages/*.json` (QPC data) | Read-only, never changes, bundled |
| `fonts/qpc/*.woff2` (fonts) | Read-only, never changes, bundled |
| Local SQLite cache | Offline support |

---

## Technical Deep Dive

### Supabase Database Schema

```sql
-- ═══════════════════════════════════════════════════════════════════
-- USERS (handled by Supabase Auth, extended with profile)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
    student_id TEXT UNIQUE,  -- STU-XXXXXX format for students
    is_verified BOOLEAN DEFAULT false,  -- true for teachers
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- TEACHER-STUDENT RELATIONSHIPS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE teacher_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, student_id)
);

-- ═══════════════════════════════════════════════════════════════════
-- CLASSES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    day TEXT,
    notes TEXT,
    performance TEXT CHECK (performance IN ('Excellent', 'Very Good', 'Good', 'Needs Work')),
    is_published BOOLEAN DEFAULT false,
    class_type TEXT DEFAULT 'regular' CHECK (class_type IN ('regular', 'test')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- CLASS-STUDENT JUNCTION (which students are in which class)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE class_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    UNIQUE(class_id, student_id)
);

-- ═══════════════════════════════════════════════════════════════════
-- ASSIGNMENTS (portions within a class)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('hifz', 'sabqi', 'revision')),
    start_surah INTEGER NOT NULL,
    end_surah INTEGER NOT NULL,
    start_ayah INTEGER,
    end_ayah INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- MISTAKES (GLOBAL per student, not per class)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE mistakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    surah_number INTEGER NOT NULL,
    ayah_number INTEGER NOT NULL,
    word_index INTEGER NOT NULL,
    word_text TEXT NOT NULL,
    char_index INTEGER,  -- NULL = whole word, number = specific character
    error_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, surah_number, ayah_number, word_index, COALESCE(char_index, -1))
);

-- ═══════════════════════════════════════════════════════════════════
-- MISTAKE OCCURRENCES (when/where each mistake happened)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE mistake_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mistake_id UUID NOT NULL REFERENCES mistakes(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- TESTS (for test-type classes)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID UNIQUE NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id),
    total_score REAL,
    max_score REAL DEFAULT 100,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE test_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    start_surah INTEGER NOT NULL,
    start_ayah INTEGER NOT NULL,
    end_surah INTEGER,
    end_ayah INTEGER,
    points_earned REAL,
    points_possible REAL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE test_mistakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_id UUID REFERENCES test_questions(id),
    mistake_id UUID REFERENCES mistakes(id),
    surah_number INTEGER NOT NULL,
    ayah_number INTEGER NOT NULL,
    word_index INTEGER NOT NULL,
    word_text TEXT NOT NULL,
    char_index INTEGER,
    is_tanbeeh BOOLEAN DEFAULT false,
    is_repeated BOOLEAN DEFAULT false,
    previous_error_count INTEGER DEFAULT 0,
    points_deducted REAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS) Policies

```sql
-- ═══════════════════════════════════════════════════════════════════
-- PROFILES: Users can read all, but only update their own
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════════════
-- TEACHER_STUDENTS: Teachers manage their own relationships
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE teacher_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their students"
    ON teacher_students FOR SELECT
    USING (
        auth.uid() = teacher_id
        OR auth.uid() = student_id
    );

CREATE POLICY "Teachers can add students"
    ON teacher_students FOR INSERT
    WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can remove students"
    ON teacher_students FOR DELETE
    USING (auth.uid() = teacher_id);

-- ═══════════════════════════════════════════════════════════════════
-- CLASSES: Teachers see their own, students see published ones they're in
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers see own classes"
    ON classes FOR SELECT
    USING (auth.uid() = teacher_id);

CREATE POLICY "Students see published classes they're in"
    ON classes FOR SELECT
    USING (
        is_published = true
        AND EXISTS (
            SELECT 1 FROM class_students
            WHERE class_students.class_id = classes.id
            AND class_students.student_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can create classes"
    ON classes FOR INSERT
    WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own classes"
    ON classes FOR UPDATE
    USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own classes"
    ON classes FOR DELETE
    USING (auth.uid() = teacher_id);

-- ═══════════════════════════════════════════════════════════════════
-- MISTAKES: Students see own, teachers see their students'
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE mistakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students see own mistakes"
    ON mistakes FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Teachers see their students mistakes"
    ON mistakes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM teacher_students
            WHERE teacher_students.teacher_id = auth.uid()
            AND teacher_students.student_id = mistakes.student_id
        )
    );

CREATE POLICY "Teachers can create mistakes for their students"
    ON mistakes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM teacher_students
            WHERE teacher_students.teacher_id = auth.uid()
            AND teacher_students.student_id = mistakes.student_id
        )
    );

CREATE POLICY "Teachers can update mistakes for their students"
    ON mistakes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM teacher_students
            WHERE teacher_students.teacher_id = auth.uid()
            AND teacher_students.student_id = mistakes.student_id
        )
    );
```

---

## Authentication Flow

### Signup Flow

```
┌─────────────────┐                           ┌─────────────────┐
│      APP        │                           │    SUPABASE     │
└────────┬────────┘                           └────────┬────────┘
         │                                             │
         │  1. User fills signup form                  │
         │     (email, password, name, role)           │
         │                                             │
         │  2. supabase.auth.signUp({                  │
         │       email, password,                      │
         │       options: { data: { name, role } }     │
         │     })                                      │
         ├────────────────────────────────────────────►│
         │                                             │
         │                                             │ 3. Create user in auth.users
         │                                             │
         │                                             │ 4. Trigger: create profile
         │                                             │    in profiles table
         │                                             │
         │  5. Return { user, session }                │
         │◄────────────────────────────────────────────┤
         │                                             │
         │  6. Session contains:                       │
         │     • access_token (JWT)                    │
         │     • refresh_token                         │
         │     • user object                           │
         │                                             │
         │  7. Supabase client auto-manages tokens     │
         │     (stores in localStorage/SecureStorage)  │
         │                                             │
```

### Login Flow

```
┌─────────────────┐                           ┌─────────────────┐
│      APP        │                           │    SUPABASE     │
└────────┬────────┘                           └────────┬────────┘
         │                                             │
         │  1. supabase.auth.signInWithPassword({      │
         │       email, password                       │
         │     })                                      │
         ├────────────────────────────────────────────►│
         │                                             │
         │                                             │ 2. Verify credentials
         │                                             │
         │                                             │ 3. Generate JWT
         │                                             │
         │  4. Return { user, session }                │
         │◄────────────────────────────────────────────┤
         │                                             │
         │  5. All subsequent requests automatically   │
         │     include JWT in Authorization header     │
         │                                             │
```

### Token Refresh (Automatic)

```
┌─────────────────┐                           ┌─────────────────┐
│  SUPABASE       │                           │    SUPABASE     │
│  CLIENT         │                           │    SERVER       │
└────────┬────────┘                           └────────┬────────┘
         │                                             │
         │  Access token expires in 1 hour             │
         │                                             │
         │  Client automatically detects expiry        │
         │                                             │
         │  POST /auth/v1/token?grant_type=refresh     │
         ├────────────────────────────────────────────►│
         │  { refresh_token: "xxx" }                   │
         │                                             │
         │                                             │ Validate refresh token
         │                                             │ Generate new access token
         │                                             │
         │  { access_token: "new", refresh_token: "new" }
         │◄────────────────────────────────────────────┤
         │                                             │
         │  Seamless to the app - no code needed       │
         │                                             │
```

---

## Data Sync Architecture

### Real-Time Flow: Teacher Publishes Class

```
TEACHER'S APP                    SUPABASE                      STUDENT'S APP
─────────────                    ────────                      ─────────────

1. Teacher clicks "Publish"
   │
   ▼
2. supabase
     .from('classes')
     .update({ is_published: true })
     .eq('id', classId)
   │
   ├──────────────────────────────►│
                                   │
                                   │ 3. Database updated
                                   │
                                   │ 4. Realtime engine detects change
                                   │
                                   │ 5. Find all subscribers for this table
                                   │
                                   │ 6. Push via WebSocket
                                   │    ─────────────────────────────────►│
                                   │                                      │
                                   │                    7. Student's subscription
                                   │                       callback fires
                                   │                                      │
                                   │                                      ▼
                                   │                    8. UI updates instantly!
                                   │                       "New class available!"
```

### Subscription Code

**Desktop (React/TypeScript):**
```typescript
// Subscribe to classes where I'm a student
const channel = supabase
  .channel('my-classes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'classes',
      filter: `is_published=eq.true`
    },
    (payload) => {
      console.log('Class update:', payload);
      // Refresh UI
      fetchClasses();
    }
  )
  .subscribe();

// Cleanup on unmount
return () => {
  supabase.removeChannel(channel);
};
```

**Mobile (Flutter/Dart):**
```dart
// Subscribe to classes
final channel = supabase.channel('my-classes');
channel
  .onPostgresChanges(
    event: PostgresChangeEvent.all,
    schema: 'public',
    table: 'classes',
    filter: PostgresChangeFilter(
      type: PostgresChangeFilterType.eq,
      column: 'is_published',
      value: true,
    ),
    callback: (payload) {
      print('Class update: ${payload.newRecord}');
      // Refresh UI
      ref.invalidate(classesProvider);
    },
  )
  .subscribe();
```

---

## Offline Support

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           APP (Desktop or Mobile)                       │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                         SYNC MANAGER                              │  │
│  │                                                                   │  │
│  │   ┌─────────────────────────────────────────────────────────────┐ │  │
│  │   │                    CONNECTION STATUS                        │ │  │
│  │   │                                                             │ │  │
│  │   │   Online? ───┬───► YES ───► Use Supabase directly           │ │  │
│  │   │              │              Update local cache               │ │  │
│  │   │              │                                               │ │  │
│  │   │              └───► NO ────► Read from local SQLite           │ │  │
│  │   │                             Queue writes for later           │ │  │
│  │   └─────────────────────────────────────────────────────────────┘ │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      LOCAL SQLITE                               │    │
│  │                                                                 │    │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐     │    │
│  │   │ classes     │  │ mistakes    │  │ offline_queue       │     │    │
│  │   │ (cache)     │  │ (cache)     │  │                     │     │    │
│  │   │             │  │             │  │ • pending_creates   │     │    │
│  │   │ Mirror of   │  │ Mirror of   │  │ • pending_updates   │     │    │
│  │   │ Supabase    │  │ Supabase    │  │ • pending_deletes   │     │    │
│  │   └─────────────┘  └─────────────┘  └─────────────────────┘     │    │
│  │                                                                 │    │
│  │   ┌───────────────────────────────────────────────────────┐     │    │
│  │   │ BUNDLED (never changes, always available offline)     │     │    │
│  │   │                                                       │     │    │
│  │   │ • quran.db (Quran text)                               │     │    │
│  │   │ • QPC fonts (604 files)                               │     │    │
│  │   │ • Page JSONs (604 files)                              │     │    │
│  │   └───────────────────────────────────────────────────────┘     │    │
│  │                                                                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Offline Queue Processing

```
APP COMES BACK ONLINE
═════════════════════

1. Detect connectivity restored
   │
   ▼
2. Check offline_queue table
   │
   ├─► pending_creates: [class_abc, mistake_xyz]
   │
   ▼
3. Process queue in order
   │
   ├─► POST class_abc to Supabase
   │   │
   │   ├─► Success? Remove from queue
   │   │
   │   └─► Conflict? Merge strategy
   │
   ├─► POST mistake_xyz to Supabase
   │   │
   │   └─► ...
   │
   ▼
4. Pull latest from Supabase
   │
   ▼
5. Update local cache
   │
   ▼
6. Resume real-time subscriptions
```

---

## Security Model

### Comparison: Current vs Supabase

| Aspect | Current (DIY) | Supabase |
|--------|---------------|----------|
| Password hashing | bcrypt in Python | Handled by Supabase |
| JWT generation | PyJWT in Python | Handled by Supabase |
| Token refresh | Manual implementation | Automatic |
| Authorization | Checked in each endpoint | Row Level Security |
| SQL injection | Must sanitize inputs | Parameterized queries |
| HTTPS | Must configure | Always HTTPS |

### Row Level Security: Defense in Depth

```
SCENARIO: Malicious student tries to see other students' mistakes

WITHOUT RLS (current):
┌─────────────────────────────────────────────────────────────────┐
│ App code checks: if (user.id === mistake.student_id)            │
│                                                                 │
│ But what if someone bypasses app and calls API directly?        │
│ curl -H "Authorization: Bearer xxx" /api/mistakes?student_id=999│
│                                                                 │
│ If backend has a bug, data leaks! 😱                            │
└─────────────────────────────────────────────────────────────────┘

WITH RLS (Supabase):
┌─────────────────────────────────────────────────────────────────┐
│ Database policy: students can ONLY select their own mistakes    │
│                                                                 │
│ Even if someone bypasses app and calls API directly:            │
│ curl -H "Authorization: Bearer xxx" .../mistakes?student_id=999 │
│                                                                 │
│ Database returns: [] (empty - RLS blocked it!) ✅               │
│                                                                 │
│ Security enforced at DATABASE level, not app level.             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cost Analysis

### Supabase Pricing Tiers

| Tier | Price | Database | Auth Users | Bandwidth | Realtime |
|------|-------|----------|------------|-----------|----------|
| **Free** | $0/mo | 500 MB | 50,000 MAU | 5 GB | 200 concurrent |
| Pro | $25/mo | 8 GB | 100,000 MAU | 250 GB | 500 concurrent |
| Team | $599/mo | 16 GB | Unlimited | 500 GB | Unlimited |

### QuranTrack Estimated Usage

```
ESTIMATED USAGE (Year 1):
═════════════════════════

Users:
├── Teachers: 10-50
├── Students: 50-500
└── Total MAU: ~500

Database:
├── Profiles: ~500 rows × 0.5 KB = 250 KB
├── Classes: ~5,000 rows × 1 KB = 5 MB
├── Mistakes: ~50,000 rows × 0.2 KB = 10 MB
├── Assignments: ~15,000 rows × 0.3 KB = 5 MB
└── Total: ~20 MB

Bandwidth:
├── API calls: ~100,000/month
├── Data per call: ~1 KB average
└── Total: ~100 MB/month

Realtime:
├── Concurrent connections: ~10-50
└── Messages: ~10,000/month

VERDICT: Free tier is MORE than enough
         Even at 10x growth, still free tier
```

### Cost Comparison

| Scenario | Current (Self-Hosted) | Supabase |
|----------|----------------------|----------|
| Development | $0 (localhost) | $0 (free tier) |
| 100 users | $20-50/mo (VPS) | $0 (free tier) |
| 1,000 users | $50-100/mo (VPS) | $0 (free tier) |
| 10,000 users | $100-200/mo | $25/mo (Pro) |

### Total Cost of Ownership

```
CURRENT ARCHITECTURE (if deployed to cloud):
─────────────────────────────────────────────
VPS (DigitalOcean/AWS)     $20-50/month
Domain + SSL               $10-20/year
Backup storage             $5/month
Monitoring                 $10/month
Your time (maintenance)    Priceless 😅
─────────────────────────────────────────────
Total:                     ~$40-80/month


SUPABASE ARCHITECTURE:
─────────────────────────────────────────────
Supabase                   $0/month (free tier)
Domain (optional)          $10-20/year
Your time (maintenance)    Minimal
─────────────────────────────────────────────
Total:                     ~$0-2/month
```

---

## Migration Plan

### Phase 1: Setup Supabase (1 day)

```
□ Create Supabase project
□ Create database tables (schema above)
□ Configure Row Level Security policies
□ Test auth flow in Supabase dashboard
□ Get project URL and anon key
```

### Phase 2: Update Desktop App (3-5 days)

```
□ Install @supabase/supabase-js
□ Create lib/supabase.ts with client initialization
□ Rewrite AuthContext to use Supabase Auth
□ Rewrite api.ts to use Supabase client
□ Add real-time subscriptions
□ Add local SQLite cache layer
□ Test all flows
```

### Phase 3: Update Mobile App (3-5 days)

```
□ Add supabase_flutter to pubspec.yaml
□ Initialize Supabase in main.dart
□ Rewrite api_client.dart to use Supabase
□ Update providers to use Supabase
□ Ensure offline queue works
□ Test all flows
```

### Phase 4: Data Migration (1 day)

```
□ Export existing users from app.db
□ Import to Supabase (with password reset)
□ Export existing classes/mistakes
□ Import to Supabase tables
□ Verify data integrity
```

### Phase 5: Testing & Deployment (2-3 days)

```
□ Test desktop → mobile sync
□ Test offline mode
□ Test real-time updates
□ Build Electron installer
□ Build mobile APK/IPA
□ User acceptance testing
```

---

## File Changes Summary

### Files to DELETE (Backend)

```
quran_backend/
├── main.py                 ← DELETE (API replaced by Supabase)
├── auth/
│   ├── routes.py           ← DELETE
│   ├── utils.py            ← DELETE
│   ├── models.py           ← DELETE
│   └── dependencies.py     ← DELETE
├── app.db                  ← DELETE (migrated to Supabase)
└── requirements.txt        ← DELETE
```

### Files to KEEP (Backend - for reference only)

```
quran_backend/
├── quran.db                ← KEEP (bundle with app)
├── quran-pages/            ← KEEP (bundle with app)
└── Backups/                ← DELETE (Supabase handles backups)
```

### Files to UPDATE (Frontend)

```
quran_frontend/
├── src/
│   ├── lib/
│   │   └── supabase.ts         ← NEW (Supabase client)
│   ├── api.ts                  ← REWRITE (use Supabase)
│   ├── contexts/
│   │   └── AuthContext.tsx     ← REWRITE (use Supabase Auth)
│   └── hooks/
│       └── useSync.ts          ← NEW (real-time subscriptions)
└── package.json                ← UPDATE (add @supabase/supabase-js)
```

### Files to UPDATE (Mobile)

```
quran_mobile/
├── lib/
│   ├── core/
│   │   ├── supabase/
│   │   │   └── supabase_client.dart  ← NEW
│   │   ├── network/
│   │   │   └── api_client.dart       ← REWRITE
│   │   └── sync/
│   │       └── sync_service.dart     ← REWRITE
│   └── main.dart                     ← UPDATE (init Supabase)
└── pubspec.yaml                      ← UPDATE (add supabase_flutter)
```

---

## Conclusion

The migration from FastAPI to Supabase provides:

| Benefit | Impact |
|---------|--------|
| **No server to maintain** | Simpler deployment, less ops work |
| **Real-time sync** | Better UX, instant updates |
| **Free tier** | $0/month for expected usage |
| **Multi-platform** | Same backend for desktop + mobile |
| **Built-in auth** | Delete 500+ lines of auth code |
| **Row Level Security** | Security at database level |
| **Offline support** | Works with local SQLite cache |
| **Scalability** | Grows with user base automatically |

The main trade-off is **vendor dependency** on Supabase, but this is mitigated by:
- Supabase is open-source (can self-host if needed)
- Data is in PostgreSQL (standard, portable)
- SDKs are well-documented

**Recommendation:** Proceed with migration to Supabase.
