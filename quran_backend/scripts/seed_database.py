#!/usr/bin/env python3
"""
Database Seeding Script for QuranTrack

Populates the database with realistic test data spanning December 1, 2025 to December 31, 2026.
Creates classes, assignments, mistakes, and teacher-student relationships.

Usage:
    cd quran_backend
    python seed_database.py
"""

import sqlite3
import json
import os
import random
from datetime import date, timedelta, datetime

# =============================================================================
# CONFIGURATION
# =============================================================================

START_DATE = date(2025, 12, 1)
END_DATE = date(2026, 12, 31)

# Teacher-Student assignments with class days
TEACHER_CONFIG = {
    19: {  # Hamza Feroze
        "name": "Hamza Feroze",
        "days": ["Saturday", "Wednesday"],
        "students": [20],  # Hamza Reyal
        "group_pattern": "individual"
    },
    31: {  # Abdullah Qureshi
        "name": "Abdullah Qureshi",
        "days": ["Monday", "Thursday"],
        "students": [21, 22, 23],  # Ahmed, Yusuf, Omar
        "group_pattern": "mix"  # 40% all together, 40% pairs, 20% individual
    },
    32: {  # Tariq Jameel
        "name": "Tariq Jameel",
        "days": ["Tuesday", "Saturday"],
        "students": [24, 25],  # Ibrahim, Bilal
        "group_pattern": "mix"
    },
    33: {  # Usman Farooq
        "name": "Usman Farooq",
        "days": ["Sunday", "Wednesday"],
        "students": [26, 27],  # Khalid, Zayd
        "group_pattern": "mix"
    },
    34: {  # Maryam Siddiqui
        "name": "Maryam Siddiqui",
        "days": ["Monday", "Friday"],
        "students": [28, 29],  # Mustafa, Fatima
        "group_pattern": "mix"
    },
    35: {  # Khadijah Noor
        "name": "Khadijah Noor",
        "days": ["Tuesday", "Thursday"],
        "students": [30],  # Aisha
        "group_pattern": "individual"
    }
}

# Student starting points (surah number and page)
# direction: "backwards" = memorizing from end towards beginning (114->1)
#            "forwards" = memorizing from beginning towards end (1->114)
STUDENT_START = {
    20: {"surah": 114, "start_page": 604, "direction": "backwards", "name": "Hamza Reyal"},
    21: {"surah": 114, "start_page": 604, "direction": "backwards", "name": "Ahmed Khan"},
    22: {"surah": 78, "start_page": 582, "direction": "backwards", "name": "Yusuf Ali"},
    23: {"surah": 67, "start_page": 562, "direction": "backwards", "name": "Omar Hassan"},
    24: {"surah": 55, "start_page": 531, "direction": "backwards", "name": "Ibrahim Mohammed"},
    25: {"surah": 36, "start_page": 440, "direction": "backwards", "name": "Bilal Ahmad"},
    26: {"surah": 2, "start_page": 2, "direction": "forwards", "name": "Khalid Rahman"},
    27: {"surah": 3, "start_page": 50, "direction": "forwards", "name": "Zayd Malik"},
    28: {"surah": 24, "start_page": 350, "direction": "backwards", "name": "Mustafa Hussain"},
    29: {"surah": 33, "start_page": 418, "direction": "backwards", "name": "Fatima Zahra"},
    30: {"surah": 47, "start_page": 507, "direction": "forwards", "name": "Aisha Begum"},
}

# Student class counters (track how many classes each student has had)
student_class_counts = {sid: 0 for sid in STUDENT_START.keys()}

