# QuranTrack - Project Changelog

A chronological record of what has been built. This is the main reference guide for the project.

---

## Documentation Directory

```
docs/
├── PROJECT_CHANGELOG.md                    # This file - main reference guide
│
├── Architecture/                           # High-level design & planning docs
│   ├── QuranTrack Academy_ Architecture Blueprint.md
│   ├── Logical Architecture Blueprint_ User Identity & Relationships.md
│   └── Quran Full App.md
│
├── Technical Implementation Journey/       # How features were built
│   ├── TECHNICAL_DOCUMENTATION.md          # Full technical overview
│   ├── AUTH_SYSTEM.md                      # Authentication & user roles
│   ├── CLASSES_AND_MISTAKES.md             # Classes, assignments, mistakes
│   └── QPC_QURAN_RENDERING.md              # QPC font rendering system
│
└── Guides/                                 # For AI/developers - troubleshooting
    ├── FONT_OVERFLOW_FIX_GUIDE.md          # Fixing font overflow issues
    └── PAGE_LAYOUT_FIX_GUIDE.md            # Fixing page layout issues
```

### What's in each folder:

| Folder | Purpose | Audience |
|--------|---------|----------|
| **Architecture/** | System design, blueprints, planning | Planning phase |
| **Technical Implementation Journey/** | How things were actually built, API docs | Developers |
| **Guides/** | Troubleshooting guides for specific issues | AI assistants, developers |

---

## Phase 1: Foundation

**Status:** Complete

- Core Quran Reader with Arabic text display
- Mistake tracking (tap to mark, frequency tracked)
- Class session recording
- Practice mode with mistake highlights
- Dark theme UI (emerald/teal on slate)

**Stack:** React + TypeScript frontend, FastAPI backend, Flutter mobile

See: [TECHNICAL_DOCUMENTATION.md](./Technical%20Implementation%20Journey/TECHNICAL_DOCUMENTATION.md)

---

## Phase 2: Multi-User Expansion

**Status:** Complete

### Authentication System
- JWT-based authentication (access + refresh tokens)
- Role selection at signup (Teacher or Student)
- Teacher accounts verified immediately on signup
- Student accounts with "Verified Student" status
- Login with email or username
- User profile dropdown with logout
- Clickable Student ID (copy to clipboard)
- "Upgrade to Teacher" option (Pro - not yet implemented)

### User & Student Management
- Unique Student ID generation (`STU-XXXXXX` format)
- Teacher can lookup students by ID
- Teacher can add/remove students from roster
- Students can see their teachers

### Frontend Views
- Teacher Dashboard (`/teacher`) - real API data
- Student Dashboard (`/student`) - real API data
- Teacher Classes list (`/teacher/classes`) - real API data
- Student Classes list (`/student/classes`) - real API data
- Teacher Classroom (`/teacher/classes/:id`)
- Student Classroom read-only (`/student/classes/:id`)
- Role switcher in navigation (for verified teachers)
- Protected routes requiring authentication

### Admin Features
- Clear all data endpoint (`DELETE /api/admin/clear-data`)

See: [AUTH_SYSTEM.md](./Technical%20Implementation%20Journey/AUTH_SYSTEM.md)

---

## Phase 3: Classes & Mistakes Multi-User Integration

**Status:** Complete

### Class Ownership & Visibility
- Teachers own classes (`teacher_id` foreign key)
- Classes support multiple students (group halaqah) via `class_students` junction table
- Classes hidden by default (`is_published = false`)
- Students only see published classes they're part of
- Teachers can toggle publish status per class

### Student-Specific Mistakes
- Mistakes now belong to specific students (`student_id` foreign key)
- Teachers record mistakes for individual students during class
- Students can only view their own mistakes (privacy enforced)
- Same word can be a mistake for different students

### New API Endpoints
- `PATCH /api/classes/{id}/publish` - Toggle class visibility
- `POST /api/classes/{id}/students` - Add students to class
- `DELETE /api/classes/{id}/students/{student_id}` - Remove student from class
- All class/mistake endpoints now require authentication
- Role-based filtering (teachers see their classes, students see published classes)

### Frontend Updates
- TeacherClasses: Student selection when creating class, publish toggle
- StudentClasses: Shows only published classes student is part of
- Teachers see which students attended each class
- Privacy: Students never see other students in class or their mistakes

See: [AUTH_SYSTEM.md](./Technical%20Implementation%20Journey/AUTH_SYSTEM.md), [CLASSES_AND_MISTAKES.md](./Technical%20Implementation%20Journey/CLASSES_AND_MISTAKES.md)

---

## Phase 4: Mushaf-Style Quran Display

**Status:** Complete

### Page-Based Navigation
- Madani Mushaf page mapping (604 pages)
- One page displayed at a time (no endless scrolling)
- RTL navigation (Next on left, Previous on right for Arabic)
- Multi-surah page support (Juz Amma short surahs)

### Mushaf Styling
- White background (like real mushaf paper)
- Green border (emerald-600)
- Uthmani fonts (Amiri Quran, Scheherazade New)
- Arabic-only surah headers (removed English)

### Per-Student Portions
- Teachers can assign different portions to different students
- Page-based portion selector in class creation
- Student-specific assignments stored with `student_id`

### Per-Student Performance
- Individual performance rating per student per class
- Stored in `class_students.performance` junction table
- Dropdown selector in teacher classroom view

See: [CLASSES_AND_MISTAKES.md](./Technical%20Implementation%20Journey/CLASSES_AND_MISTAKES.md)

---

## Phase 5: QPC Font Rendering & Page Layout Fixes

**Status:** Complete

### QPC (Quran Printing Complex) Fonts
- Page-specific fonts from King Fahd Glorious Quran Printing Complex
- 604 individual font files (QCF_PXXX.woff2) - one per page
- Glyph codes from Quran.com API v4 (code_v1 field)
- Renders exactly like printed Madina Mushaf
- Data source: `https://api.quran.com/api/v4/verses/by_page/{page}?words=true`
- Font source: `https://github.com/mustafa0x/qpc-fonts` (mushaf-woff2)

### Page Layout Fixes
- Fixed line number issues on 20+ pages where ayahs appeared at wrong position
- Pages fixed: 144, 534, 565, 568, 570, 576, 584-599
- Line numbers in JSON control vertical position (`l` field: 0=top, 15=bottom, 16-18=overflow)
- Pattern: Overflow ayahs moved from top (line 1-3) to bottom (line 16-18)

### Font Overflow Fix (Page 586)
- Some ayahs have glyph codes (>= 0xFC00) belonging to previous page's font
- Solution: Load both current AND previous page fonts
- Apply previous page font to overflow glyphs in QuranReader.tsx

### Display Improvements
- Aspect ratio 14/20 (matching real Mushaf proportions)
- Max width 645px for page container
- Font size: `clamp(16px, 3.5vw, 28px)` for most pages
- Fixed text clipping by changing overflow:hidden to overflow:visible
- Content padding: 5% top/bottom, 3% left/right

### Decorative Border (Optional)
- Border.png image with transparent center
- Can be overlaid on mushaf page
- Currently disabled but asset available in src/assets/

See: [FONT_OVERFLOW_FIX_GUIDE.md](./Guides/FONT_OVERFLOW_FIX_GUIDE.md), [QPC_QURAN_RENDERING.md](./Technical%20Implementation%20Journey/QPC_QURAN_RENDERING.md)

---

## Phase 6: Character-Level Mistake Tracking & Classroom Improvements

**Status:** Complete

### Character-Level Mistakes
- Click word to open popup with: Whole Word, Letters, Harakat options
- Letters and harakat displayed separately for precise marking
- Shadda + following vowel grouped together
- Mistakes stored with `char_index` (null = whole word, N = specific character)

### Mistake Rendering Styles
- **Whole word mistakes** (`mistake-X`): Background gradient + bottom border
- **Letter mistakes** (`letter-mistake-X`): Same style as whole word (background highlight)
- **Harakat mistakes** (`haraka-mistake-X`): Text color change only (no background)
- Color levels: 1x amber, 2x blue, 3x orange, 4x purple, 5x+ red

### Mistake Summary Sections
- **"Mistakes in this class"**: Shows mistakes with occurrences in current class (green border)
- **"Mistakes from previous classes"**: Shows mistakes with occurrences in other classes (gray border)
- Same mistake can appear in BOTH sections if made in multiple classes
- Count shows total error_count across all occurrences

### Classroom UI Updates
- Matches QuranReader styling (aspect ratio, font size, padding)
- Mushaf page container with proper proportions
- Character-level mistake popup with letter/harakat selection

See: [CLASSES_AND_MISTAKES.md](./Technical%20Implementation%20Journey/CLASSES_AND_MISTAKES.md)

---

## Phase 7: Quran Reader Enhancements & Portion Highlighting

**Status:** Complete

### Surah Dropdown Navigation
- Added surah dropdown selector next to page number input
- Lists all 114 surahs with Arabic names
- Selecting a surah navigates to its first page
- Uses `getPageNumber(surahNum, 1)` for page lookup

### Surah Headers & Bismillah Display
- **Surah headers** shown when a new surah starts on the page
  - Displays "سُورَةُ [name]" (e.g., "سُورَةُ البقرة")
  - Styled with emerald border and cream background
  - Uses Amiri font for proper Arabic rendering
- **Bismillah** shown below surah header for surahs 2-114
  - Displays "بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ"
  - Surah 1 (Al-Fatihah): No separate bismillah (it's already ayah 1)
  - Surah 9 (At-Tawbah): No bismillah (unique exception)
- Headers are rendered ABOVE existing lines - no words replaced

### Classroom Portion Highlighting
- Words outside assigned portion are dimmed (opacity 0.25, slight blur)
- Only words within the assigned surah/ayah range are fully visible and clickable
- `isWordInPortion()` function checks if word falls within assignment range
- Prevents accidental mistake marking on unassigned ayahs

### Demo Users on Login Page
- Added clickable buttons for all 17 demo accounts
- Auto-fills email and password on click
- Organized by role: Personal, Teachers, Students
- Color-coded: Purple (personal), Emerald (teachers), Blue (students)

See: [CLASSES_AND_MISTAKES.md](./Technical%20Implementation%20Journey/CLASSES_AND_MISTAKES.md)

---

## Running the Project

**Backend:**
```bash
cd quran_backend
pip install -r requirements.txt
python main.py
```

**Frontend:**
```bash
cd quran_frontend
npm install
npm run dev
```

**Mobile:**
```bash
cd quran_mobile
flutter run
```

**Clear All Data (PowerShell):**
```powershell
Invoke-RestMethod -Method DELETE -Uri http://localhost:8000/api/admin/clear-data
```
