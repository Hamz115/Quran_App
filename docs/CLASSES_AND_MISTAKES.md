# QuranTrack Classes & Mistakes System

## Overview

The Classes and Mistakes system is the core functionality of QuranTrack. It enables teachers to create teaching sessions (classes), assign Quran portions, and track student mistakes during recitation.

---

## Core Concepts

### Classes
A **Class** represents a teaching session (halaqah). Each class:
- Is owned by a teacher (`teacher_id`)
- Can have multiple students (group halaqah support)
- Contains one or more **assignments** (portions to recite)
- Has optional notes and performance rating
- Can be published/unpublished (visibility control)

### Assignments (Portions)
An **Assignment** is a portion of Quran assigned for a class:
- **Type**: `hifz` (new memorization), `sabqi` (recent review), `revision` (long-term manzil)
- **Range**: Start surah/ayah to end surah/ayah
- **Student-specific**: Can be assigned to all students or a specific student

### Mistakes
A **Mistake** tracks an error made by a specific student:
- **Global per student**: Mistakes persist across all classes
- **Word-level**: Entire word marked (char_index = null)
- **Character-level**: Specific letter or harakat marked (char_index = N)
- **Occurrences**: Tracks when/which class the mistake was made

---

## Database Schema

### Table: `classes`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| date | TEXT | Class date (YYYY-MM-DD) |
| day | TEXT | Day of week (Monday, Tuesday, etc.) |
| notes | TEXT | Optional teacher notes |
| performance | TEXT | Legacy field (now per-student) |
| teacher_id | INTEGER | FK to users (class owner) |
| is_published | BOOLEAN | Default false; students see only published |
| created_at | TEXT | Timestamp |
| updated_at | TEXT | Timestamp |

### Table: `class_students`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| class_id | INTEGER | FK to classes (CASCADE) |
| student_id | INTEGER | FK to users |
| performance | TEXT | Per-student performance rating |

**Unique Constraint:** `(class_id, student_id)`

### Table: `assignments`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| class_id | INTEGER | FK to classes (CASCADE) |
| type | TEXT | 'hifz', 'sabqi', or 'revision' |
| start_surah | INTEGER | Starting surah number (1-114) |
| end_surah | INTEGER | Ending surah number |
| start_ayah | INTEGER | Optional starting ayah |
| end_ayah | INTEGER | Optional ending ayah |
| student_id | INTEGER | Optional FK to users (null = all students) |

### Table: `mistakes`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| student_id | INTEGER | FK to users (which student) |
| surah_number | INTEGER | Surah where mistake occurred |
| ayah_number | INTEGER | Ayah number within surah |
| word_index | INTEGER | Word position (0-indexed) |
| word_text | TEXT | The Arabic word |
| char_index | INTEGER | Character position (null = whole word) |
| error_count | INTEGER | Times this mistake was made |
| updated_at | TEXT | Timestamp |

**Unique Constraint:** `(student_id, surah_number, ayah_number, word_index, char_index)`

### Table: `mistake_occurrences`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| mistake_id | INTEGER | FK to mistakes (CASCADE) |
| class_id | INTEGER | FK to classes (CASCADE) |
| occurred_at | TEXT | Timestamp |

---

## API Endpoints

### Class Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/classes` | Any | List classes (role-filtered) |
| GET | `/api/classes/{id}` | Any | Get single class |
| POST | `/api/classes` | Teacher | Create class |
| DELETE | `/api/classes/{id}` | Teacher | Delete class (owner only) |
| PATCH | `/api/classes/{id}/notes` | Teacher | Update notes |
| PATCH | `/api/classes/{id}/performance` | Teacher | Update legacy performance |
| PATCH | `/api/classes/{id}/student-performance` | Teacher | Update per-student performance |
| PATCH | `/api/classes/{id}/publish` | Teacher | Toggle visibility |
| POST | `/api/classes/{id}/students` | Teacher | Add students to class |
| DELETE | `/api/classes/{id}/students/{student_id}` | Teacher | Remove student |
| POST | `/api/classes/{id}/assignments` | Teacher | Add assignments |
| PATCH | `/api/assignments/{id}` | Teacher | Update assignment |