# Note templates focused on memorization (not tajweed)
NOTE_TEMPLATES = {
    "hifz_excellent": [
        "Surah {surah} memorization was excellent today.",
        "New memorization was flawless, mashaAllah.",
        "Hifz portion recited beautifully without hesitation.",
        "Strong memorization - clearly prepared well.",
    ],
    "hifz_very_good": [
        "Surah {surah} memorization was very good.",
        "New Hifz was solid with minor prompts.",
        "Good memorization of new portion.",
        "Hifz recitation was strong today.",
    ],
    "hifz_good": [
        "Surah {surah} memorization needs more practice.",
        "Some hesitation in new Hifz portion.",
        "Hifz portion had a few mistakes - review at home.",
        "New memorization was acceptable but could be stronger.",
    ],
    "hifz_needs_work": [
        "Hifz portion was weak today - needs more preparation.",
        "Struggled with Surah {surah} significantly.",
        "New memorization was not prepared properly.",
        "Hifz was below expectations - must review before next class.",
    ],
    "sabqi_good": [
        "Sabqi retention was excellent.",
        "Recent memorization is holding well.",
        "Good review of previous portions.",
    ],
    "sabqi_bad": [
        "Sabqi needs daily revision.",
        "Recent memorization weakening - increase review.",
        "Sabqi portion had too many mistakes.",
    ],
    "manzil_good": [
        "Manzil revision was strong.",
        "Long-term retention is excellent.",
        "Confident recitation of older portions.",
    ],
    "manzil_bad": [
        "Manzil portion needs more attention.",
        "Older memorization is fading - increase revision cycle.",
        "Revision of earlier surahs was weak.",
    ],
    "repeated_mistakes": [
        "Same mistakes appearing again - focus on problem areas.",
        "Repeated errors in this section need targeted review.",
        "Review mistakes from previous classes carefully.",
    ],
    "overall_excellent": [
        "Excellent class overall, mashaAllah!",
        "Great progress, keep it up!",
        "Outstanding performance today.",
    ],
    "overall_very_good": [
        "Very good class overall.",
        "Solid performance, continue the effort.",
        "Good work today.",
    ],
    "overall_good": [
        "Acceptable class, but more practice needed.",
        "Fair performance - can do better with more preparation.",
        "Needs to put in more effort at home.",
    ],
    "overall_needs_work": [
        "Must improve significantly before next class.",
        "Performance below expectations today.",
        "Serious home review required.",
    ],
}

# =============================================================================
# DATABASE CONNECTION
# =============================================================================

def get_db_connections():
    """Get connections to app.db and quran.db"""
    app_conn = sqlite3.connect('app.db')
    app_conn.row_factory = sqlite3.Row
    quran_conn = sqlite3.connect('quran.db')
    quran_conn.row_factory = sqlite3.Row
    return app_conn, quran_conn


# =============================================================================
# QURAN DATA HELPERS
# =============================================================================

def load_page_data(page_num):
    """Load word data for a specific Quran page"""
    path = f'quran-pages/page_{str(page_num).zfill(3)}.json'
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_surah_name(quran_conn, surah_num):
    """Get English name of a surah"""
    cursor = quran_conn.execute(
        "SELECT englishName FROM surahs WHERE number = ?",
        (surah_num,)
    )
    row = cursor.fetchone()
    return row['englishName'] if row else f"Surah {surah_num}"


def get_page_info(page_num):
    """Get surah and ayah info for words on a page"""
    words = load_page_data(page_num)
    # Filter to just actual words (not ayah end markers)
    word_list = [w for w in words if w.get('ct') == 'word']
    return word_list


def get_surahs_on_page(page_num):
    """Get list of unique surahs on a page"""
    words = load_page_data(page_num)
    return sorted(set(w['s'] for w in words))


# =============================================================================
# PORTION CALCULATION
# =============================================================================

def calculate_hifz_page(student_id, class_count):
    """Calculate which page the student should be memorizing"""
    config = STUDENT_START[student_id]
    start_page = config['start_page']
    direction = config['direction']

    if direction == 'backwards':
        # Memorizing from high page numbers to low
        page = start_page - class_count
        return max(1, page)
    else:
        # Memorizing from low page numbers to high
        page = start_page + class_count
        return min(604, page)


