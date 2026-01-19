# Database Seeding Guide

## Overview

The `seed_database.py` script populates the QuranTrack database with realistic test data spanning December 1, 2025 to December 31, 2026 (~57 weeks). This creates a comprehensive dataset for testing and development.

## What It Creates

| Table | Approximate Rows |
|-------|------------------|
| classes | ~672 |
| class_students | ~900 |
| assignments | ~2,700 |
| mistakes | ~5,000-8,000 |
| mistake_occurrences | ~12,000-18,000 |
| teacher_student_relationships | 11 |

## Usage

```bash
cd quran_backend
python seed_database.py
```

The script will:
1. Clear all existing data (classes, assignments, mistakes) while keeping users
2. Create teacher-student relationships
3. Generate classes for the entire date range
4. Print a summary of created data

## Configuration

### Teachers and Students

The script includes 6 teachers and 11 students with pre-configured assignments:

| Teacher | Days | Students |
|---------|------|----------|
| Hamza Feroze (19) | Sat, Wed | Hamza Reyal |
| Abdullah Qureshi (31) | Mon, Thu | Ahmed, Yusuf, Omar |
| Tariq Jameel (32) | Tue, Sat | Ibrahim, Bilal |
| Usman Farooq (33) | Sun, Wed | Khalid, Zayd |
| Maryam Siddiqui (34) | Mon, Fri | Mustafa, Fatima |
| Khadijah Noor (35) | Tue, Thu | Aisha |

### Student Starting Points

Each student starts memorizing from a different point in the Quran:

| Student | Starting Surah | Direction |
|---------|---------------|-----------|
| Hamza Reyal | 114 (An-Naas) | Backwards |
| Ahmed Khan | 114 (An-Naas) | Backwards |
| Yusuf Ali | 78 (An-Naba) | Backwards |
| Omar Hassan | 67 (Al-Mulk) | Backwards |
| Ibrahim Mohammed | 55 (Ar-Rahman) | Backwards |
| Bilal Ahmad | 36 (Ya-Sin) | Backwards |
| Khalid Rahman | 2 (Al-Baqarah) | Forwards |
| Zayd Malik | 3 (Aal-Imran) | Forwards |
| Mustafa Hussain | 24 (An-Nur) | Backwards |
| Fatima Zahra | 33 (Al-Ahzab) | Backwards |
| Aisha Begum | 47 (Muhammad) | Forwards |

### Portion Structure

Each class creates three assignments per student:

- **Hifz**: 1 new page of memorization
- **Sabqi**: 3 pages of recent review (previous pages)
- **Manzil**: 10 pages of cycling revision (older memorization)

### Class Grouping

- **Individual pattern**: Students always have 1-on-1 classes
- **Mix pattern**: 40% all students together, 40% pairs, 20% individual

## Data Characteristics

### Performance Distribution

The script generates weighted random performance ratings:
- 35% Excellent (0-10% mistakes)
- 40% Very Good (10-20% mistakes)
- 23% Good (20-30% mistakes)
- 2% Needs Work (30-50% mistakes)

### Mistake Types

Mistakes are distributed as:
- 70% whole word mistakes (`char_index = null`)
- 20% specific letter mistakes
- 10% harakat (vowel mark) mistakes

### Repeated Mistakes

When a student makes a mistake on a word they've previously struggled with:
- The existing mistake's `error_count` is incremented
- A new `mistake_occurrence` is created linking to the class
- This models realistic student behavior with persistent problem areas

### Teacher Notes

Every class includes contextual teacher notes based on:
- Performance level (Excellent/Very Good/Good/Needs Work)
- Whether repeated mistakes occurred
- The surah being memorized

Notes focus on memorization quality, not tajweed (pronunciation rules).

### Published Status

- 95% of classes are marked as published
- The last 5% remain unpublished (simulating recent classes not yet reviewed)

## Customization

Edit the variables at the top of `seed_database.py` to customize:

```python
# Change date range
START_DATE = date(2025, 12, 1)
END_DATE = date(2026, 12, 31)

# Modify teacher-student assignments
TEACHER_CONFIG = {
    19: {
        "days": ["Saturday", "Wednesday"],
        "students": [20],
        "group_pattern": "individual"
    },
    # ...
}

# Adjust student starting points
STUDENT_START = {
    20: {"surah": 114, "start_page": 604, "direction": "backwards"},
    # ...
}
```

## Troubleshooting

### Script fails with "no such table"

Ensure you're in the `quran_backend` directory where `app.db` exists:

```bash
cd quran_backend
python seed_database.py
```

### Users are missing

The script does NOT create users. Run `create_test_users.py` first:

```bash
python create_test_users.py
python seed_database.py
```

### Need to re-run seeding

Simply run the script again. It clears existing class data before creating new data.

## Related Documentation

- [PROJECT_CHANGELOG.md](../PROJECT_CHANGELOG.md) - Phase 11: Database Seeding
- [CLASSES_AND_MISTAKES.md](../Technical%20Implementation%20Journey/CLASSES_AND_MISTAKES.md) - Database schema details
