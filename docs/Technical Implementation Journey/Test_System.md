# Test System Documentation

This document describes the Test Class feature in QuranTrack, which allows teachers to conduct formal assessments of student Quran recitation with scoring based on mistake history.

---

## Overview

Test Classes are a special class type that enables teachers to:
- Conduct structured oral tests with multiple questions
- Track mistakes during each question
- Score students based on both new and repeated mistakes
- Use Tanbeeh (تنبيه) - teacher warnings for self-corrected mistakes
- View detailed results showing performance breakdown

### Key Differences from Regular Classes

| Feature | Regular Class | Test Class |
|---------|--------------|------------|
| Students | Multiple students allowed | Single student only |
| Portions | Multiple (Hifz, Sabqi, Revision) | Single test portion |
| Mistakes | Tracked globally per student | Tracked per question + globally |
| Scoring | Performance rating (subjective) | Calculated score (objective) |
| Structure | Free-form review | Question-by-question flow |
| UI | Section tabs | Test Control Panel |

---

## Scoring System

### How Scoring Works

**The test is always scored out of 100 points.**

- Start with **100 points**
- **Deduct points** for each mistake
- **Final Score = 100 - Total Deductions** (minimum 0)

This means:
- A perfect test = 100%
- Every mistake reduces the score
- No matter how many questions, the max is always 100

### Points Deduction Table

| Mistake Type | Previous Errors | Points Deducted | Description |
|-------------|-----------------|-----------------|-------------|
| **Tanbeeh (تنبيه)** | Any | **-0.5** | Teacher warning, student self-corrects |
| **Full Mistake** | 0 (new) | **-1.0** | First time making this mistake |
| **Full Mistake** | 1 | **-2.0** | Made this mistake once before |
| **Full Mistake** | 2 | **-3.0** | Made this mistake twice before |
| **Full Mistake** | 3 | **-4.0** | Made this mistake 3 times before |
| **Full Mistake** | 4+ | **-5.0** | Made this mistake 4+ times (capped) |

### Tanbeeh (تنبيه) - Teacher Warning

Tanbeeh is a special type of mistake marking:
- Teacher gives a **warning signal** to the student
- Student **self-corrects** their mistake
- Only **-0.5 points** deducted (regardless of history)
- Displayed with **cyan underline** in results
- Does NOT count toward the "repeated" penalty for future mistakes

### Full Mistake

A full mistake is when the student does not self-correct:
- **-1.0 points** for a new mistake (never made before)
- **+1 point** for each time previously made
- **Capped at -5.0 points** maximum

### Scoring Formula

```python
def calculate_points_deducted(previous_error_count: int, is_tanbeeh: bool = False) -> float:
    """
    Calculate points to deduct for a mistake.

    Args:
        previous_error_count: How many times this mistake was made before
        is_tanbeeh: True if this is a teacher warning (student self-corrected)

    Returns:
        Points to deduct from the score
    """
    # Tanbeeh is always 0.5, regardless of history
    if is_tanbeeh:
        return 0.5

    # Full mistake: 1 + previous count, capped at 5
    if previous_error_count >= 4:
        return 5.0
    else:
        return 1.0 + float(previous_error_count)
```

### Example Scenarios

**Scenario 1: Perfect Test**
- No mistakes made
- Final Score: **100 / 100 = 100%**

**Scenario 2: A Few New Mistakes**
- 3 new mistakes (0 previous each): 3 × 1.0 = -3.0 pts
- Final Score: **97 / 100 = 97%**

**Scenario 3: Mix of Tanbeeh and Full Mistakes**
- 2 tanbeeh: 2 × 0.5 = -1.0 pts
- 1 new full mistake: 1 × 1.0 = -1.0 pts
- 1 repeated mistake (made 2x before): 1 × 3.0 = -3.0 pts
- Total deductions: -5.0 pts
- Final Score: **95 / 100 = 95%**

**Scenario 4: Many Repeated Mistakes**
- 5 mistakes, each made 4+ times before: 5 × 5.0 = -25.0 pts
- Final Score: **75 / 100 = 75%**

**Scenario 5: Catastrophic Test**
- Total deductions exceed 100 points
- Final Score: **0 / 100 = 0%** (minimum is 0)

---

## Database Schema

### Modified Tables

#### `classes` table
Added `class_type` column:
```sql
ALTER TABLE classes ADD COLUMN class_type TEXT DEFAULT 'regular'
  CHECK(class_type IN ('regular', 'test'));
```

### New Tables

#### `tests` table
Stores test metadata and overall results.
```sql
CREATE TABLE tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL UNIQUE,
    student_id INTEGER NOT NULL,
    total_score REAL,           -- Final score (100 - deductions)
    max_score REAL DEFAULT 100, -- Always 100
    status TEXT DEFAULT 'not_started'
      CHECK(status IN ('not_started', 'in_progress', 'completed')),
    started_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id)
);
```