def get_portion_range(student_id, class_count, portion_type):
    """
    Calculate portion range for a student.
    Returns (start_page, end_page) tuple.
    """
    config = STUDENT_START[student_id]
    direction = config['direction']
    hifz_page = calculate_hifz_page(student_id, class_count)
    start_page = config['start_page']

    if portion_type == 'hifz':
        # 1 page of new memorization
        return (hifz_page, hifz_page)

    elif portion_type == 'sabqi':
        # Previous 3 pages (recently memorized)
        if direction == 'backwards':
            # If going backwards, sabqi is pages AFTER current hifz
            sabqi_start = hifz_page + 1
            sabqi_end = min(start_page, hifz_page + 3)
        else:
            # If going forwards, sabqi is pages BEFORE current hifz
            sabqi_start = max(start_page, hifz_page - 3)
            sabqi_end = hifz_page - 1

        if sabqi_start > sabqi_end:
            sabqi_start, sabqi_end = sabqi_end, sabqi_start

        # Make sure we have valid range
        if sabqi_end < 1 or sabqi_start > 604:
            return (hifz_page, hifz_page)  # Fall back to hifz page

        return (max(1, sabqi_start), min(604, sabqi_end))

    elif portion_type == 'revision':  # manzil
        # 10 pages cycling through memorized range
        memorized_pages = abs(hifz_page - start_page)

        if memorized_pages < 10:
            # Not enough memorized yet, review from start
            if direction == 'backwards':
                manzil_start = min(hifz_page + 1, 604)
                manzil_end = min(start_page, 604)
                if manzil_start > manzil_end:
                    manzil_start, manzil_end = manzil_end, manzil_start
                return (max(1, manzil_start), min(604, manzil_end))
            else:
                manzil_start = max(start_page, 1)
                manzil_end = max(hifz_page - 1, 1)
                if manzil_start > manzil_end:
                    manzil_start, manzil_end = manzil_end, manzil_start
                return (max(1, manzil_start), min(604, manzil_end))

        # Cycle through memorized range
        cycle_offset = (class_count * 10) % memorized_pages

        if direction == 'backwards':
            manzil_start = hifz_page + 1 + cycle_offset
            manzil_end = min(manzil_start + 9, start_page)
        else:
            manzil_start = max(start_page + cycle_offset, 1)
            manzil_end = min(manzil_start + 9, hifz_page - 1)

        if manzil_start > manzil_end:
            manzil_start, manzil_end = manzil_end, manzil_start

        return (max(1, manzil_start), min(604, manzil_end))

    return (hifz_page, hifz_page)


def get_ayah_for_page(page_num, position='start'):
    """Get the surah and ayah for start or end of a page"""
    # Clamp to valid page range
    page_num = max(1, min(604, page_num))

    words = load_page_data(page_num)
    if not words:
        return (1, 1)

    if position == 'start':
        w = words[0]
    else:  # end
        w = words[-1]

    return (w['s'], w['a'])


# =============================================================================
# PERFORMANCE AND MISTAKES
# =============================================================================

def generate_performance():
    """
    Generate weighted random performance rating.
    Distribution: 35% Excellent, 40% Very Good, 23% Good, 2% Needs Work
    """
    rand = random.random()
    if rand < 0.35:
        return "Excellent"
    elif rand < 0.75:  # 0.35 + 0.40
        return "Very Good"
    elif rand < 0.98:  # 0.75 + 0.23
        return "Good"
    else:
        return "Needs Work"


def get_mistake_percentage(performance):
    """Get mistake percentage range based on performance"""
    ranges = {
        "Excellent": (0, 0.10),      # 0-10%
        "Very Good": (0.10, 0.20),   # 10-20%
        "Good": (0.20, 0.30),        # 20-30%
        "Needs Work": (0.30, 0.50),  # 30-50%
    }
    low, high = ranges.get(performance, (0.10, 0.20))
    return random.uniform(low, high)


