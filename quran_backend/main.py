from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import shutil
from pathlib import Path
from datetime import date, datetime

# Import auth routers and dependencies
from auth.routes import router as auth_router, students_router, teachers_router
from auth.dependencies import get_current_user, get_current_verified_user

app = FastAPI(title="Quran Logbook API")

# Include auth routers
app.include_router(auth_router)
app.include_router(students_router)
app.include_router(teachers_router)

# CORS - allow frontend and mobile app to access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (React frontend + Flutter mobile)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Two separate databases
QURAN_DB = Path(__file__).parent / "quran.db"
APP_DB = Path(__file__).parent / "app.db"


def get_quran_db():
    conn = sqlite3.connect(QURAN_DB)
    conn.row_factory = sqlite3.Row
    return conn


def get_app_db():
    conn = sqlite3.connect(APP_DB)
    conn.row_factory = sqlite3.Row
    return conn


# Initialize app.db tables on startup
@app.on_event("startup")
def init_app_db():
    conn = get_app_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            day TEXT NOT NULL,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            device_id TEXT
        );

        CREATE TABLE IF NOT EXISTS assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('hifz', 'sabqi', 'revision')),
            start_surah INTEGER NOT NULL,
            end_surah INTEGER NOT NULL,
            start_ayah INTEGER,
            end_ayah INTEGER,
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS mistakes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            surah_number INTEGER NOT NULL,
            ayah_number INTEGER NOT NULL,
            word_index INTEGER NOT NULL,
            word_text TEXT NOT NULL,
            char_index INTEGER,
            error_count INTEGER DEFAULT 1,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            device_id TEXT,
            UNIQUE(surah_number, ayah_number, word_index, char_index)
        );

        CREATE TABLE IF NOT EXISTS mistake_occurrences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mistake_id INTEGER NOT NULL,
            class_id INTEGER NOT NULL,
            occurred_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (mistake_id) REFERENCES mistakes(id) ON DELETE CASCADE,
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_mistakes_surah ON mistakes(surah_number);
        CREATE INDEX IF NOT EXISTS idx_occurrences_mistake ON mistake_occurrences(mistake_id);
        CREATE INDEX IF NOT EXISTS idx_occurrences_class ON mistake_occurrences(class_id);
        CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);

        -- User authentication tables
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            is_verified BOOLEAN DEFAULT 0,
            verification_token TEXT,
            verification_token_expires_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_login_at TEXT
        );

        CREATE TABLE IF NOT EXISTS teacher_student_relationships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            added_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(teacher_id, student_id)
        );

        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_tsr_teacher ON teacher_student_relationships(teacher_id);
        CREATE INDEX IF NOT EXISTS idx_tsr_student ON teacher_student_relationships(student_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

        -- Class-student relationships (which students attended which class)
        CREATE TABLE IF NOT EXISTS class_students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(class_id, student_id)
        );
        CREATE INDEX IF NOT EXISTS idx_class_students_class ON class_students(class_id);
        CREATE INDEX IF NOT EXISTS idx_class_students_student ON class_students(student_id);
    """)
    conn.commit()

    # Migration: Add char_index column if it doesn't exist (for existing databases)
    try:
        conn.execute("ALTER TABLE mistakes ADD COLUMN char_index INTEGER")
        conn.commit()
    except:
        pass  # Column already exists

    # Migration: Add performance column to classes
    try:
        conn.execute("ALTER TABLE classes ADD COLUMN performance TEXT")
        conn.commit()
    except:
        pass  # Column already exists

    # Migration: Add sync columns if they don't exist
    migrations = [
        "ALTER TABLE classes ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE classes ADD COLUMN device_id TEXT",
        "ALTER TABLE mistakes ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE mistakes ADD COLUMN device_id TEXT",
        "ALTER TABLE assignments ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP",
    ]
    for migration in migrations:
        try:
            conn.execute(migration)
            conn.commit()
        except:
            pass  # Column already exists

    # Migration: Add multi-user columns to classes and mistakes
    multi_user_migrations = [
        "ALTER TABLE classes ADD COLUMN teacher_id INTEGER REFERENCES users(id)",
        "ALTER TABLE classes ADD COLUMN is_published BOOLEAN DEFAULT 0",
        "ALTER TABLE mistakes ADD COLUMN student_id INTEGER REFERENCES users(id)",
    ]
    for migration in multi_user_migrations:
        try:
            conn.execute(migration)
            conn.commit()
        except:
            pass  # Column already exists

    # Migration: Add student_id to assignments for per-student portions
    try:
        conn.execute("ALTER TABLE assignments ADD COLUMN student_id INTEGER REFERENCES users(id)")
        conn.commit()
    except:
        pass  # Column already exists

    # Migration: Add performance column to class_students for per-student performance
    try:
        conn.execute("ALTER TABLE class_students ADD COLUMN performance TEXT")
        conn.commit()
    except:
        pass  # Column already exists

    conn.close()


# ============ PYDANTIC MODELS ============

class AssignmentCreate(BaseModel):
    type: str
    start_surah: int
    end_surah: int
    start_ayah: Optional[int] = None
    end_ayah: Optional[int] = None
    student_id: Optional[int] = None  # Which student this assignment is for (None = all students)


class ClassCreate(BaseModel):
    date: str
    day: str
    notes: Optional[str] = None
    student_ids: List[int] = []  # List of student user IDs to add to the class
    assignments: list[AssignmentCreate]  # Each assignment can have a student_id for per-student portions


class MistakeCreate(BaseModel):
    student_id: Optional[int] = None  # Which student - required for teachers, optional for students (uses self)
    surah_number: int
    ayah_number: int
    word_index: int
    word_text: str
    char_index: Optional[int] = None  # Position within word for character-level mistakes
    class_id: Optional[int] = None  # Which class this mistake was made in


class ClassNotesUpdate(BaseModel):
    notes: Optional[str] = None


# ============ QURAN ENDPOINTS ============

# Directory for QPC word data (code_v1, line_number, etc.)
QURAN_PAGES_DIR = Path(__file__).parent / "quran-pages"

@app.get("/api/quran/page/{page_number}")
def get_quran_page_words(page_number: int):
    """Get word-by-word data for a specific page (1-604) with QPC glyph codes"""
    if page_number < 1 or page_number > 604:
        raise HTTPException(status_code=404, detail="Page not found (must be 1-604)")

    page_file = QURAN_PAGES_DIR / f"page_{page_number:03d}.json"
    if not page_file.exists():
        raise HTTPException(status_code=404, detail="Page data not found")

    import json
    with open(page_file, 'r', encoding='utf-8') as f:
        words = json.load(f)

    return {"data": words, "page": page_number}


@app.get("/api/surahs")
def get_all_surahs():
    """Get list of all 114 surahs"""
    conn = get_quran_db()
    cursor = conn.execute(
        "SELECT number, name, englishName, englishNameTranslation, numberOfAyahs, revelationType FROM surahs ORDER BY number"
    )
    surahs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"data": surahs}


@app.get("/api/surahs/{surah_number}")
def get_surah(surah_number: int):
    """Get a specific surah with all its ayahs"""
    if surah_number < 1 or surah_number > 114:
        raise HTTPException(status_code=404, detail="Surah not found")

    conn = get_quran_db()

    cursor = conn.execute(
        "SELECT number, name, englishName, englishNameTranslation, numberOfAyahs, revelationType FROM surahs WHERE number = ?",
        (surah_number,)
    )
    surah = cursor.fetchone()
    if not surah:
        conn.close()
        raise HTTPException(status_code=404, detail="Surah not found")

    surah_dict = dict(surah)

    cursor = conn.execute(
        "SELECT surahNumber * 1000 + ayahNumber as number, text, ayahNumber as numberInSurah FROM ayahs WHERE surahNumber = ? ORDER BY ayahNumber",
        (surah_number,)
    )
    ayahs = [dict(row) for row in cursor.fetchall()]
    conn.close()

    surah_dict["ayahs"] = ayahs
    return {"data": surah_dict}


# ============ CLASSES ENDPOINTS ============

@app.get("/api/classes")
def get_all_classes(
    role: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get classes based on user role:
    - role=teacher (or default for teachers): returns classes they created
    - role=student (or default for students): returns published classes they're part of

    Teachers can pass role=student to see classes where they are enrolled as a student.
    """
    conn = get_app_db()
    user_id = int(current_user["sub"])
    is_teacher = current_user.get("is_verified", False)

    # Determine which view to show
    # If role is explicitly set, use that; otherwise use default based on is_verified
    show_teacher_view = (role == "teacher") or (role is None and is_teacher)

    if show_teacher_view and is_teacher:
        # Teacher sees all their classes (published or not)
        cursor = conn.execute(
            "SELECT * FROM classes WHERE teacher_id = ? ORDER BY date DESC",
            (user_id,)
        )
    else:
        # Student view - sees only published classes they're part of
        cursor = conn.execute(
            """SELECT c.* FROM classes c
               JOIN class_students cs ON c.id = cs.class_id
               WHERE cs.student_id = ? AND c.is_published = 1
               ORDER BY c.date DESC""",
            (user_id,)
        )

    classes = []
    for row in cursor.fetchall():
        class_dict = dict(row)
        # Get assignments for this class
        # Teachers see all assignments with student_id
        # Students see only shared (student_id=NULL) or their own assignments
        if show_teacher_view and is_teacher:
            assign_cursor = conn.execute(
                "SELECT id, type, start_surah, end_surah, start_ayah, end_ayah, student_id FROM assignments WHERE class_id = ?",
                (class_dict["id"],)
            )
        else:
            assign_cursor = conn.execute(
                "SELECT id, type, start_surah, end_surah, start_ayah, end_ayah, student_id FROM assignments WHERE class_id = ? AND (student_id IS NULL OR student_id = ?)",
                (class_dict["id"], user_id)
            )
        class_dict["assignments"] = [dict(a) for a in assign_cursor.fetchall()]

        # For teacher view, include list of students in the class with their performance
        if show_teacher_view and is_teacher:
            students_cursor = conn.execute(
                """SELECT u.id, u.student_id, u.first_name, u.last_name, cs.performance
                   FROM users u
                   JOIN class_students cs ON u.id = cs.student_id
                   WHERE cs.class_id = ?""",
                (class_dict["id"],)
            )
            class_dict["students"] = [dict(s) for s in students_cursor.fetchall()]

        classes.append(class_dict)

    conn.close()
    return {"data": classes}