### Mistake Tracking

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/mistakes` | Any | Get mistakes (role-filtered) |
| GET | `/api/mistakes/with-occurrences` | Any | Get mistakes with class info |
| POST | `/api/mistakes` | Teacher | Record mistake |
| DELETE | `/api/mistakes/{id}` | Teacher | Remove/decrement mistake |

---

## Request/Response Examples

### Create Class
```json
POST /api/classes
{
  "date": "2025-12-14",
  "day": "Saturday",
  "notes": "Good session",
  "student_ids": [5, 7, 12],
  "assignments": [
    {
      "type": "hifz",
      "start_surah": 67,
      "end_surah": 67,
      "start_ayah": 1,
      "end_ayah": 15,
      "student_id": null
    },
    {
      "type": "sabqi",
      "start_surah": 66,
      "end_surah": 66,
      "student_id": 5
    }
  ]
}
```

### Record Mistake
```json
POST /api/mistakes
{
  "student_id": 5,
  "surah_number": 67,
  "ayah_number": 3,
  "word_index": 2,
  "word_text": "تَفَاوُتٍ",
  "char_index": null,
  "class_id": 42
}
```

### Character-Level Mistake (Harakat)
```json
POST /api/mistakes
{
  "student_id": 5,
  "surah_number": 67,
  "ayah_number": 3,
  "word_index": 2,
  "word_text": "ـَ",
  "char_index": 3,
  "class_id": 42
}
```

---

## Frontend Components

### Classroom View (`/classes/:id` or `/teacher/classes/:id`)

The main interface for conducting a class session:

#### Section Tabs
- **Hifz** (Memorization) - emerald color
- **Sabqi** (Recent Review) - blue color
- **Revision** (Manzil) - purple color

#### Portion Navigation
When a section has multiple portions, navigate between them:
```
[Portion 1: Al-Mulk (1-15)] [Portion 2: Al-Mulk (16-30)] [Edit]
```

#### Page-Based Quran Display
- Uses **Madani Mushaf** page mapping (604 pages)
- Shows one page at a time
- RTL navigation (Next on left, Previous on right)
- Multi-surah pages supported (Juz Amma)

#### Mushaf Page Styling
- White background (like real paper)
- Green border (emerald-600)
- Uthmani font (Amiri Quran)
- No scrolling - content expands naturally

#### Mistake Interaction (Teachers Only)
- **Click word**: Opens popup to select whole word, letter, or harakat
- **Right-click word**: Removes/decrements mistake
- **Color coding** by frequency:
  | Count | Color | CSS Class |
  |-------|-------|-----------|
  | 1x | Amber | `mistake-1` |
  | 2x | Blue | `mistake-2` |
  | 3x | Orange | `mistake-3` |
  | 4x | Purple | `mistake-4` |
  | 5x+ | Red | `mistake-5` |

#### Character-Level Mistake Rendering
When a word has character-level mistakes (letter or harakat), it switches to Uthmani text rendering with colored highlighting:

- **Letter mistake** (`letter-mistake-X`): Background highlight on letter + its harakat
  - Uses gradient background + bottom border (same style as whole-word mistakes)
  - Harakat attached to the letter are included in the highlight

- **Harakat mistake** (`haraka-mistake-X`): Color change on letter + harakat together
  - Uses text color change only (no background)
  - Both the base letter and its harakat are colored together

**CSS Classes:**
```css
/* Whole word / Letter mistakes - background highlight */
.mistake-1, .letter-mistake-1 {
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.3) 0%, rgba(251, 191, 36, 0.2) 100%);
  border-bottom: 2px solid #f59e0b;
  border-radius: 4px;
  padding: 0 2px;
}

/* Harakat mistakes - text color only */
.haraka-mistake-1 {
  color: #d97706 !important;
}
```

**Rendering Logic (Classroom.tsx):**
1. Split word into groups (base letter + its following harakat)
2. Check if any harakat in group has a mistake → use `haraka-mistake-X` (colors both)
3. Check if base letter has a mistake → use `letter-mistake-X` (highlights both)
4. No mistake → render plain text

#### Mistake Summary Sections
Displayed below Quran text with two separate cards:

1. **"Mistakes in this class"** (Green border, emerald header)
   - Shows mistakes where any occurrence has `class_id === currentClassId`
   - These are mistakes recorded during the current session
   - Count shows number of unique mistakes in this class

2. **"Mistakes from previous classes"** (Gray border, slate header)
   - Shows mistakes where any occurrence has `class_id !== currentClassId`
   - Historical mistakes made in earlier classes
   - Count shows number of unique mistakes from previous sessions

**Important:** A mistake can appear in BOTH sections if it was made in a previous class AND again in the current class. The `error_count` displays the total across all occurrences.

**Implementation:**
```typescript
// Mistakes that occurred in THIS class
const mistakesInThisClass = currentMistakes.filter(m =>
  m.occurrences?.some(o => o.class_id === currentClassId)
);