def generate_mistakes(app_conn, student_id, class_id, hifz_page, performance):
    """
    Generate mistakes for a class based on performance.
    Returns count of mistakes created and whether any were repeats.
    """
    mistake_pct = get_mistake_percentage(performance)

    # Get words on the hifz page
    words = get_page_info(hifz_page)
    if not words:
        return 0, False

    # Calculate number of mistakes
    num_mistakes = max(0, int(len(words) * mistake_pct))
    if num_mistakes == 0:
        return 0, False

    # Select random words for mistakes
    mistake_words = random.sample(words, min(num_mistakes, len(words)))

    created = 0
    has_repeats = False
    now = datetime.now().isoformat()

    for word in mistake_words:
        surah_num = word['s']
        ayah_num = word['a']
        word_index = word['p'] - 1  # Convert to 0-based (JSON p field is 1-based)
        word_text = word['t']

        # Determine char_index: None for whole word, or specific character index
        # 70% whole word, 20% specific letter, 10% harakat
        rand = random.random()
        if rand < 0.70:
            char_index = None  # Whole word (null in database)
        elif rand < 0.90:
            # Random letter (not last char which is often harakat)
            char_index = random.randint(0, max(0, len(word_text) - 2))
        else:
            # Harakat (last char)
            char_index = len(word_text) - 1 if word_text else 0

        # Check if this exact mistake already exists for this student
        if char_index is None:
            cursor = app_conn.execute(
                """SELECT id, error_count FROM mistakes
                   WHERE student_id = ? AND surah_number = ? AND ayah_number = ?
                   AND word_index = ? AND char_index IS NULL""",
                (student_id, surah_num, ayah_num, word_index)
            )
        else:
            cursor = app_conn.execute(
                """SELECT id, error_count FROM mistakes
                   WHERE student_id = ? AND surah_number = ? AND ayah_number = ?
                   AND word_index = ? AND char_index = ?""",
                (student_id, surah_num, ayah_num, word_index, char_index)
            )
        existing = cursor.fetchone()

        if existing:
            # Update error_count
            app_conn.execute(
                "UPDATE mistakes SET error_count = ?, updated_at = ? WHERE id = ?",
                (existing['error_count'] + 1, now, existing['id'])
            )
            mistake_id = existing['id']
            has_repeats = True
        else:
            # Create new mistake
            cursor = app_conn.execute(
                """INSERT INTO mistakes
                   (surah_number, ayah_number, word_index, word_text, char_index,
                    error_count, student_id, updated_at)
                   VALUES (?, ?, ?, ?, ?, 1, ?, ?)""",
                (surah_num, ayah_num, word_index, word_text, char_index, student_id, now)
            )
            mistake_id = cursor.lastrowid

        # Create mistake occurrence for this class
        app_conn.execute(
            "INSERT INTO mistake_occurrences (mistake_id, class_id, occurred_at) VALUES (?, ?, ?)",
            (mistake_id, class_id, now)
        )

        created += 1

    return created, has_repeats


# =============================================================================
# NOTE GENERATION
# =============================================================================

def generate_note(quran_conn, performance, hifz_page, has_repeated_mistakes):
    """Generate contextual teacher note based on performance"""
    surahs = get_surahs_on_page(hifz_page)
    surah_name = get_surah_name(quran_conn, surahs[0]) if surahs else "the page"

    parts = []

    # Add Hifz comment based on performance
    if performance == "Excellent":
        template = random.choice(NOTE_TEMPLATES["hifz_excellent"])
    elif performance == "Very Good":
        template = random.choice(NOTE_TEMPLATES["hifz_very_good"])
    elif performance == "Good":
        template = random.choice(NOTE_TEMPLATES["hifz_good"])
    else:
        template = random.choice(NOTE_TEMPLATES["hifz_needs_work"])

    parts.append(template.format(surah=surah_name))

    # Maybe add sabqi/manzil comment (30% chance)
    if random.random() < 0.30:
        if performance in ["Excellent", "Very Good"]:
            parts.append(random.choice(NOTE_TEMPLATES["sabqi_good"] + NOTE_TEMPLATES["manzil_good"]))
        else:
            parts.append(random.choice(NOTE_TEMPLATES["sabqi_bad"] + NOTE_TEMPLATES["manzil_bad"]))

    # Add repeated mistakes comment if applicable (50% chance when there are repeats)
    if has_repeated_mistakes and random.random() < 0.50:
        parts.append(random.choice(NOTE_TEMPLATES["repeated_mistakes"]))

    # Add overall comment
    if performance == "Excellent":
        parts.append(random.choice(NOTE_TEMPLATES["overall_excellent"]))
    elif performance == "Very Good":
        parts.append(random.choice(NOTE_TEMPLATES["overall_very_good"]))
    elif performance == "Good":
        parts.append(random.choice(NOTE_TEMPLATES["overall_good"]))
    else:
        parts.append(random.choice(NOTE_TEMPLATES["overall_needs_work"]))

    # Combine 2-3 parts
    return " ".join(parts[:random.randint(2, 3)])