@app.get("/api/classes/{class_id}")
def get_class(class_id: int, current_user: dict = Depends(get_current_user)):
    """Get a single class with assignments (with auth check)"""
    conn = get_app_db()
    user_id = int(current_user["sub"])
    is_teacher = current_user.get("is_verified", False)

    cursor = conn.execute("SELECT * FROM classes WHERE id = ?", (class_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Class not found")

    class_dict = dict(row)

    # Check access permissions
    if is_teacher:
        # Teacher must own this class
        if class_dict.get("teacher_id") != user_id:
            conn.close()
            raise HTTPException(status_code=403, detail="Not authorized to access this class")
    else:
        # Student must be in the class AND class must be published
        cursor = conn.execute(
            "SELECT 1 FROM class_students WHERE class_id = ? AND student_id = ?",
            (class_id, user_id)
        )
        if not cursor.fetchone() or not class_dict.get("is_published"):
            conn.close()
            raise HTTPException(status_code=403, detail="Not authorized to access this class")

    # Get assignments - teachers see all, students see only their own (student_id = NULL or their ID)
    if is_teacher:
        assign_cursor = conn.execute(
            "SELECT id, type, start_surah, end_surah, start_ayah, end_ayah, student_id FROM assignments WHERE class_id = ?",
            (class_id,)
        )
    else:
        # Students see assignments with no student_id (shared) OR their specific student_id
        assign_cursor = conn.execute(
            "SELECT id, type, start_surah, end_surah, start_ayah, end_ayah, student_id FROM assignments WHERE class_id = ? AND (student_id IS NULL OR student_id = ?)",
            (class_id, user_id)
        )
    class_dict["assignments"] = [dict(a) for a in assign_cursor.fetchall()]

    # For teachers, include list of students with their performance
    if is_teacher:
        students_cursor = conn.execute(
            """SELECT u.id, u.student_id, u.first_name, u.last_name, cs.performance
               FROM users u
               JOIN class_students cs ON u.id = cs.student_id
               WHERE cs.class_id = ?""",
            (class_id,)
        )
        class_dict["students"] = [dict(s) for s in students_cursor.fetchall()]

    conn.close()
    return {"data": class_dict}


@app.post("/api/classes")
def create_class(data: ClassCreate, current_user: dict = Depends(get_current_verified_user)):
    """Create a new class with assignments (Teacher only)"""
    teacher_id = int(current_user["sub"])
    conn = get_app_db()

    # Create the class with teacher_id
    cursor = conn.execute(
        "INSERT INTO classes (date, day, notes, teacher_id, is_published) VALUES (?, ?, ?, ?, 0)",
        (data.date, data.day, data.notes, teacher_id)
    )
    class_id = cursor.lastrowid

    # Add assignments (with optional student_id for per-student portions)
    for assignment in data.assignments:
        conn.execute(
            "INSERT INTO assignments (class_id, type, start_surah, end_surah, start_ayah, end_ayah, student_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (class_id, assignment.type, assignment.start_surah, assignment.end_surah, assignment.start_ayah, assignment.end_ayah, assignment.student_id)
        )

    # Add students to the class
    for student_id in data.student_ids:
        # Verify student exists and is in teacher's roster
        cursor = conn.execute(
            "SELECT 1 FROM teacher_student_relationships WHERE teacher_id = ? AND student_id = ?",
            (teacher_id, student_id)
        )
        if cursor.fetchone():
            conn.execute(
                "INSERT OR IGNORE INTO class_students (class_id, student_id) VALUES (?, ?)",
                (class_id, student_id)
            )

    conn.commit()
    conn.close()

    return {"id": class_id, "message": "Class created"}


@app.patch("/api/classes/{class_id}/notes")
def update_class_notes(class_id: int, data: ClassNotesUpdate, current_user: dict = Depends(get_current_verified_user)):
    """Update notes for a class (Teacher only)"""
    teacher_id = int(current_user["sub"])
    conn = get_app_db()

    cursor = conn.execute("SELECT teacher_id FROM classes WHERE id = ?", (class_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Class not found")
    if row["teacher_id"] != teacher_id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized to modify this class")

    conn.execute("UPDATE classes SET notes = ? WHERE id = ?", (data.notes, class_id))
    conn.commit()
    conn.close()
    return {"message": "Notes updated", "notes": data.notes}


@app.post("/api/classes/{class_id}/assignments")
def add_class_assignments(class_id: int, assignments: list[AssignmentCreate], current_user: dict = Depends(get_current_verified_user)):
    """Add new assignments to an existing class (Teacher only)"""
    teacher_id = int(current_user["sub"])
    conn = get_app_db()

    # Verify class exists and user owns it
    cursor = conn.execute("SELECT teacher_id FROM classes WHERE id = ?", (class_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Class not found")
    if row["teacher_id"] != teacher_id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized to modify this class")

    # Add new assignments (with optional student_id for per-student portions)
    for assignment in assignments:
        conn.execute(
            "INSERT INTO assignments (class_id, type, start_surah, end_surah, start_ayah, end_ayah, student_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (class_id, assignment.type, assignment.start_surah, assignment.end_surah, assignment.start_ayah, assignment.end_ayah, assignment.student_id)
        )

    conn.commit()
    conn.close()
    return {"message": f"Added {len(assignments)} assignment(s) to class"}


@app.patch("/api/assignments/{assignment_id}")
def update_assignment(assignment_id: int, assignment: AssignmentCreate):
    """Update an existing assignment"""
    conn = get_app_db()

    # Verify assignment exists
    cursor = conn.execute("SELECT id FROM assignments WHERE id = ?", (assignment_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Update assignment
    conn.execute(
        "UPDATE assignments SET type = ?, start_surah = ?, end_surah = ?, start_ayah = ?, end_ayah = ? WHERE id = ?",
        (assignment.type, assignment.start_surah, assignment.end_surah, assignment.start_ayah, assignment.end_ayah, assignment_id)
    )

    conn.commit()
    conn.close()
    return {"message": "Assignment updated"}


@app.delete("/api/classes/{class_id}")
def delete_class(class_id: int, current_user: dict = Depends(get_current_verified_user)):
    """Delete a class and its assignments (Teacher only)"""
    teacher_id = int(current_user["sub"])
    conn = get_app_db()

    # Verify class exists and user owns it
    cursor = conn.execute("SELECT teacher_id FROM classes WHERE id = ?", (class_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Class not found")
    if row["teacher_id"] != teacher_id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized to delete this class")

    # Delete related data
    conn.execute("DELETE FROM class_students WHERE class_id = ?", (class_id,))
    conn.execute("DELETE FROM assignments WHERE class_id = ?", (class_id,))
    conn.execute("DELETE FROM classes WHERE id = ?", (class_id,))

    conn.commit()
    conn.close()
    return {"message": "Class deleted"}


class PerformanceUpdate(BaseModel):
    performance: str  # "Excellent", "Good", "Needs Work"


class PublishUpdate(BaseModel):
    is_published: bool


@app.patch("/api/classes/{class_id}/performance")
def update_class_performance(class_id: int, data: PerformanceUpdate, current_user: dict = Depends(get_current_verified_user)):
    """Update class performance rating (Teacher only)"""
    teacher_id = int(current_user["sub"])
    conn = get_app_db()

    # Verify class exists and user owns it
    cursor = conn.execute("SELECT teacher_id FROM classes WHERE id = ?", (class_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Class not found")
    if row["teacher_id"] != teacher_id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized to modify this class")

    conn.execute(
        "UPDATE classes SET performance = ? WHERE id = ?",
        (data.performance, class_id)
    )

    conn.commit()
    conn.close()
    return {"message": "Performance updated", "performance": data.performance}


class StudentPerformanceUpdate(BaseModel):
    student_id: int
    performance: str  # "Excellent", "Very Good", "Good", "Needs Work"


@app.patch("/api/classes/{class_id}/student-performance")
def update_student_performance(class_id: int, data: StudentPerformanceUpdate, current_user: dict = Depends(get_current_verified_user)):
    """Update a specific student's performance for a class (Teacher only)"""
    teacher_id = int(current_user["sub"])
    conn = get_app_db()

    # Verify class exists and user owns it
    cursor = conn.execute("SELECT teacher_id FROM classes WHERE id = ?", (class_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Class not found")
    if row["teacher_id"] != teacher_id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized to modify this class")

    # Verify student is in this class
    cursor = conn.execute(
        "SELECT id FROM class_students WHERE class_id = ? AND student_id = ?",
        (class_id, data.student_id)
    )
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Student not in this class")

    # Update the student's performance for this class
    conn.execute(
        "UPDATE class_students SET performance = ? WHERE class_id = ? AND student_id = ?",
        (data.performance, class_id, data.student_id)
    )

    conn.commit()
    conn.close()
    return {"message": "Student performance updated", "performance": data.performance}


@app.patch("/api/classes/{class_id}/publish")
def update_class_publish(class_id: int, data: PublishUpdate, current_user: dict = Depends(get_current_verified_user)):
    """Toggle class visibility for students (Teacher only)"""
    teacher_id = int(current_user["sub"])
    conn = get_app_db()

    # Verify class exists and user owns it
    cursor = conn.execute("SELECT teacher_id FROM classes WHERE id = ?", (class_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Class not found")
    if row["teacher_id"] != teacher_id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized to modify this class")

    conn.execute(
        "UPDATE classes SET is_published = ? WHERE id = ?",
        (1 if data.is_published else 0, class_id)
    )

    conn.commit()
    conn.close()
    return {"message": "Class visibility updated", "is_published": data.is_published}


@app.post("/api/classes/{class_id}/students")
def add_students_to_class(class_id: int, student_ids: List[int], current_user: dict = Depends(get_current_verified_user)):
    """Add students to an existing class (Teacher only)"""
    teacher_id = int(current_user["sub"])
    conn = get_app_db()

    # Verify class exists and user owns it
    cursor = conn.execute("SELECT teacher_id FROM classes WHERE id = ?", (class_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Class not found")
    if row["teacher_id"] != teacher_id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized to modify this class")

    added = 0
    for student_id in student_ids:
        # Verify student is in teacher's roster
        cursor = conn.execute(
            "SELECT 1 FROM teacher_student_relationships WHERE teacher_id = ? AND student_id = ?",
            (teacher_id, student_id)
        )
        if cursor.fetchone():
            try:
                conn.execute(
                    "INSERT INTO class_students (class_id, student_id) VALUES (?, ?)",
                    (class_id, student_id)
                )
                added += 1
            except:
                pass  # Already in class

    conn.commit()
    conn.close()
    return {"message": f"Added {added} student(s) to class"}


@app.delete("/api/classes/{class_id}/students/{student_id}")
def remove_student_from_class(class_id: int, student_id: int, current_user: dict = Depends(get_current_verified_user)):
    """Remove a student from a class (Teacher only)"""
    teacher_id = int(current_user["sub"])
    conn = get_app_db()

    # Verify class exists and user owns it
    cursor = conn.execute("SELECT teacher_id FROM classes WHERE id = ?", (class_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Class not found")
    if row["teacher_id"] != teacher_id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized to modify this class")

    cursor = conn.execute(
        "DELETE FROM class_students WHERE class_id = ? AND student_id = ?",
        (class_id, student_id)
    )

    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Student not in this class")

    conn.commit()
    conn.close()
    return {"message": "Student removed from class"}


# ============ MISTAKES ENDPOINTS ============

@app.get("/api/mistakes")
def get_all_mistakes(
    surah: Optional[int] = None,
    student_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get mistakes filtered by user role:
    - Teacher: can view any student's mistakes (pass student_id)
    - Student: can only view own mistakes
    """
    conn = get_app_db()
    user_id = int(current_user["sub"])
    is_teacher = current_user.get("is_verified", False)

    # Determine which student's mistakes to fetch
    if is_teacher:
        # Teacher can view any of their students' mistakes
        target_student_id = student_id  # If None, might want to show all? For now require student_id
        if target_student_id:
            # Verify this student is in teacher's roster
            cursor = conn.execute(
                "SELECT 1 FROM teacher_student_relationships WHERE teacher_id = ? AND student_id = ?",
                (user_id, target_student_id)
            )
            if not cursor.fetchone():
                conn.close()
                raise HTTPException(status_code=403, detail="Student not in your roster")
    else:
        # Student can only see own mistakes
        target_student_id = user_id

    # Build query
    if target_student_id:
        if surah:
            cursor = conn.execute(
                "SELECT * FROM mistakes WHERE student_id = ? AND surah_number = ? ORDER BY ayah_number, word_index",
                (target_student_id, surah)
            )
        else:
            cursor = conn.execute(
                "SELECT * FROM mistakes WHERE student_id = ? ORDER BY surah_number, ayah_number, word_index",
                (target_student_id,)
            )
    else:
        # Teacher didn't specify student - return empty for now
        conn.close()
        return {"data": []}

    mistakes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"data": mistakes}


@app.get("/api/mistakes/with-occurrences")
def get_mistakes_with_occurrences(
    surah: Optional[int] = None,
    student_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get mistakes with class occurrence info, filtered by user role"""
    conn = get_app_db()
    user_id = int(current_user["sub"])
    is_teacher = current_user.get("is_verified", False)

    # Determine which student's mistakes to fetch
    if is_teacher:
        target_student_id = student_id
        if target_student_id:
            cursor = conn.execute(
                "SELECT 1 FROM teacher_student_relationships WHERE teacher_id = ? AND student_id = ?",
                (user_id, target_student_id)
            )
            if not cursor.fetchone():
                conn.close()
                raise HTTPException(status_code=403, detail="Student not in your roster")
    else:
        target_student_id = user_id

    if not target_student_id:
        conn.close()
        return {"data": []}

    # Get mistakes
    if surah:
        cursor = conn.execute(
            "SELECT * FROM mistakes WHERE student_id = ? AND surah_number = ? ORDER BY ayah_number, word_index",
            (target_student_id, surah)
        )
    else:
        cursor = conn.execute(
            "SELECT * FROM mistakes WHERE student_id = ? ORDER BY surah_number, ayah_number, word_index",
            (target_student_id,)
        )

    mistakes = [dict(row) for row in cursor.fetchall()]

    # For each mistake, get its occurrences with class info
    for mistake in mistakes:
        cursor = conn.execute(
            """
            SELECT mo.class_id, mo.occurred_at, c.date, c.day
            FROM mistake_occurrences mo
            JOIN classes c ON mo.class_id = c.id
            WHERE mo.mistake_id = ?
            ORDER BY c.date DESC
            """,
            (mistake["id"],)
        )
        mistake["occurrences"] = [
            {"class_id": row[0], "occurred_at": row[1], "class_date": row[2], "class_day": row[3]}
            for row in cursor.fetchall()
        ]

    conn.close()
    return {"data": mistakes}


@app.post("/api/mistakes")
def add_or_increment_mistake(data: MistakeCreate, current_user: dict = Depends(get_current_user)):
    """Add a new mistake or increment existing one.
    - Teachers must specify student_id (student in their roster)
    - Students can omit student_id (defaults to themselves)
    """
    user_id = int(current_user["sub"])
    is_teacher = current_user.get("is_verified", False)
    conn = get_app_db()

    # Determine which student this mistake is for
    if data.student_id:
        student_id = data.student_id
        if is_teacher:
            # Teacher specifying student - verify in roster
            cursor = conn.execute(
                "SELECT 1 FROM teacher_student_relationships WHERE teacher_id = ? AND student_id = ?",
                (user_id, student_id)
            )
            if not cursor.fetchone():
                conn.close()
                raise HTTPException(status_code=403, detail="Student not in your roster")
        else:
            # Student can only mark mistakes for themselves
            if student_id != user_id:
                conn.close()
                raise HTTPException(status_code=403, detail="You can only mark your own mistakes")
    else:
        # No student_id provided
        if is_teacher:
            conn.close()
            raise HTTPException(status_code=400, detail="Teachers must specify student_id")
        else:
            # Student marking their own mistake
            student_id = user_id

    # Check if mistake exists for this student (include student_id and char_index in check)
    if data.char_index is not None:
        cursor = conn.execute(
            "SELECT id, error_count FROM mistakes WHERE student_id = ? AND surah_number = ? AND ayah_number = ? AND word_index = ? AND char_index = ?",
            (student_id, data.surah_number, data.ayah_number, data.word_index, data.char_index)
        )
    else:
        cursor = conn.execute(
            "SELECT id, error_count FROM mistakes WHERE student_id = ? AND surah_number = ? AND ayah_number = ? AND word_index = ? AND char_index IS NULL",
            (student_id, data.surah_number, data.ayah_number, data.word_index)
        )
    existing = cursor.fetchone()

    if existing:
        # Mistake exists - increment count
        mistake_id = existing["id"]
        conn.execute(
            "UPDATE mistakes SET error_count = error_count + 1 WHERE id = ?",
            (mistake_id,)
        )
        new_count = existing["error_count"] + 1
    else:
        # Create new mistake with student_id
        cursor = conn.execute(
            "INSERT INTO mistakes (student_id, surah_number, ayah_number, word_index, word_text, char_index, error_count) VALUES (?, ?, ?, ?, ?, ?, 1)",
            (student_id, data.surah_number, data.ayah_number, data.word_index, data.word_text, data.char_index)
        )
        mistake_id = cursor.lastrowid
        new_count = 1

    # Record this occurrence (only if class_id is provided)
    if data.class_id:
        conn.execute(
            "INSERT INTO mistake_occurrences (mistake_id, class_id) VALUES (?, ?)",
            (mistake_id, data.class_id)
        )

    conn.commit()
    conn.close()
    return {"id": mistake_id, "error_count": new_count, "char_index": data.char_index, "class_id": data.class_id, "student_id": data.student_id}


@app.delete("/api/mistakes/{mistake_id}")
def decrement_or_delete_mistake(mistake_id: int, current_user: dict = Depends(get_current_user)):
    """Decrement mistake count or delete if count reaches 0.
    - Teachers can delete mistakes for students in their roster
    - Students can delete their own mistakes
    """
    user_id = int(current_user["sub"])
    is_teacher = current_user.get("is_verified", False)
    conn = get_app_db()

    cursor = conn.execute("SELECT error_count, student_id FROM mistakes WHERE id = ?", (mistake_id,))
    existing = cursor.fetchone()

    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Mistake not found")

    # Verify access
    if is_teacher:
        # Teacher must have this student in their roster
        cursor = conn.execute(
            "SELECT 1 FROM teacher_student_relationships WHERE teacher_id = ? AND student_id = ?",
            (user_id, existing["student_id"])
        )
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=403, detail="Not authorized to modify this mistake")
    else:
        # Student can only delete their own mistakes
        if existing["student_id"] != user_id:
            conn.close()
            raise HTTPException(status_code=403, detail="You can only delete your own mistakes")

    # Delete the most recent occurrence
    conn.execute(
        "DELETE FROM mistake_occurrences WHERE id = (SELECT id FROM mistake_occurrences WHERE mistake_id = ? ORDER BY occurred_at DESC LIMIT 1)",
        (mistake_id,)
    )

    if existing["error_count"] <= 1:
        # Delete the mistake entirely (CASCADE will delete remaining occurrences if any)
        conn.execute("DELETE FROM mistakes WHERE id = ?", (mistake_id,))
        message = "Mistake deleted"
        new_count = 0
    else:
        # Decrement the count
        conn.execute("UPDATE mistakes SET error_count = error_count - 1 WHERE id = ?", (mistake_id,))
        message = "Mistake decremented"
        new_count = existing["error_count"] - 1

    conn.commit()
    conn.close()
    return {"message": message, "error_count": new_count}


# ============ STATS ENDPOINT ============

@app.get("/api/stats")
def get_stats(
    role: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get dashboard statistics for the current user.
    - role=student: stats as a student (classes attended, own mistakes)
    - role=teacher: stats as a teacher (classes created, students' mistakes)
    Default is based on is_verified flag.
    """
    conn = get_app_db()
    user_id = int(current_user["sub"])
    is_teacher = current_user.get("is_verified", False)

    # Determine which view
    show_student_view = (role == "student") or (role is None and not is_teacher)

    if show_student_view:
        # STUDENT STATS - show only the user's own data as a student

        # Total classes attended (where user is enrolled as student)
        cursor = conn.execute("""
            SELECT COUNT(*) as count FROM classes c
            JOIN class_students cs ON c.id = cs.class_id
            WHERE cs.student_id = ? AND c.is_published = 1
        """, (user_id,))
        total_classes = cursor.fetchone()["count"]

        # User's own mistakes
        cursor = conn.execute("SELECT COUNT(*) as count FROM mistakes WHERE student_id = ?", (user_id,))
        total_unique_mistakes = cursor.fetchone()["count"]

        # User's repeated mistakes
        cursor = conn.execute("SELECT COUNT(*) as count FROM mistakes WHERE student_id = ? AND error_count > 1", (user_id,))
        repeated_mistakes = cursor.fetchone()["count"]

        # User's total occurrences
        cursor = conn.execute("""
            SELECT COUNT(*) as count FROM mistake_occurrences mo
            JOIN mistakes m ON mo.mistake_id = m.id
            WHERE m.student_id = ?
        """, (user_id,))
        total_occurrences = cursor.fetchone()["count"]

        # User's mistakes by surah
        cursor = conn.execute("""
            SELECT surah_number, SUM(error_count) as count
            FROM mistakes
            WHERE student_id = ?
            GROUP BY surah_number
            ORDER BY count DESC
            LIMIT 5
        """, (user_id,))
        mistakes_by_surah = [dict(row) for row in cursor.fetchall()]

        # User's latest class (as student)
        cursor = conn.execute("""
            SELECT c.* FROM classes c
            JOIN class_students cs ON c.id = cs.class_id
            WHERE cs.student_id = ? AND c.is_published = 1
            ORDER BY c.date DESC LIMIT 1
        """, (user_id,))
        latest_class = cursor.fetchone()

        # User's top repeated mistakes
        cursor = conn.execute("""
            SELECT id, surah_number, ayah_number, word_text, error_count
            FROM mistakes
            WHERE student_id = ? AND error_count > 1
            ORDER BY error_count DESC
            LIMIT 6
        """, (user_id,))
        top_repeated_mistakes = [dict(row) for row in cursor.fetchall()]

    else:
        # TEACHER STATS - This could show aggregate stats for all students
        # For now, just return the teacher's own teaching stats

        # Total classes created
        cursor = conn.execute("SELECT COUNT(*) as count FROM classes WHERE teacher_id = ?", (user_id,))
        total_classes = cursor.fetchone()["count"]

        # Total unique mistakes across all students in teacher's roster
        cursor = conn.execute("""
            SELECT COUNT(*) as count FROM mistakes m
            WHERE m.student_id IN (
                SELECT student_id FROM teacher_student_relationships WHERE teacher_id = ?
            )
        """, (user_id,))
        total_unique_mistakes = cursor.fetchone()["count"]

        # Repeated mistakes across all students
        cursor = conn.execute("""
            SELECT COUNT(*) as count FROM mistakes m
            WHERE m.student_id IN (
                SELECT student_id FROM teacher_student_relationships WHERE teacher_id = ?
            ) AND m.error_count > 1
        """, (user_id,))
        repeated_mistakes = cursor.fetchone()["count"]

        # Total occurrences
        cursor = conn.execute("""
            SELECT COUNT(*) as count FROM mistake_occurrences mo
            JOIN mistakes m ON mo.mistake_id = m.id
            WHERE m.student_id IN (
                SELECT student_id FROM teacher_student_relationships WHERE teacher_id = ?
            )
        """, (user_id,))
        total_occurrences = cursor.fetchone()["count"]

        # Mistakes by surah across all students
        cursor = conn.execute("""
            SELECT surah_number, SUM(error_count) as count
            FROM mistakes
            WHERE student_id IN (
                SELECT student_id FROM teacher_student_relationships WHERE teacher_id = ?
            )
            GROUP BY surah_number
            ORDER BY count DESC
            LIMIT 5
        """, (user_id,))
        mistakes_by_surah = [dict(row) for row in cursor.fetchall()]

        # Latest class created
        cursor = conn.execute("SELECT * FROM classes WHERE teacher_id = ? ORDER BY date DESC LIMIT 1", (user_id,))
        latest_class = cursor.fetchone()

        # Top repeated mistakes across all students
        cursor = conn.execute("""
            SELECT id, surah_number, ayah_number, word_text, error_count
            FROM mistakes
            WHERE student_id IN (
                SELECT student_id FROM teacher_student_relationships WHERE teacher_id = ?
            ) AND error_count > 1
            ORDER BY error_count DESC
            LIMIT 6
        """, (user_id,))
        top_repeated_mistakes = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return {
        "total_classes": total_classes,
        "total_unique_mistakes": total_unique_mistakes,
        "repeated_mistakes": repeated_mistakes,
        "total_occurrences": total_occurrences,
        "mistakes_by_surah": mistakes_by_surah,
        "latest_class": dict(latest_class) if latest_class else None,
        "top_repeated_mistakes": top_repeated_mistakes
    }


# ============ SYNC ENDPOINTS ============

class SyncPullRequest(BaseModel):
    last_sync_at: Optional[str] = None


class SyncPushClass(BaseModel):
    local_id: Optional[int] = None
    server_id: Optional[int] = None
    date: str
    day: str
    notes: Optional[str] = None
    device_id: Optional[str] = None
    updated_at: Optional[str] = None
    is_deleted: bool = False
    assignments: list[AssignmentCreate] = []


class SyncPushMistake(BaseModel):
    local_id: Optional[int] = None
    server_id: Optional[int] = None
    surah_number: int
    ayah_number: int
    word_index: int
    word_text: str
    char_index: Optional[int] = None
    error_count: int = 1
    device_id: Optional[str] = None
    updated_at: Optional[str] = None
    is_deleted: bool = False


class SyncPushPayload(BaseModel):
    device_id: Optional[str] = None
    classes: list[SyncPushClass] = []
    mistakes: list[SyncPushMistake] = []


@app.post("/api/sync/pull")
def sync_pull(request: SyncPullRequest):
    """Pull all changes from server since last_sync_at"""
    conn = get_app_db()

    # Get all classes (simple sync - returns everything)
    cursor = conn.execute(
        "SELECT id, date, day, notes, created_at FROM classes ORDER BY id"
    )
    classes = []
    for row in cursor.fetchall():
        class_dict = dict(row)
        class_dict["updated_at"] = class_dict.get("created_at")  # Use created_at as fallback
        class_dict["device_id"] = None
        # Get assignments for this class
        assign_cursor = conn.execute(
            "SELECT id, type, start_surah, end_surah, start_ayah, end_ayah FROM assignments WHERE class_id = ?",
            (class_dict["id"],)
        )
        class_dict["assignments"] = [dict(a) for a in assign_cursor.fetchall()]
        classes.append(class_dict)

    # Get all mistakes
    cursor = conn.execute(
        "SELECT id, surah_number, ayah_number, word_index, word_text, char_index, error_count FROM mistakes ORDER BY id"
    )
    mistakes = []
    for row in cursor.fetchall():
        m = dict(row)
        m["updated_at"] = None
        m["device_id"] = None
        mistakes.append(m)

    conn.close()

    # Get current server time for next sync
    server_time = datetime.now().isoformat()

    return {
        "classes": classes,
        "mistakes": mistakes,
        "server_time": server_time
    }


@app.post("/api/sync/push")
def sync_push(payload: SyncPushPayload):
    """Push local changes to server - simplified without sync columns"""
    conn = get_app_db()

    class_id_mapping = {}  # local_id -> server_id
    mistake_id_mapping = {}  # local_id -> server_id

    # Process classes
    for cls in payload.classes:
        if cls.is_deleted:
            if cls.server_id:
                conn.execute("DELETE FROM assignments WHERE class_id = ?", (cls.server_id,))
                conn.execute("DELETE FROM classes WHERE id = ?", (cls.server_id,))
        elif cls.server_id:
            # Update existing class
            conn.execute(
                "UPDATE classes SET date = ?, day = ?, notes = ? WHERE id = ?",
                (cls.date, cls.day, cls.notes, cls.server_id)
            )
            # Delete and recreate assignments
            conn.execute("DELETE FROM assignments WHERE class_id = ?", (cls.server_id,))
            for assignment in cls.assignments:
                conn.execute(
                    "INSERT INTO assignments (class_id, type, start_surah, end_surah, start_ayah, end_ayah) VALUES (?, ?, ?, ?, ?, ?)",
                    (cls.server_id, assignment.type, assignment.start_surah, assignment.end_surah, assignment.start_ayah, assignment.end_ayah)
                )
            if cls.local_id:
                class_id_mapping[cls.local_id] = cls.server_id
        else:
            # Only create new class if it has assignments (skip empty classes)
            if not cls.assignments:
                continue

            # Check if class with same date already exists (prevent duplicates)
            existing = conn.execute(
                "SELECT id FROM classes WHERE date = ? AND day = ?",
                (cls.date, cls.day)
            ).fetchone()
            if existing:
                # Link to existing class instead of creating duplicate
                if cls.local_id:
                    class_id_mapping[cls.local_id] = existing["id"]
                continue

            # Create new class
            cursor = conn.execute(
                "INSERT INTO classes (date, day, notes) VALUES (?, ?, ?)",
                (cls.date, cls.day, cls.notes)
            )
            new_id = cursor.lastrowid
            if cls.local_id:
                class_id_mapping[cls.local_id] = new_id
            # Create assignments
            for assignment in cls.assignments:
                conn.execute(
                    "INSERT INTO assignments (class_id, type, start_surah, end_surah, start_ayah, end_ayah) VALUES (?, ?, ?, ?, ?, ?)",
                    (new_id, assignment.type, assignment.start_surah, assignment.end_surah, assignment.start_ayah, assignment.end_ayah)
                )

    # Process mistakes
    for mistake in payload.mistakes:
        if mistake.is_deleted:
            if mistake.server_id:
                conn.execute("DELETE FROM mistake_occurrences WHERE mistake_id = ?", (mistake.server_id,))
                conn.execute("DELETE FROM mistakes WHERE id = ?", (mistake.server_id,))
        elif mistake.server_id:
            # Update existing mistake
            cursor = conn.execute("SELECT id, error_count FROM mistakes WHERE id = ?", (mistake.server_id,))
            existing = cursor.fetchone()
            if existing:
                new_count = max(existing["error_count"], mistake.error_count)
                conn.execute("UPDATE mistakes SET error_count = ? WHERE id = ?", (new_count, mistake.server_id))
            if mistake.local_id:
                mistake_id_mapping[mistake.local_id] = mistake.server_id
        else:
            # Check if mistake already exists by location
            if mistake.char_index is not None:
                cursor = conn.execute(
                    "SELECT id, error_count FROM mistakes WHERE surah_number = ? AND ayah_number = ? AND word_index = ? AND char_index = ?",
                    (mistake.surah_number, mistake.ayah_number, mistake.word_index, mistake.char_index)
                )
            else:
                cursor = conn.execute(
                    "SELECT id, error_count FROM mistakes WHERE surah_number = ? AND ayah_number = ? AND word_index = ? AND char_index IS NULL",
                    (mistake.surah_number, mistake.ayah_number, mistake.word_index)
                )
            existing = cursor.fetchone()

            if existing:
                new_count = existing["error_count"] + mistake.error_count
                conn.execute("UPDATE mistakes SET error_count = ? WHERE id = ?", (new_count, existing["id"]))
                if mistake.local_id:
                    mistake_id_mapping[mistake.local_id] = existing["id"]
            else:
                cursor = conn.execute(
                    "INSERT INTO mistakes (surah_number, ayah_number, word_index, word_text, char_index, error_count) VALUES (?, ?, ?, ?, ?, ?)",
                    (mistake.surah_number, mistake.ayah_number, mistake.word_index, mistake.word_text, mistake.char_index, mistake.error_count)
                )
                if mistake.local_id:
                    mistake_id_mapping[mistake.local_id] = cursor.lastrowid

    conn.commit()
    conn.close()

    server_time = datetime.now().isoformat()
    return {
        "class_id_mapping": class_id_mapping,
        "mistake_id_mapping": mistake_id_mapping,
        "server_time": server_time
    }


# ============ ADMIN ENDPOINTS ============

@app.delete("/api/admin/clear-data")
def clear_all_data():
    """Clear all classes, mistakes, and related data (for fresh start)"""
    conn = get_app_db()

    # Clear in correct order due to foreign keys
    conn.execute("DELETE FROM mistake_occurrences")
    conn.execute("DELETE FROM mistakes")
    conn.execute("DELETE FROM assignments")
    conn.execute("DELETE FROM classes")
    conn.execute("DELETE FROM refresh_tokens")
    conn.execute("DELETE FROM teacher_student_relationships")
    conn.execute("DELETE FROM users")

    conn.commit()
    conn.close()

    return {"message": "All data cleared successfully (including users)"}


# ============ HEALTH CHECK ============

@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    quran_conn = get_quran_db()
    cursor = quran_conn.execute("SELECT COUNT(*) as count FROM surahs")
    surah_count = cursor.fetchone()["count"]
    cursor = quran_conn.execute("SELECT COUNT(*) as count FROM ayahs")
    ayah_count = cursor.fetchone()["count"]
    quran_conn.close()

    app_conn = get_app_db()
    cursor = app_conn.execute("SELECT COUNT(*) as count FROM classes")
    class_count = cursor.fetchone()["count"]
    cursor = app_conn.execute("SELECT COUNT(*) as count FROM mistakes")
    mistake_count = cursor.fetchone()["count"]
    app_conn.close()

    return {
        "status": "healthy",
        "quran_db": {"surahs": surah_count, "ayahs": ayah_count},
        "app_db": {"classes": class_count, "mistakes": mistake_count}
    }


# ============ BACKUP/RESTORE ============

BACKUP_DIR = Path(__file__).parent / "Backups"


@app.post("/api/backup/create")
def create_backup():
    """Create a backup of app.db in the Backups folder"""
    if not APP_DB.exists():
        raise HTTPException(status_code=404, detail="Database not found")

    # Create Backups directory if it doesn't exist
    BACKUP_DIR.mkdir(exist_ok=True)

    # Create a timestamped filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"quran_logbook_backup_{timestamp}.db"
    backup_path = BACKUP_DIR / filename

    # Copy the database file
    shutil.copy2(APP_DB, backup_path)

    return {
        "message": "Backup created successfully",
        "filename": filename,
        "path": str(backup_path),
        "size": backup_path.stat().st_size
    }


class RestoreRequest(BaseModel):
    filename: str


@app.post("/api/backup/restore")
def restore_backup(request: RestoreRequest):
    """Restore app.db from a backup file in the Backups folder"""
    backup_file = BACKUP_DIR / request.filename

    if not backup_file.exists():
        raise HTTPException(status_code=404, detail="Backup file not found")

    # Create backups directory if it doesn't exist
    BACKUP_DIR.mkdir(exist_ok=True)

    # Backup current database before restore
    if APP_DB.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = BACKUP_DIR / f"pre_restore_backup_{timestamp}.db"
        shutil.copy2(APP_DB, backup_path)

    # Restore from the selected backup
    try:
        shutil.copy2(backup_file, APP_DB)

        # Verify the restored database is valid
        conn = get_app_db()
        conn.execute("SELECT COUNT(*) FROM classes")
        conn.close()

        return {"message": "Database restored successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to restore database: {str(e)}")


@app.get("/api/backup/list")
def list_backups():
    """List all available backups"""
    BACKUP_DIR.mkdir(exist_ok=True)
    backups = []
    for f in BACKUP_DIR.glob("*.db"):
        backups.append({
            "filename": f.name,
            "size": f.stat().st_size,
            "created": datetime.fromtimestamp(f.stat().st_mtime).isoformat()
        })
    return {"backups": sorted(backups, key=lambda x: x["created"], reverse=True)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