// Mistakes that have ANY occurrence in a PREVIOUS class
const mistakesFromPrevious = currentMistakes.filter(m =>
  m.occurrences?.some(o => o.class_id !== currentClassId)
);
```

---

## Page Mapping System

### Madani Mushaf Pages
The app uses standard Madani mushaf page numbers (1-604).

**Key File:** `quran_frontend/src/data/quranPages.ts`

```typescript
// Array of [surah, ayah] pairs marking page starts
export const pageStarts: [number, number][] = [
  [1, 1],   // Page 1: Al-Fatihah
  [2, 1],   // Page 2: Al-Baqarah starts
  // ... 604 entries total
];

// Get page number for any surah:ayah
export function getPageNumber(surahNumber: number, ayahNumber: number): number;

// Get all surahs that appear on a page
export function getSurahsOnPage(pageNumber: number): number[];

// Get ayah range for a page
export function getPageRange(pageNumber: number): {
  startSurah, startAyah, endSurah, endAyah
};
```

### Multi-Surah Pages
Short surahs in Juz Amma share pages. Example page 603:
- Al-Kafirun (109)
- An-Nasr (110)
- Al-Masad (111)

The system loads all surahs on a page in parallel and displays them with proper headers.

---

## Performance Rating System

### Per-Student Performance
Each student in a class can receive an individual rating:

| Rating | Color | Use Case |
|--------|-------|----------|
| Excellent | Emerald | Outstanding recitation |
| Very Good | Teal | Above expectations |
| Good | Amber | Met expectations |
| Needs Work | Red | Below expectations |

### UI Implementation
- Dropdown in class header (teacher view)
- Stored in `class_students.performance`
- Displayed in Classes table

---

## Mistake Tracking Flow

### Recording a Mistake
```
1. Teacher clicks word in Quran display
2. Popup shows: [Whole Word] [Letters] [Harakat]
3. Teacher selects mistake type
4. API call: POST /api/mistakes
5. Backend checks if mistake exists for student
   - Exists: INCREMENT error_count
   - New: INSERT with error_count = 1
6. INSERT into mistake_occurrences (links to class)
7. Frontend reloads mistakes, word highlights
```

### Removing a Mistake
```
1. Teacher right-clicks highlighted word
2. API call: DELETE /api/mistakes/{id}
3. Backend:
   - If error_count > 1: DECREMENT
   - If error_count = 1: DELETE row
   - DELETE most recent occurrence
4. Frontend reloads, highlight removed/updated
```

---

## Arabic Text Handling

### Harakat (Diacritical Marks)
Unicode ranges for Arabic diacritics:
```typescript
const HARAKAT = [
  '\u064B', // Fathatan ً
  '\u064C', // Dammatan ٌ
  '\u064D', // Kasratan ٍ
  '\u064E', // Fatha َ
  '\u064F', // Damma ُ
  '\u0650', // Kasra ِ
  '\u0651', // Shadda ّ
  '\u0652', // Sukun ْ
  // ... more marks
];
```

### Word Splitting
For character-level mistakes, words are split into:
1. **Base letters** - Consonants and long vowels
2. **Harakat** - Short vowels, shadda, sukun

Shadda + following vowel are grouped as single unit.

### Bismillah Handling
- Surah 1 (Fatihah): Bismillah is ayah 1
- Surah 9 (Tawbah): No Bismillah
- All others: Bismillah stripped from first ayah display, shown separately

---

## Frontend State Management

### Key State Variables (Classroom.tsx)
```typescript
// Class data
const [classData, setClassData] = useState<ClassData | null>(null);
const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

// Section navigation
const [activeSection, setActiveSection] = useState<SectionType>('hifz');
const [selectedPortionIndex, setSelectedPortionIndex] = useState<number>(0);

// Page navigation
const [currentPage, setCurrentPage] = useState<number>(560);
const [pageSurahsData, setPageSurahsData] = useState<Map<number, SurahData>>(new Map());

// Mistakes
const [mistakes, setMistakes] = useState<Mistake[]>([]);

// Word popup for mistake selection
const [wordPopup, setWordPopup] = useState<WordPopupState | null>(null);
```

---

## Privacy & Access Control

### Teachers Can:
- Create/edit/delete their own classes
- Add students from their roster to classes
- Record mistakes for any student in their roster
- View any student's mistakes
- Toggle class publish status

### Students Can:
- View published classes they're enrolled in
- View their own mistakes only
- Cannot see other students or their mistakes
- Cannot mark mistakes (read-only view)

### Enforcement
- Backend checks `teacher_id` matches for class operations
- Backend checks `teacher_student_relationships` for student access
- Backend filters mistakes by `student_id` for students

---

## Related Documentation

- [AUTH_SYSTEM.md](./AUTH_SYSTEM.md) - Authentication and user roles
- [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md) - Full technical overview
- [PROJECT_CHANGELOG.md](./PROJECT_CHANGELOG.md) - Development history

---

*Last Updated: December 16, 2025*