# =============================================================================
# CLASS CREATION
# =============================================================================

def get_attending_students(teacher_id, all_students):
    """Determine which students attend this class based on group pattern"""
    config = TEACHER_CONFIG[teacher_id]
    pattern = config['group_pattern']

    if pattern == 'individual' or len(all_students) == 1:
        return all_students

    # Mix pattern: 40% all, 40% pairs, 20% individual
    rand = random.random()
    if rand < 0.40:
        # All students together
        return all_students
    elif rand < 0.80:
        # Pairs (or all if only 2)
        if len(all_students) == 2:
            return all_students
        else:
            # Pick 2 students
            return random.sample(all_students, 2)
    else:
        # Individual - pick 1
        return [random.choice(all_students)]


def create_class(app_conn, quran_conn, teacher_id, class_date, students, is_published=True):
    """Create a class with assignments and mistakes for all attending students"""
    day_name = class_date.strftime('%A')
    now = datetime.now().isoformat()

    # Create class record
    cursor = app_conn.execute(
        """INSERT INTO classes (date, day, teacher_id, is_published, created_at, updated_at, class_type)
           VALUES (?, ?, ?, ?, ?, ?, 'regular')""",
        (class_date.isoformat(), day_name, teacher_id, is_published, now, now)
    )
    class_id = cursor.lastrowid

    total_mistakes = 0
    any_repeats = False
    student_performances = []

    for student_id in students:
        # Increment class count for this student
        class_count = student_class_counts[student_id]
        student_class_counts[student_id] += 1

        # Generate performance for this student
        performance = generate_performance()
        student_performances.append((student_id, performance))

        # Add to class_students
        app_conn.execute(
            "INSERT INTO class_students (class_id, student_id, performance) VALUES (?, ?, ?)",
            (class_id, student_id, performance)
        )

        # Create assignments for this student
        for portion_type in ['hifz', 'sabqi', 'revision']:
            start_page, end_page = get_portion_range(student_id, class_count, portion_type)
            start_surah, start_ayah = get_ayah_for_page(start_page, 'start')
            end_surah, end_ayah = get_ayah_for_page(end_page, 'end')

            app_conn.execute(
                """INSERT INTO assignments
                   (class_id, student_id, type, start_surah, start_ayah, end_surah, end_ayah, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (class_id, student_id, portion_type, start_surah, start_ayah, end_surah, end_ayah, now)
            )

        # Generate mistakes for this student (only for hifz portion)
        hifz_page = calculate_hifz_page(student_id, class_count)
        mistakes_created, has_repeats = generate_mistakes(
            app_conn, student_id, class_id, hifz_page, performance
        )
        total_mistakes += mistakes_created
        if has_repeats:
            any_repeats = True

    # Generate note based on first student's performance (or average)
    if student_performances:
        # Use the most common performance or first one
        first_perf = student_performances[0][1]
        first_student = student_performances[0][0]
        hifz_page = calculate_hifz_page(first_student, student_class_counts[first_student] - 1)
        note = generate_note(quran_conn, first_perf, hifz_page, any_repeats)

        app_conn.execute(
            "UPDATE classes SET notes = ? WHERE id = ?",
            (note, class_id)
        )

    return class_id, total_mistakes


# =============================================================================
# MAIN SEEDING FUNCTIONS
# =============================================================================

def clear_existing_data(app_conn):
    """Clear all existing data except users and fix schema if needed"""
    tables = [
        'mistake_occurrences',
        'mistakes',
        'assignments',
        'class_students',
        'classes',
        'teacher_student_relationships',
        'test_mistakes',
        'test_questions',
        'tests'
    ]

    for table in tables:
        app_conn.execute(f"DELETE FROM {table}")

    # Reset auto-increment counters
    app_conn.execute("DELETE FROM sqlite_sequence WHERE name IN ('classes', 'assignments', 'mistakes', 'mistake_occurrences', 'class_students', 'teacher_student_relationships')")

    # Fix the mistakes table unique constraint to include student_id
    # SQLite doesn't support ALTER TABLE to drop constraints, so we recreate the table
    app_conn.execute("DROP TABLE IF EXISTS mistakes")
    app_conn.execute("""
        CREATE TABLE mistakes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            surah_number INTEGER NOT NULL,
            ayah_number INTEGER NOT NULL,
            word_index INTEGER NOT NULL,
            word_text TEXT NOT NULL,
            char_index INTEGER,
            error_count INTEGER DEFAULT 1,
            device_id TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            student_id INTEGER REFERENCES users(id),
            UNIQUE(student_id, surah_number, ayah_number, word_index, char_index)
        )
    """)

    app_conn.commit()
    print("Cleared existing data (kept users)")


def seed_relationships(app_conn):
    """Create teacher-student relationships"""
    now = datetime.now().isoformat()

    for teacher_id, config in TEACHER_CONFIG.items():
        for student_id in config['students']:
            app_conn.execute(
                "INSERT INTO teacher_student_relationships (teacher_id, student_id, added_at) VALUES (?, ?, ?)",
                (teacher_id, student_id, now)
            )

    app_conn.commit()
    print(f"Created {sum(len(c['students']) for c in TEACHER_CONFIG.values())} teacher-student relationships")


def main():
    """Main seeding function"""
    print("=" * 60)
    print("QuranTrack Database Seeding Script")
    print("=" * 60)
    print(f"Date range: {START_DATE} to {END_DATE}")
    print(f"Teachers: {len(TEACHER_CONFIG)}")
    print(f"Students: {len(STUDENT_START)}")
    print()

    app_conn, quran_conn = get_db_connections()

    # Step 1: Clear existing data
    print("Step 1: Clearing existing data...")
    clear_existing_data(app_conn)

    # Step 2: Create relationships
    print("Step 2: Creating teacher-student relationships...")
    seed_relationships(app_conn)

    # Step 3: Create classes
    print("Step 3: Creating classes...")

    total_classes = 0
    total_assignments = 0
    total_mistakes = 0

    # Calculate total expected classes for progress
    current_date = START_DATE
    all_class_dates = []
    while current_date <= END_DATE:
        day_name = current_date.strftime('%A')
        for teacher_id, config in TEACHER_CONFIG.items():
            if day_name in config['days']:
                all_class_dates.append((current_date, teacher_id))
        current_date += timedelta(days=1)

    total_expected = len(all_class_dates)
    unpublished_count = int(total_expected * 0.05)  # Last 5% unpublished
    unpublished_threshold = total_expected - unpublished_count

    for i, (class_date, teacher_id) in enumerate(all_class_dates):
        config = TEACHER_CONFIG[teacher_id]
        students = get_attending_students(teacher_id, config['students'])
        is_published = (i < unpublished_threshold)

        class_id, mistakes = create_class(
            app_conn, quran_conn, teacher_id, class_date, students, is_published
        )

        total_classes += 1
        total_assignments += len(students) * 3  # 3 portions per student
        total_mistakes += mistakes

        # Progress update every 100 classes
        if total_classes % 100 == 0:
            print(f"  Created {total_classes}/{total_expected} classes...")

    app_conn.commit()

    # Get final counts
    mistake_count = app_conn.execute("SELECT COUNT(*) FROM mistakes").fetchone()[0]
    occurrence_count = app_conn.execute("SELECT COUNT(*) FROM mistake_occurrences").fetchone()[0]
    class_student_count = app_conn.execute("SELECT COUNT(*) FROM class_students").fetchone()[0]

    print()
    print("=" * 60)
    print("SEEDING COMPLETE")
    print("=" * 60)
    print(f"Classes created:        {total_classes}")
    print(f"Class-student entries:  {class_student_count}")
    print(f"Assignments created:    {total_assignments}")
    print(f"Unique mistakes:        {mistake_count}")
    print(f"Mistake occurrences:    {occurrence_count}")
    print(f"Unpublished classes:    {unpublished_count}")
    print()

    # Print per-student summary
    print("Per-student class counts:")
    for student_id, count in sorted(student_class_counts.items()):
        name = STUDENT_START[student_id]['name']
        print(f"  {name}: {count} classes")

    app_conn.close()
    quran_conn.close()


if __name__ == "__main__":
    main()