#### `test_questions` table
Stores individual questions within a test.
```sql
CREATE TABLE test_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL,
    question_number INTEGER NOT NULL,
    start_surah INTEGER,
    start_ayah INTEGER,
    end_surah INTEGER,
    end_ayah INTEGER,
    points_earned REAL,    -- Stores DEDUCTIONS for this question (not score)
    points_possible REAL,  -- Not used in current implementation
    status TEXT DEFAULT 'pending'
      CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    started_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);
```

**Note:** `points_earned` actually stores the total deductions for the question, not a score. This naming is a legacy artifact.

#### `test_mistakes` table
Records mistakes made during test questions with scoring information.
```sql
CREATE TABLE test_mistakes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    mistake_id INTEGER,
    surah_number INTEGER NOT NULL,
    ayah_number INTEGER NOT NULL,
    word_index INTEGER NOT NULL,
    word_text TEXT NOT NULL,
    char_index INTEGER,
    is_tanbeeh BOOLEAN DEFAULT 0,      -- 1 = teacher warning, 0 = full mistake
    is_repeated BOOLEAN DEFAULT 0,      -- Was this mistake made before?
    previous_error_count INTEGER DEFAULT 0,
    points_deducted REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES test_questions(id) ON DELETE CASCADE,
    FOREIGN KEY (mistake_id) REFERENCES mistakes(id)
);
```

---

## API Endpoints

### Test Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/classes/{class_id}/test` | Get test for a class (creates if not exists) |
| PATCH | `/api/tests/{test_id}/start` | Start test (status → in_progress) |
| PATCH | `/api/tests/{test_id}/complete` | Complete test, calculate final score |

### Question Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tests/{test_id}/questions/start` | Start new question |
| PATCH | `/api/tests/{test_id}/questions/{question_id}/end` | End question |
| PATCH | `/api/tests/{test_id}/questions/{question_id}/cancel` | Cancel question |

### Test Mistakes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tests/{test_id}/mistakes` | Record mistake during test |

---

## API Request/Response Examples

### Record a Test Mistake (with Tanbeeh)

**Request:**
```http
POST /api/tests/1/mistakes
Content-Type: application/json
Authorization: Bearer <token>

{
    "question_id": 1,
    "surah_number": 67,
    "ayah_number": 3,
    "word_index": 2,
    "word_text": "تفاوت",
    "char_index": null,
    "is_tanbeeh": true
}
```

**Response:**
```json
{
    "id": 1,
    "test_id": 1,
    "question_id": 1,
    "mistake_id": 45,
    "surah_number": 67,
    "ayah_number": 3,
    "word_index": 2,
    "word_text": "تفاوت",
    "char_index": null,
    "is_tanbeeh": 1,
    "is_repeated": 0,
    "previous_error_count": 0,
    "points_deducted": 0.5,
    "created_at": "2025-01-15T10:32:15"
}
```

### Record a Full Mistake (Repeated)

**Request:**
```http
POST /api/tests/1/mistakes
Content-Type: application/json
Authorization: Bearer <token>

{
    "question_id": 1,
    "surah_number": 67,
    "ayah_number": 5,
    "word_index": 0,
    "word_text": "خلق",
    "char_index": null,
    "is_tanbeeh": false
}
```

**Response:**
```json
{
    "id": 2,
    "test_id": 1,
    "question_id": 1,
    "mistake_id": 12,
    "surah_number": 67,
    "ayah_number": 5,
    "word_index": 0,
    "word_text": "خلق",
    "char_index": null,
    "is_tanbeeh": 0,
    "is_repeated": 1,
    "previous_error_count": 2,
    "points_deducted": 3.0,
    "created_at": "2025-01-15T10:33:00"
}
```

---

## Test Flow

### State Machine

```
Test States:
  not_started ──► in_progress ──► completed
       │              │
       └──────────────┴── (can be deleted)

Question States:
  pending ──► in_progress ──► completed
                   │
                   └──► cancelled
```

### Typical Test Flow

1. **Create Test Class**
   - Teacher creates class with `class_type: 'test'`
   - Test record auto-created with student and portion

2. **Start Test**
   - Teacher enters classroom and clicks "Start Test"
   - Test status changes to `in_progress`

3. **Question Loop** (repeat for each question)
   a. Teacher clicks "Start Question"
   b. Teacher clicks ayah marker to set start point
   c. Question status becomes `in_progress`
   d. Teacher marks mistakes:
      - Click word → popup with letters/harakat
      - "Mark Full Mistake" for regular mistakes
      - "Tanbeeh (تنبيه)" for teacher warnings
   e. Teacher clicks "End Question"
   f. Teacher clicks ayah marker to set end point
   g. Deductions summed automatically

