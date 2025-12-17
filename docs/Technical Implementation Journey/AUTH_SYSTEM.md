# QuranTrack Authentication System

## Overview

QuranTrack uses role-based signup. Users choose their role (Teacher or Student) at registration. Teachers are verified immediately; Students can upgrade later (paid feature).

## User Roles

| Role | Status | Requirements | Capabilities |
|------|--------|--------------|--------------|
| Student | Verified Student | Email + Password | View own progress, practice mode, see assigned teachers |
| Teacher | Verified Teacher | Email + Password + Role selection | Manage students, create classes, rate performance, role switcher |

### Student ID

Every user receives a unique TeamViewer-style ID on signup:
- Format: `STU-XXXXXX` (e.g., `STU-7X2K4M`)
- Characters: Uppercase letters and numbers (excluding confusing chars: 0, O, I, l, 1)
- Used for teachers to add students to their roster
- Clickable to copy in UI (profile dropdown + dashboard)

## Authentication Flow

### Signup
1. User provides: first_name, last_name, email, username, password, **role** (teacher/student)
2. System generates unique Student ID
3. If role = teacher: `is_verified = true`
4. If role = student: `is_verified = false`
5. Returns JWT access token + refresh token

### Login
1. User provides: identifier (email or username) + password
2. System validates credentials
3. Returns JWT access token + refresh token

### Token Refresh
1. Client sends refresh token
2. System validates and rotates refresh token
3. Returns new access token + new refresh token

### Upgrade to Teacher (Future - Paid)
- Students see "Upgrade to Teacher" with "Pro" badge in profile dropdown
- Not yet implemented - placeholder for future payment integration

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account (with role) |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh tokens |
| POST | `/api/auth/logout` | Invalidate refresh token |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/me` | Update profile |

### Student Management (Teacher only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students/lookup/{student_id}` | Find student by ID |
| POST | `/api/students/add` | Add student to roster |
| GET | `/api/students` | List my students |
| DELETE | `/api/students/{student_id}` | Remove student |

### Teacher Lookup (for students)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teachers` | List teachers who added me |

### Classes (Authenticated)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/classes` | Any user | Teachers: their classes; Students: published classes they're in |
| GET | `/api/classes/{id}` | Any user | Get class (with auth check) |
| POST | `/api/classes` | Teacher | Create class with student_ids |
| DELETE | `/api/classes/{id}` | Teacher | Delete class (owner only) |
| PATCH | `/api/classes/{id}/notes` | Teacher | Update notes (owner only) |
| PATCH | `/api/classes/{id}/performance` | Teacher | Update rating (owner only) |
| PATCH | `/api/classes/{id}/publish` | Teacher | Toggle visibility for students |
| POST | `/api/classes/{id}/students` | Teacher | Add students to class |
| DELETE | `/api/classes/{id}/students/{student_id}` | Teacher | Remove student from class |
| POST | `/api/classes/{id}/assignments` | Teacher | Add assignments (owner only) |

### Mistakes (Authenticated)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/mistakes` | Any user | Teachers: filter by ?student_id; Students: own mistakes |
| GET | `/api/mistakes/with-occurrences` | Any user | Same as above with occurrence data |
| POST | `/api/mistakes` | Teacher | Record mistake for a student (requires student_id) |
| DELETE | `/api/mistakes/{id}` | Teacher | Remove mistake (for their students only) |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| DELETE | `/api/admin/clear-data` | Clear all data (classes, mistakes, users) |

## JWT Token Structure

### Access Token (30 min expiry)
```json
{
  "sub": "user_id",
  "student_id": "STU-7X2K4M",
  "username": "ahmed_hassan",
  "email": "ahmed@example.com",
  "first_name": "Ahmed",
  "last_name": "Hassan",
  "is_verified": true,
  "type": "access",
  "exp": 1702427400
}
```

### Refresh Token (7 days expiry)
```json
{
  "sub": "user_id",
  "jti": "unique_token_id",
  "type": "refresh",
  "exp": 1704844800
}
```

## Security

- Passwords hashed with bcrypt (12 rounds)
- Refresh tokens stored as SHA-256 hashes
- Token rotation on refresh (old token invalidated)
- JWT signed with HS256 algorithm

## Database Tables

### users
- id, student_id, username, email, password_hash
- first_name, last_name
- is_verified (true = Teacher, false = Student)
- verification_token, verification_token_expires_at (for future use)
- created_at, updated_at, last_login_at

### teacher_student_relationships
- id, teacher_id, student_id, added_at

### refresh_tokens
- id, user_id, token_hash, expires_at, created_at

### classes (multi-user fields)
- teacher_id (foreign key to users) - class owner
- is_published (boolean, default false) - visibility to students

### class_students (junction table)
- id, class_id, student_id
- Links multiple students to each class (group halaqah support)
- UNIQUE(class_id, student_id)

### mistakes (multi-user field)
- student_id (foreign key to users) - which student made this mistake

## Frontend Integration

### AuthContext
Provides: user, isAuthenticated, isVerified, login, signup, logout, refreshUser

### Protected Routes
- All authenticated routes wrapped with `ProtectedRoute`
- Teacher-only routes check `isVerified`

### Token Storage
- Access token: localStorage
- Refresh token: localStorage
- Auto-refresh on 401 response

### UI Features
- Role switcher in navbar (only for verified teachers)
- Profile dropdown shows "Verified Teacher" or "Verified Student"
- Student ID clickable to copy (profile dropdown + student dashboard)
- "Upgrade to Teacher" with Pro badge (students only, not yet functional)

---

## Related Documentation

- **[TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md)** - Full technical overview of the project
- **[CLASSES_AND_MISTAKES.md](./CLASSES_AND_MISTAKES.md)** - Classes, assignments, mistake tracking system
- **[PROJECT_CHANGELOG.md](../PROJECT_CHANGELOG.md)** - Chronological development history (main reference)

---

## Utility Scripts

### Clear All Mistakes (Testing)
```bash
cd quran_backend
python clear_mistakes.py
```
Removes all mistakes and mistake_occurrences while preserving users, classes, and assignments.

### Create Test Users
```bash
cd quran_backend
python create_test_users.py
```
Creates demo teacher and student accounts for testing.

---

*Last Updated: December 17, 2025*