4. **Complete Test**
   - Teacher clicks "End Test"
   - Final score = 100 - total deductions
   - Results displayed with breakdown

---

## Frontend Implementation

### Test Control Panel (Classroom.tsx)

For test classes, the regular section tabs (Hifz/Sabqi/Revision) are replaced with a Test Control Panel:

```
┌─────────────────────────────────────────────────────────────┐
│  TEST MODE                                    Score: 85%    │
├─────────────────────────────────────────────────────────────┤
│  Question 3 in progress                                     │
│  67:8 → (selecting end...)                                  │
│                                                             │
│  [End Question]  [Cancel Question]                          │
├─────────────────────────────────────────────────────────────┤
│                              [End Test]                     │
└─────────────────────────────────────────────────────────────┘
```

### Test Results View

After test completion:

```
┌─────────────────────────────────────────────────────────────┐
│                     TEST COMPLETED                          │
│                                                             │
│                         85%                                 │
│                    85.0 / 100 points                        │
│                  (15.0 points deducted)                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Question Breakdown:                                        │
│                                                             │
│  Q1: 67:1 → 67:5                               -2.0 pts     │
│    │ 67:3  تَفَاوُتٍ                              -0.5      │
│    │       (تنبيه)                                          │
│    │ 67:5  خَلْقَ  (repeated 2x)                  -3.0      │
│                                                             │
│  Q2: 67:6 → 67:10                              Perfect!     │
│                                                             │
│  Q3: 67:11 → 67:15                             -5.0 pts     │
│    │ 67:12  فَٱعْتَرَفُوا۟                         -1.0      │
│    │ 67:14  كَبِيرٌ  (repeated 1x)                -2.0      │
│    │ 67:15  نَزَّلَ  (repeated 1x)                -2.0      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tanbeeh Button in Word Popup

When clicking a word during test mode, the popup shows:
1. "Mark Full Mistake" button (regular mistake)
2. Letter selection for character-level mistakes
3. Harakat selection for diacritical mark mistakes
4. **"Tanbeeh (تنبيه)" button** at the bottom (cyan colored)

---

## Troubleshooting & Known Issues

### Issue 1: "0" Characters Appearing in Results

**Problem:** Arabic words in test results showed "0" or "00" characters after them.

**Cause:** Two separate issues:

1. **Quranic pause marks** (۟ ۭ etc.) - Unicode characters U+06D6 to U+06ED that don't render properly in most fonts, appearing as "0".

2. **React rendering integer 0** - SQLite returns `0`/`1` for boolean fields. In React, `{0 && <Component />}` renders "0" as text instead of nothing.

**Solution:**
```typescript
// Strip Quranic pause marks
const stripQuranMarks = (text: string): string => {
  return text.replace(/[\u06D6-\u06ED]/g, '').trim();
};

// Use explicit comparisons instead of truthy/falsy
{m.is_tanbeeh === 1 && <span>(تنبيه)</span>}
{m.is_tanbeeh === 0 && m.is_repeated === 1 && <span>(repeated)</span>}
```

### Issue 2: Score Showing Wrong Values

**Problem:** Score showed values like "103.5/120" instead of percentage out of 100.

**Cause:** Old implementation calculated per-question scores. Legacy data had incompatible format.

**Solution:** Changed to deduction-based system:
- `points_earned` now stores deductions per question
- Final score = 100 - sum of all deductions
- Cleared old test data that used the old format

### Issue 3: Boolean Fields from SQLite

**Problem:** `is_tanbeeh` and `is_repeated` come from SQLite as integers (0/1), not booleans.

**Impact:** JavaScript truthy/falsy checks don't work as expected.

**Solution:** Use explicit comparisons:
```typescript
// Wrong (JavaScript treats 0 as falsy, but React renders it)
{!m.is_tanbeeh && m.is_repeated && ...}

// Correct
{m.is_tanbeeh === 0 && m.is_repeated === 1 && ...}
```

---

## Global Mistake Integration

Test mistakes are integrated with the global mistake system:

1. **Recording**: When a test mistake is recorded, it also creates/updates a global mistake record
2. **History Check**: Before recording, the system checks `previous_error_count` from global mistakes
3. **Persistence**: Mistakes made during tests persist and affect future test scores

**Exception:** Tanbeeh mistakes do NOT increment the global error_count (since the student self-corrected).

This ensures that:
- Students are held accountable for previously made mistakes
- Progress tracking continues across regular classes and tests
- The scoring system reflects cumulative learning

---

## Security & Authorization

- All test endpoints require JWT authentication
- Only the teacher who created the class can manage the test
- Students can only view their own test results (after test completion)
- Test data is associated with specific student via `student_id`
