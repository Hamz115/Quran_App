# QuranTrack - Project Changelog

A chronological record of what has been built. This is the main reference guide for the project.

---

## Documentation Directory

```
docs/
├── PROJECT_CHANGELOG.md                    # This file - main reference guide
│
├── Architecture/                           # High-level design & planning docs
│   ├── QuranTrack_Academy_Architecture_Blueprint.md
│   ├── Logical_Architecture_Blueprint_User_Identity_And_Relationships.md
│   ├── Quran_Full_App.md
│   └── Supabase_Migration_Architecture.md  # Supabase cloud migration design
│
├── Technical Implementation Journey/       # How features were built
│   ├── Technical_Documentation.md          # Full technical overview
│   ├── Auth_System.md                      # Authentication & user roles
│   ├── Classes_And_Mistakes.md             # Classes, assignments, mistakes
│   ├── Qpc_Quran_Rendering.md              # QPC font rendering system
│   ├── Test_System.md                      # Test classes and scoring
│   ├── Supabase Implementation/            # Supabase cloud setup
│   │   ├── Implementation_Journey.md       # Step-by-step setup record
│   │   ├── Supabase_Reference.md           # Full schema & policy reference
│   │   └── Supabase_Frontend_Integration_Reference.md  # Frontend integration code
│   ├── Flutter App Overhaul/               # Flutter mobile app UI redesign
│   │   ├── 00-OVERVIEW.md                  # Summary of all changes
│   │   ├── 01-THEME-SYSTEM.md              # Theme implementation
│   │   ├── 02-AUTHENTICATION.md            # Supabase auth integration
│   │   ├── 03-NAVIGATION.md                # Role-based navigation
│   │   ├── 04-SCREENS.md                   # Screen updates
│   │   ├── 05-SHARED-WIDGETS.md            # Reusable widgets
│   │   └── 06-QURAN-READER.md              # QPC page-based reader rewrite
│   ├── Settings_Password_Reset.md          # Settings page & password reset flow
│   └── Quran Reader/                       # Web Quran Reader rendering docs
│       ├── WEB-READER-RENDERING-ISSUES.md  # All rendering fixes & approaches
│       └── FLUTTER-RENDERING-REFERENCE.md  # Flutter rendering gold standard
│
└── Guides/                                 # For AI/developers - troubleshooting
    ├── Font_Overflow_Fix_Guide.md          # Fixing font overflow issues
    ├── Page_Layout_Fix_Guide.md            # Fixing page layout issues
    └── Seeding_Database.md                 # Database seeding script guide
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

See: [Technical_Documentation.md](./Technical%20Implementation%20Journey/Technical_Documentation.md)

---

## Phase 2: Multi-User Expansion

**Status:** Complete

### Authentication System
- JWT-based authentication (access + refresh tokens)
- Role selection at signup (Teacher or Student)
- Teacher accounts verified immediately on signup
- Student accounts with "Verified Student" status
- Login with email or username **[Superseded in Phase 12 — login is now email-only via Supabase Auth]**
- User profile dropdown with logout
- Clickable Student ID (copy to clipboard) **[Superseded in Phase 12 — Student IDs (STU-XXXXXX) replaced by Supabase UUIDs; frontend now shows clickable email with copy-to-clipboard instead]**
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

See: [Auth_System.md](./Technical%20Implementation%20Journey/Auth_System.md)

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

See: [Auth_System.md](./Technical%20Implementation%20Journey/Auth_System.md), [Classes_And_Mistakes.md](./Technical%20Implementation%20Journey/Classes_And_Mistakes.md)

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

See: [Classes_And_Mistakes.md](./Technical%20Implementation%20Journey/Classes_And_Mistakes.md)

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

See: [Font_Overflow_Fix_Guide.md](./Guides/Font_Overflow_Fix_Guide.md), [Qpc_Quran_Rendering.md](./Technical%20Implementation%20Journey/Qpc_Quran_Rendering.md)

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

See: [Classes_And_Mistakes.md](./Technical%20Implementation%20Journey/Classes_And_Mistakes.md)

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

See: [Classes_And_Mistakes.md](./Technical%20Implementation%20Journey/Classes_And_Mistakes.md)

---

## Phase 8: Test Classes

**Status:** Complete

### Test Class Type
- New class type: "Test" (alongside "Regular")
- Single student per test (enforced in UI and backend)
- Single test portion (no Hifz/Sabqi/Revision tabs)
- Test record auto-created when test class is created

### Database Schema
- Added `class_type` column to `classes` table (`'regular'` | `'test'`)
- New `tests` table: Test metadata, status, scores
- New `test_questions` table: Individual questions with ayah ranges
- New `test_mistakes` table: Mistakes with scoring info, including `is_tanbeeh` column

### Scoring System (Out of 100)

**The test is always scored out of 100 points.**
- Start with **100 points**
- **Deduct points** for each mistake
- **Final Score = 100 - Total Deductions** (minimum 0)

| Mistake Type | Previous Errors | Points Deducted |
|-------------|-----------------|-----------------|
| **Tanbeeh (تنبيه)** | Any | **-0.5** |
| **Full Mistake** | 0 (new) | **-1.0** |
| **Full Mistake** | 1 | **-2.0** |
| **Full Mistake** | 2 | **-3.0** |
| **Full Mistake** | 3 | **-4.0** |
| **Full Mistake** | 4+ | **-5.0** (capped) |

**Tanbeeh (تنبيه)**: Teacher warning where student self-corrects. Only -0.5 points regardless of history.

### Test Flow
1. Teacher creates test class (single student, single portion)
2. Teacher starts test → status: `in_progress`
3. Question loop:
   - Start question (click ayah marker for start point)
   - Mark mistakes:
     - Click word → "Mark Full Mistake" or select letter/harakat
     - Click "Tanbeeh (تنبيه)" for teacher warnings
   - End question (click ayah marker for end point)
4. End test → Final score = 100 - total deductions

### New API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/classes/{id}/test` | Get test for class |
| PATCH | `/api/tests/{id}/start` | Start test |
| PATCH | `/api/tests/{id}/complete` | Complete test |
| POST | `/api/tests/{id}/questions/start` | Start question |
| PATCH | `/api/tests/{id}/questions/{qid}/end` | End question |
| PATCH | `/api/tests/{id}/questions/{qid}/cancel` | Cancel question |
| POST | `/api/tests/{id}/mistakes` | Record test mistake (with is_tanbeeh) |

### Frontend Updates
- **TeacherClasses.tsx**: Class type toggle (Regular/Test)
- **Classes table**: Cyan "TEST" badge for test classes
- **Classroom.tsx**:
  - Test Control Panel (replaces section tabs)
  - Test Results view with percentage score
  - Per-question breakdown with mistake details
  - Tanbeeh button in word popup
  - Shows mistake location (surah:ayah) in results

### Bug Fixes
- Fixed "0" characters appearing in results (Quranic pause marks + React integer rendering)
- Fixed scoring to be deduction-based (100 - deductions) instead of per-question scores
- Fixed SQLite boolean handling (use `=== 1` instead of truthy checks)

### Global Mistake Integration
- Test mistakes also create/update global mistake records
- Repeated mistakes checked against global history
- Tanbeeh does NOT increment global error_count
- Ensures accountability across regular classes and tests

See: [Test_System.md](./Technical%20Implementation%20Journey/Test_System.md)

---

## Phase 9: UI Improvements & Smart Suggestions

**Status:** Complete

### Teacher Classes Card Layout
- Redesigned from compact table to card-based layout
- Each class shown as a card with header (week, date, day, status)
- Each student displayed with portions on separate rows (Hifz, Sabqi, Manzil)
- Better visual hierarchy and readability

### Smart Portion Suggestions
- Automatic portion recommendations based on student progress
- **Hifz**: Continues from where student left off in last class
- **Sabqi**: Last class's Hifz becomes new Sabqi
- **Manzil**: Continues cycling through memorized surahs
- New endpoint: `GET /api/students/{student_id}/suggested-portions`
- Smart Suggestions Panel in new class modal (Step 2)

### Test Mode Improvements
- Live mistake summary during test questions
- Current question mistakes displayed in real-time
- Completed questions summary with per-question breakdown
- Tanbeeh no longer highlights words globally (only shows in test results)

### UI Fixes
- Performance dropdown shows "Excellent/Very Good/Good/Needs Work" (not letter grades)
- Manzil column text no longer wraps to two lines
- Mistakes from previous classes grouped by day (Saturday, Wednesday, etc.)

See: [Classes_And_Mistakes.md](./Technical%20Implementation%20Journey/Classes_And_Mistakes.md)

---

## Phase 10: Harakat Highlighting Enhancement

**Status:** Complete

### Harakat-Only Highlighting with Glow Effect
- **Problem:** Previous harakat highlighting colored both the base letter AND the harakat together, making it unclear which specific mark had the error
- **Solution:** Harakat (diacritical marks) are now highlighted SEPARATELY from the base letter
- **Visual Effect:** Bright color + multi-layer text-shadow glow creates a visible halo around the harakat only

### CSS Implementation
- Bright amber/yellow color (#fbbf24) for harakat text
- Larger font-size (1.3em) to make small diacritical marks visible
- Bold font-weight for better visibility
- Multi-layer text-shadow glow effect:
  - White inner glow (0 0 3px #fff)
  - Yellow outer glow (0 0 6-20px amber colors)
- No background-color (which would create vertical lines due to zero-width combining characters)

### React Rendering Logic Update
- Base letter rendered as plain text (no styling)
- Only the harakat span receives the `haraka-mistake-X` class
- Structure: `<span>ك<span class="haraka-mistake-1">َ</span></span>`
- This ensures the glow only appears around the diacritical mark

### Why Glow Instead of Background
- Harakat are combining characters with zero width but full line-height
- Using `background-color` on harakat creates an ugly vertical bar
- Using `text-shadow` glow creates a visible highlight around the harakat shape only
- The glow effect is visually appealing and clearly indicates the mistake location

### Uthmani Text Alignment
When a word has character-level mistakes, it renders using Uthmani Unicode text instead of QPC glyphs. To ensure visual alignment:
- **fontSize**: 0.85em (matches QPC glyph size)
- **fontWeight**: 400 (normal, matching QPC rendering)
- **top**: -0.3em (relative positioning to align baselines)
- QPC and Uthmani fonts have different vertical positioning, so the offset is required

### Student Classes UI Redesign
The Student "My Classes" page was completely redesigned to match the Teacher Classes view:

**Old Design (Table Layout):**
- Simple table with columns: Week, Date, Day, Hifz, Sabqi, Manzil, Performance, Notes
- Cramped layout, no visual hierarchy
- No mistake counts displayed

**New Design (Card Layout):**
- Month grouping header with class count
- Individual class cards with:
  - Week badge (W1, W2, etc.)
  - Date, day, and teacher name
  - Performance badge (Excellent/Very Good/Good/Needs Work)
- Each portion type on its own colored row:
  - **HIFZ** - Emerald green
  - **SABQI** - Cyan
  - **MANZIL** - Gray
- Mistake counts per portion (read-only)
- Notes preview with modal for full text
- Hover effects and clickable cards

### Backend Changes for Student View
- API now returns `mistake_counts` object for students (previously only for teachers)
- API now returns student's `performance` rating from `class_students` table
- Mistake counts computed per portion type (hifz, sabqi, revision)

See: [Classes_And_Mistakes.md](./Technical%20Implementation%20Journey/Classes_And_Mistakes.md)

---

## Phase 11: Database Seeding

**Status:** Complete

### Seeding Script
- Created `seed_database.py` for populating test data
- Generates ~57 weeks of realistic class data (Dec 2025 - Dec 2026)
- Creates classes, assignments, mistakes, and teacher-student relationships

### Data Configuration
- 6 teachers with assigned students (11 students total)
- Mix of group and individual classes
- 2 class days per week per teacher

### Teacher Assignments
| Teacher | Days | Students |
|---------|------|----------|
| Hamza Feroze | Sat, Wed | Hamza Reyal |
| Abdullah Qureshi | Mon, Thu | Ahmed, Yusuf, Omar |
| Tariq Jameel | Tue, Sat | Ibrahim, Bilal |
| Usman Farooq | Sun, Wed | Khalid, Zayd |
| Maryam Siddiqui | Mon, Fri | Mustafa, Fatima |
| Khadijah Noor | Tue, Thu | Aisha |

### Student Progression
- Each student memorizes 1 page per class (Hifz)
- Sabqi: 3 pages (recent review)
- Manzil: 10 pages (cycling revision)
- Different starting points: some from Juz Amma (backwards), some from beginning (forwards), some from middle

### Realistic Features
- **Performance distribution**: 35% Excellent, 40% Very Good, 23% Good, 2% Needs Work
- **Mistake percentage based on performance**: Excellent (0-10%), Very Good (10-20%), Good (20-30%), Needs Work (30-50%)
- **Mistake types**: 70% whole word, 20% letter, 10% harakat
- **Repeated mistakes tracked**: Same mistake in multiple classes increments error_count
- **Contextual teacher notes**: Every class has notes based on performance level

### Data Volume
| Table | Approximate Rows |
|-------|------------------|
| classes | ~672 |
| class_students | ~900 |
| assignments | ~2,700 |
| mistakes | ~5,000-8,000 |
| mistake_occurrences | ~12,000-18,000 |

See: [Seeding_Database.md](./Guides/Seeding_Database.md)

---

## Phase 11.1: Bug Fixes & UI Improvements

**Status:** Complete

### Bug Fixes
- **word_index off by one**: JSON `p` field is 1-based, frontend expects 0-based. Fixed in seeding script.
- **char_index for whole word mistakes**: Changed from `-1` to `null` so frontend correctly identifies whole word mistakes and renders with QPC glyphs (not Uthmani text).
- **"Classes This Week" calculation**: Added missing upper bound (`<= endOfWeek`) to date filter in TeacherDashboard.

### UI Improvements
- **Month filtering for StudentClasses**: Added month tabs (same as TeacherClasses) so students can filter classes by month instead of scrolling through all.
- **Complete surah names**: Added all 114 surah names to StudentClasses, TeacherClasses, and StudentDashboard. Now displays "Ya-Sin" instead of "Surah 36", "Ar-Rahman" instead of "Surah 55", etc.

### Files Modified
- `quran_backend/seed_database.py` - word_index and char_index fixes
- `quran_frontend/src/pages/TeacherDashboard.tsx` - Classes This Week fix
- `quran_frontend/src/pages/StudentClasses.tsx` - Month filtering, complete surah names
- `quran_frontend/src/pages/TeacherClasses.tsx` - Complete surah names
- `quran_frontend/src/pages/StudentDashboard.tsx` - Complete surah names

---

## Phase 12: Supabase Cloud Migration

**Status:** In Progress

### 18 January 2026 - Architecture Planning

Discussed the need for cloud sync to enable students to connect from anywhere (not just same WiFi network).

**Problem Identified:**
- Current FastAPI + SQLite setup only works on local network
- Students cannot sync from home or school
- Need a cost-effective cloud solution

**Options Evaluated:**
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Traditional Cloud DB | Full control | Expensive, requires server maintenance | ❌ |
| S3 + Tiny Server | Cheap storage | Still needs server code | ❌ |
| Google Drive | Free | Complex OAuth, not designed for DB | ❌ |
| **Supabase** | Free tier, built-in auth, realtime, auto-API | None significant | ✅ Chosen |

**Architecture Document Created:**
- [Supabase_Migration_Architecture.md](./Architecture/Supabase_Migration_Architecture.md)

---

### 19 January 2026 - Database Setup

Set up Supabase project and created all database objects.

**Supabase Project:**
- Project ID: `qwfnbkkegbhwxxjvyhzl`
- Region: Asia Pacific
- API keys stored securely by Hamza

**Database Tables Created (7):**
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends auth.users) |
| `teacher_students` | Teacher-student relationships |
| `classes` | Class sessions |
| `class_students` | Students in each class |
| `assignments` | Hifz, Sabqi, Revision portions |
| `mistakes` | Global mistakes per student |
| `mistake_occurrences` | When mistakes occurred |

**Row Level Security (RLS):**
- Enabled on all 7 tables
- 14 security policies created
- Security Advisor: 0 errors, 0 warnings

**Database Triggers Created (4):**
- `on_auth_user_created` - Auto-create profile on signup
- `update_profiles_updated_at` - Auto-update timestamp
- `update_classes_updated_at` - Auto-update timestamp
- `update_mistakes_updated_at` - Auto-update timestamp

**Database Functions Created (3):**
- `handle_new_user()` - Creates profile from auth signup
- `update_updated_at()` - Updates timestamp on row changes
- `is_class_teacher(uuid)` - Check class ownership (SECURITY DEFINER, bypasses RLS)

**Saved SQL Queries in Supabase:**
1. QuranTrack Supabase Schema
2. QuranTrack Row-Level Security Policies
3. Auto-create Profiles & Update Timestamps

See: [Implementation_Journey.md](./Technical%20Implementation%20Journey/Supabase%20Implementation/Implementation_Journey.md), [Supabase_Reference.md](./Technical%20Implementation%20Journey/Supabase%20Implementation/Supabase_Reference.md)

---

### 19 January 2026 - Frontend Integration

Integrated Supabase into the React frontend.

**Package Installed:**
- `@supabase/supabase-js` - Supabase JavaScript client

**New Files Created:**
| File | Purpose |
|------|---------|
| `.env.local` | Supabase credentials (not committed) |
| `.env.example` | Template for credentials |
| `src/lib/supabase.ts` | Supabase client initialization |
| `src/lib/database.types.ts` | TypeScript types for Supabase tables |
| `src/lib/supabase-api.ts` | Student, class, mistake API functions |
| `src/lib/quran-api.ts` | Local Quran data API (FastAPI) |

**Files Modified:**
| File | Changes |
|------|---------|
| `AuthContext.tsx` | Complete rewrite for Supabase Auth |
| `Login.tsx` | Email-only login (no username) |
| `types/index.ts` | Changed IDs from `number` to `string` (UUIDs) |
| `api.ts` | Facade re-exporting from new modules |

**Migration Status:**
| Component | Status |
|-----------|--------|
| Authentication | ✅ Migrated to Supabase Auth |
| Students API | ✅ Migrated to Supabase |
| Classes API | ✅ Migrated to Supabase |
| Mistakes API | ✅ Migrated to Supabase |
| Quran Data | ⏸️ Stays with local FastAPI |
| Tests API | ⏸️ Still uses FastAPI |
| Backup API | ⏸️ Still uses FastAPI |

**Architecture:**
- **Supabase** handles: Auth, profiles, teacher-student relationships, classes, mistakes
- **FastAPI** handles: Quran text data (quran.db), page JSON files, QPC fonts
- **Hybrid approach** allows cloud sync for user data while keeping Quran data local

See: [Supabase_Frontend_Integration_Reference.md](./Technical%20Implementation%20Journey/Supabase%20Implementation/Supabase_Frontend_Integration_Reference.md)

---

### 20 January 2026 - RLS Infinite Recursion Fix

During testing, discovered and fixed a critical RLS policy bug.

**Problem:**
- App stuck on "Loading..." screen after login
- Console error: `"infinite recursion detected in policy for relation 'class_students'"`

**Root Cause:**
Circular dependency between two RLS policies:
1. `classes` policy queried `class_students` table
2. `class_students` policy queried `classes` table
→ Infinite recursion loop

**Solution:**
Created a `SECURITY DEFINER` function to break the cycle:

```sql
-- Function bypasses RLS to check class ownership
CREATE OR REPLACE FUNCTION public.is_class_teacher(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = p_class_id
    AND teacher_id = auth.uid()
  )
$$;

-- New policy uses function instead of subquery
CREATE POLICY "Teachers can manage class students"
ON public.class_students FOR ALL
USING (public.is_class_teacher(class_id));
```

**New Database Function:**
| Function | Purpose |
|----------|---------|
| `is_class_teacher(uuid)` | Check class ownership without triggering RLS |

**Testing Results:**
- ✅ Login successful
- ✅ Auth state changes properly (INITIAL_SESSION → SIGNED_IN)
- ✅ Dashboard loads correctly
- ✅ No RLS recursion errors

See: [Implementation_Journey.md](./Technical%20Implementation%20Journey/Supabase%20Implementation/Implementation_Journey.md)

### 20 January 2026 - Race Condition Fix

Fixed a race condition causing app to freeze when navigating quickly between pages.

**Problem:** Clicking rapidly between pages (My Classes → My Dashboard) caused infinite loading state.

**Cause:** API calls continued after component unmount, corrupting state.

**Solution:** Added `isMounted` cleanup pattern to all page components:
- `StudentDashboard.tsx`
- `StudentClasses.tsx`
- `TeacherDashboard.tsx`
- `TeacherClasses.tsx`

### 20 January 2026 - localStorage Corruption Fix

Fixed critical issue where Supabase client hung indefinitely on `getSession()`.

**Problem:** App stuck on "Loading..." forever despite valid session token in localStorage.

**Diagnosis:**
1. Fresh Supabase client with memory storage → `getSession()` works instantly (1ms)
2. Same client with localStorage → times out after 5 seconds
3. Direct API fetch → 200 OK
4. Conclusion: localStorage data corrupted

**Solution:** Clear Supabase localStorage entries:
```javascript
Object.keys(localStorage)
  .filter(k => k.includes('sb-'))
  .forEach(k => localStorage.removeItem(k));
```

**Prevention:** Added error handling and `isMounted` cleanup to AuthContext.tsx.

### 20 January 2026 - Role-Based Routing Fix

Fixed issue where teachers were being routed to Student View instead of Teacher View.

**Problems:**
1. Dashboard.tsx redirected based on `isVerified` instead of `user.role`
2. Teacher routes required `requireVerified` prop (which was FALSE for everyone)
3. Layout.tsx role switcher only showed for verified users
4. User dropdown showed "Verified Student" and "Upgrade to Teacher" for teachers

**Files Modified:**
- `Dashboard.tsx` - Redirect based on `user.role` instead of `isVerified`
- `App.tsx` - Removed `requireVerified` from teacher routes
- `Layout.tsx` - Show role switcher for teachers, correct badge based on role

**Result:**
- Teachers now correctly see Teacher Dashboard on login
- Teacher/Student toggle visible in header for teachers
- "Teacher Account" badge shown correctly in dropdown
- "Upgrade to Teacher" only shown for actual students

### 20 January 2026 - Auth Timeout Mechanism

Added timeout protection to prevent infinite hangs during Supabase auth operations.

**Problem:** Supabase JS client would sometimes hang indefinitely on `signInWithPassword()` even though direct API calls worked fine.

**Solution:** Multi-layered protection:
1. **Timeout Wrapper** - All auth operations wrapped with 10-second timeout
2. **Clear-Before-Login** - Sign out locally and clear localStorage before attempting login
3. **Corrupted Storage Recovery** - Auto-clear Supabase localStorage on timeout

**Key Code:**
```typescript
const login = async (email: string, password: string) => {
  // Clear any existing session first to avoid client locks
  await supabase.auth.signOut({ scope: 'local' });
  clearSupabaseStorage();

  // Attempt login with timeout
  const { error } = await withTimeout(
    supabase.auth.signInWithPassword({ email, password }),
    SESSION_TIMEOUT_MS
  );
};
```

**Result:**
- Auth operations no longer hang indefinitely
- User sees "Login timed out. Please try again." message if slow
- Corrupted sessions auto-recovered on retry

### 20 January 2026 - Rapid Navigation Fix

Fixed app freezing when navigating quickly between pages.

**Problem:** Clicking quickly between pages caused async operations to complete after component unmount, corrupting React state and freezing the app.

**Solution:**
1. **15-second stuck timer** - Auto page reload with cleared storage if loading hangs
2. **isMounted cleanup** - All async data loading in Classroom.tsx and QuranReader.tsx properly cancelled on unmount
3. **Optimistic logout** - State cleared immediately so logout never hangs

**Files Modified:**
- `AuthContext.tsx` - Stuck timer, optimistic logout
- `supabase.ts` - Centralized reset functions
- `Classroom.tsx` - isMounted pattern on 5 useEffects
- `QuranReader.tsx` - isMounted pattern on data loading

### 20 January 2026 - Local-First Caching

Implemented local-first architecture for instant page loading.

**Problem:** Supabase cloud latency (~1-2s) made pages feel slow.

**Solution:** Stale-while-revalidate caching:
1. Return cached data instantly from localStorage
2. Fetch fresh data in background if stale (>5 min)
3. Update cache for next visit

**Cached Functions:**
- `getClasses()` - Teacher/student class lists
- `getMyStudents()` - Teacher's student list
- `getMyTeachers()` - Student's teacher list

**New Files:**
- `src/lib/cache.ts` - Generic cache utilities

**Result:**
- Pages load instantly from cache
- Fresh data arrives in background
- Works offline (reads from cache)

### 24 January 2026 - Local-First Sync with app.db

Implemented true local-first architecture with app.db as primary storage and Supabase sync.

**Architecture:**
```
Frontend → FastAPI → app.db (instant)
                ↓ background
            Supabase (cloud sync)
```

**Why:**
- localStorage cache can be cleared by browser
- app.db is persistent, proper database
- True offline support

**New Backend Files:**
- `sync_service.py` - Push/pull sync with Supabase
- `.env.example` - Environment variable template

**New Frontend Files:**
- `src/lib/local-api.ts` - API for local operations

**New Endpoints:**
- `POST /api/local/classes` - Create class locally (instant)
- `GET /api/local/classes` - Get classes from app.db
- `POST /api/local/mistakes` - Add mistake locally
- `POST /api/sync` - Trigger background sync
- `GET /api/sync/status` - Check pending/synced count

**Setup:**
1. Copy `.env.example` to `.env` in quran_backend/
2. Add your Supabase URL and service key
3. Install: `pip install -r requirements.txt`

### 25 January 2026 - Profile Sync & Frontend Wiring

Extended sync service to include profiles and wired it to the frontend.

**Problem:**
- Classes stored `supabase_teacher_id` but local app.db had no profiles to look up names
- Sync wasn't triggered automatically on login

**Solution:**
1. Added profile syncing (Supabase → app.db, one-way)
2. Added teacher_students relationship syncing
3. Wired sync to AuthContext (triggers on login/signup/app start)

**New Tables in app.db:**
- `profiles` - Synced from Supabase (id, email, name, role)
- `teacher_students` - Teacher-student relationships

**Sync Flow:**
```
Login/Signup → full_sync() →
  1. Pull profiles (all users)
  2. Pull teacher_students (if teacher)
  3. Push pending classes/mistakes
  4. Pull classes/mistakes
```

**Files Modified:**
- `sync_service.py` - Added `pull_profiles()`, `pull_teacher_students()`
- `main.py` - Updated `/api/sync` to accept role parameter
- `local-api.ts` - Updated `triggerSync()` to pass role
- `AuthContext.tsx` - Added `triggerLocalSync()` on login/signup/init

**Result:**
- Profiles synced locally for name display
- Sync happens automatically on auth events
- Non-blocking (doesn't slow down login)

---


## Phase 13: Flutter Mobile App UI Overhaul

**Status:** In Progress

### Overview
Complete UI overhaul of the Flutter mobile app (`quran_mobile/`) to match the React web app design, implementing Supabase authentication, role-based navigation, theme support, and page-based Quran rendering.

---

### Phase 13.1 - Initial Flutter UI Overhaul

**Date:** Late January 2026

Complete UI overhaul foundation: theme system, Supabase auth, role-based navigation, and shared widgets.

**Implementation Steps:**

| Step | Title | Description |
|------|-------|-------------|
| 1 | Theme System | Dual theme (light/dark) with SharedPreferences persistence |
| 2 | Supabase Auth | Authentication service with Supabase |
| 3 | Auth UI Screens | Login, Signup, Forgot Password screens |
| 4 | Role-based Navigation | Teacher/Student navigation with role banner |
| 5 | Dashboard Screens | Role-aware dashboard with personalized content |
| 6 | Classes & Reader | Role-aware Classes and Quran Reader screens |
| 7 | Shared Widgets | Common reusable UI components |

**New Files Created:**

*Core Auth:*
- `lib/core/auth/supabase_config.dart` - Supabase initialization
- `lib/core/auth/auth_service.dart` - Auth operations wrapper
- `lib/data/models/app_user.dart` - User model with role

*Providers:*
- `lib/presentation/providers/auth_provider.dart` - Auth state management

*Auth Screens:*
- `lib/presentation/screens/auth/login_screen.dart`
- `lib/presentation/screens/auth/signup_screen.dart`
- `lib/presentation/screens/auth/forgot_password_screen.dart`

*Shared Widgets:*
- `lib/presentation/widgets/common/common_widgets.dart` - Barrel export
- `lib/presentation/widgets/common/gradient_button.dart`
- `lib/presentation/widgets/common/icon_input_field.dart`
- `lib/presentation/widgets/common/avatar_circle.dart`

*Configuration:*
- `.env` - Supabase credentials (not committed)
- `.env.example` - Example env file

**Files Modified:**

| File | Changes |
|------|---------|
| `lib/main.dart` | Supabase init, auth routing, role banner, nav items |
| `lib/config/app_colors.dart` | Added purple colors |
| `lib/presentation/screens/dashboard/dashboard_screen.dart` | Role-aware welcome, stats |
| `lib/presentation/screens/classes/classes_screen.dart` | Role-aware features |
| `lib/presentation/screens/reader/quran_reader_screen.dart` | Role-aware text/colors |
| `pubspec.yaml` | Added supabase_flutter, flutter_dotenv |
| `.gitignore` | Added .env exclusion |

**Dependencies Added:**
```yaml
dependencies:
  supabase_flutter: ^2.3.0    # Supabase authentication
  flutter_dotenv: ^5.1.0       # Environment configuration
```

**Role-Based Features:**

*Teacher View:*
- Cyan accent color, "Teacher View" banner
- Full CRUD on classes, can mark/review mistakes

*Student View:*
- Teal accent color, "Student View" banner
- Read-only class history, can view mistakes

**Auth Flow:**
```
App Start
  ├─► isLoading? ──► SplashScreen
  ├─► isAuthenticated?
  │       ├─► Yes ──► MainNavigation
  │       └─► No ──► LoginScreen
```

**Demo Accounts:**

| Role | Email | Password |
|------|-------|----------|
| Teacher | hamzaferoze115@gmail.com | 12345678 |
| Student | hamza@iiotsolutions.sa | 12345678 |

---

### Phase 13.2 - Bug Fixes & Web Data Integration

**Date:** 2 February 2026

Fixed several issues with the Flutter app and replaced mock data with Supabase queries.

**Bug Fixes:**
1. **Settings Logout Missing** - Added Sign Out button to Settings screen with confirmation dialog
2. **Teacher Dashboard Showing Student Content** - Teachers were seeing personal mistakes sections. Changed to show "My Students - Student Management Coming Soon" placeholder
3. **Login Page Not Centered** - Login card wasn't centered on tablet/larger screens. Added Center wrapper with mainAxisSize: MainAxisSize.min

**Flutter Web Data Integration:**
The Flutter web build was returning hardcoded mock data instead of fetching from Supabase. The `providers.dart` file had `if (kIsWeb) return _mockData;` checks throughout.

**Changes Made:**
- Removed mock data returns for user-specific data (classes, mistakes, stats)
- Added Supabase queries for web platform:
  - `ClassesNotifier.loadClasses()` - Fetches classes from Supabase with user_id
  - `MistakesNotifier.loadMistakes()` - Fetches mistakes from Supabase with student_id
  - `statsProvider` - Fetches class and mistake stats from Supabase
  - `topMistakesProvider` - Fetches top mistakes with occurrence count
  - `mistakeCountsBySurahProvider` - Fetches mistake counts grouped by surah
  - `classProvider` - Fetches single class by ID
  - `mistakesForSurahProvider` - Fetches mistakes for specific surah
- Kept static Quran text data (surahs list, pages mapping) as local data since it doesn't vary per user

**Files Modified:**
- `lib/presentation/screens/settings/settings_screen.dart` - Added logout functionality
- `lib/presentation/screens/dashboard/dashboard_screen.dart` - Teacher placeholder
- `lib/presentation/screens/auth/login_screen.dart` - Centered layout
- `lib/presentation/providers/providers.dart` - Replaced mock data with Supabase queries

---

### Phase 13.3 - Supabase Column Fix & Dashboard Redesign

**Date:** 3 February 2026

**Supabase Column Name Fix:**
Fixed PostgrestException errors caused by incorrect column names in Supabase queries:
- Changed `user_id` to `student_id` for mistakes table queries
- Changed `user_id` to `teacher_id` for classes table queries
- Removed `is_deleted` filter (column doesn't exist in Supabase schema)

**Teacher Dashboard Redesign:**
Updated Flutter Teacher Dashboard to match React web app design exactly:
- Changed header from avatar greeting to "Teacher Dashboard" title with "Welcome back, {name}!" subtitle
- Added action buttons row: "Add Student" and "+ Start New Class" (cyan gradient)
- Updated stats cards to match React:
  - **Total Students** with "Active" badge (emerald)
  - **Classes This Week** (cyan)
  - **Total Classes** (purple)
  - **Today's Date** (amber)
- Added `badge` parameter to StatCard widget
- Added `amber500` and `amber600` colors to AppColors

**Login/Signup Screen Enhancements:**
- Added full Al-Isra 17:9 ayah in Arabic with English translation
- Added background image (same as React web app)
- Added dark gradient overlay for text readability
- Fixed background image not covering full viewport on Flutter web (changed from Stack with Positioned.fill to Container with DecorationImage)

**Settings Screen ListTile Fix:**
Fixed "Trailing widget consumes entire tile width" error by wrapping ElevatedButtons in SizedBox(width: 100)

**Key Principles:**
- **UI First** - Match the web app design pixel-perfect
- **Local-First** - SQLite remains the primary database
- **Supabase for Auth Only** - Login/signup to enter the app
- **No Data Sync Yet** - Supabase data sync is a future phase

**Files Modified:**
- `lib/presentation/providers/providers.dart` - Fixed Supabase column names
- `lib/presentation/screens/dashboard/dashboard_screen.dart` - Teacher dashboard redesign
- `lib/presentation/widgets/glassmorphic_card.dart` - Added badge to StatCard
- `lib/config/app_colors.dart` - Added amber colors
- `lib/presentation/screens/auth/login_screen.dart` - Full ayah, background image, full-screen fix
- `lib/presentation/screens/auth/signup_screen.dart` - Full ayah, background image, full-screen fix
- `lib/presentation/screens/settings/settings_screen.dart` - Fixed ListTile button widths
- `pubspec.yaml` - Added assets/images/ folder
- `assets/images/background.jpg` - Copied from React web app

---

### Phase 13.4 - Quran Reader Rewrite (Page-Based QPC Rendering)

**Date:** 8 February 2026

Complete rewrite of the Flutter Quran Reader from surah-based plain text to page-based QPC glyph rendering, matching the React web app's Mushaf display.

**What Changed:**
- **Fullscreen immersive layout**: Mushaf page fills entire screen, no persistent chrome. Tap to show/hide translucent overlay controls (page number, surah name, navigation arrows). Auto-hides after 4 seconds.
- **Page-based navigation**: 604-page PageView with RTL swipe (was surah-based dropdown)
- **QPC font rendering**: Each page uses its own QPC font file with page-specific glyph codes (was Google Fonts Amiri with plain text)
- **Font download + cache**: Fonts served from backend API (`/api/fonts/qpc/{page}`), downloaded on first use, cached permanently on device
- **Bundled page data**: 604 JSON files with word-by-word QPC data bundled in APK assets
- **Overflow prevention**: Each line wrapped in FittedBox to scale down and prevent horizontal overflow
- **Surah headers + Bismillah**: Rendered above page content when a surah starts on a page
- **Mistake highlighting**: 5-level color coding (amber/blue/orange/purple/red) with gradient backgrounds
- **Page 586 overflow**: Handles overflow glyphs that need previous page's font (codeUnit >= 0xFC00)
- **Cream page background**: Mushaf page is always `#FEF9E7` (cream) regardless of theme, matching the printed Mushaf and the React web app. Text and decorations always use light-mode colors on the cream background. In dark mode the scaffold is black with padding for a framed card effect; in light mode the scaffold matches the cream for a seamless edge-to-edge look.

**Files Created:**
- `scripts/convert_fonts.py` - Converts .woff2 fonts to .ttf for Flutter
- `quran_mobile/lib/data/models/quran_page_word.dart` - QPC word model
- `quran_mobile/lib/data/models/quran_page_data.dart` - Page data with line grouping
- `quran_mobile/lib/data/quran_data.dart` - Static page starts + surah names (604 + 114 entries)
- `quran_mobile/lib/core/services/qpc_font_service.dart` - Font download/cache/load service
- `quran_mobile/lib/core/services/quran_page_data_service.dart` - JSON asset loader with LRU cache
- `quran_mobile/lib/presentation/providers/quran_page_provider.dart` - Riverpod providers
- `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` - Single page renderer
- `quran_mobile/lib/presentation/widgets/surah_header_widget.dart` - Surah name header
- `quran_mobile/lib/presentation/widgets/bismillah_widget.dart` - Bismillah renderer

**Files Modified:**
- `quran_mobile/lib/presentation/screens/reader/quran_reader_screen.dart` - Complete rewrite
- `quran_mobile/pubspec.yaml` - Added `assets/quran-pages/` asset bundle
- `quran_backend/main.py` - Added `GET /api/fonts/qpc/{page_number}` endpoint

**Architecture:**
- Font strategy: Download + cache (not bundled in APK, ~80MB total too large)
- Page data strategy: Bundled in APK (~10MB compressed, fully offline)
- Only 3 fonts loaded at a time (current + prev + next)
- LRU cache for page data (10 pages in memory)

See: [06-QURAN-READER.md](./Technical%20Implementation%20Journey/Flutter%20App%20Overhaul/06-QURAN-READER.md)

---

### Phase 13.5 - Integrate QPC Quran Reader into Flutter Classroom ✅

**Status:** DONE
**Date:** 11 February 2026

Replaced the plain-text Arabic rendering in ClassroomScreen with page-based QPC glyph rendering using the existing MushafPageWidget, matching the React web app's classroom experience.

#### What Changed
- **MushafPageWidget** — Added optional `onWordTap` and `onWordLongPress` callbacks for interactive word selection (backwards-compatible: QuranReaderScreen passes no callbacks)
- **Page range helpers** — Added `getLastPageForSurah()` and `getPageRange()` to `quran_data.dart` for computing mushaf page ranges from assignment surah/ayah boundaries
- **ClassroomScreen rewrite** — Replaced `surahWithAyahsProvider` + `Wrap` + Google Fonts Amiri with `MushafPageWidget` + `quranPageDataProvider` + `fontReadyProvider` (QPC glyphs)
  - Added page navigation (prev/next arrows) constrained to assignment page range
  - Added **swipe navigation** via `PageView.builder` (RTL: swipe left = next page)
  - Removed surah selector (page navigation replaces it)
  - Word tap → WordPopup → mistake marking on QPC glyphs
  - Long press highlighted word → removes mistake
  - Mistake filtering now covers entire assignment range (multi-surah aware)
  - Theme-aware colors via `AppColors` (supports light/dark mode)
  - Mistakes summary moved **below the fold** — scroll down past the mushaf page to see it (no longer steals vertical space)
- **Supabase UUID bug fix** — Added `supabaseId` field to `ClassSession` and `Mistake` models; all web Supabase queries now use the real UUID instead of broken `int.tryParse` on UUIDs (which returned `0` for every class/mistake)
  - `classProvider` on web now finds from the loaded classes list instead of re-querying
  - `deleteClass`, `updateNotes`, `updatePerformance`, `removeMistake` all resolve the UUID before querying
- **Mistakes RLS fix** — Added `teacherStudentsProvider` to fetch the teacher's students from `teacher_students` table
  - Added student selector dropdown in ClassroomScreen (web only, for teachers)
  - `addMistake` now passes the selected student's UUID (not the teacher's own ID), matching the React web app's RLS-compliant flow
  - Added upsert logic: if same word already has a mistake, increments `error_count` instead of inserting a duplicate
  - Records `mistake_occurrences` with the class ID when adding mistakes

#### Known Issues / TODO
- **Performance dropdown** — Not yet available inside the ClassroomScreen; currently only editable from the Classes list. Needs to be added to the classroom header.
- **Notes button** — Not yet available inside the ClassroomScreen; needs a button/field for teachers to add/edit notes.
- **WordPopup letter/haraka selection** — Currently only "whole word" mistake marking works reliably. The letter and haraka (diacritics) selection in WordPopup needs fixing — the character parsing from `textUthmani` doesn't correctly isolate individual letters and their harakat.

#### Files Modified
| File | Change |
|------|--------|
| `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` | Added `onWordTap`, `onWordLongPress` callbacks; removed unused import |
| `quran_mobile/lib/data/quran_data.dart` | Added `getLastPageForSurah()`, `getPageRange()` |
| `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` | Full rewrite: QPC page rendering + swipe nav + student selector |
| `quran_mobile/lib/data/models/class_session.dart` | Added `supabaseId` field for web UUID storage |
| `quran_mobile/lib/data/models/mistake.dart` | Added `supabaseId` field for web UUID storage |
| `quran_mobile/lib/presentation/providers/providers.dart` | UUID fix, student selector, upsert mistakes, RLS-compliant addMistake |

---

---

## Phase 14: Web Quran Reader — Responsive Overhaul ✅

**Status:** DONE
**Date:** 8-11 February 2026

Complete rewrite of the web Quran Reader rendering system to match the Flutter app's quality. The reader is now fully responsive across phones, tablets, and desktops with crisp, properly-sized text on every page.

### Core Rendering Fix — Scale DOWN Only

**Problem:** The web app's `FittedLine` component was scaling text both UP and DOWN. Short lines (2-5 words, common in short surahs like Al-Kawthar, Al-Ikhlas, An-Nas) got massively enlarged — blurry, distorted text that looked nothing like the Flutter app.

**Root Cause:** Flutter uses `FittedBox(fit: BoxFit.scaleDown)` which only scales DOWN, never up. The web was using `transform: scale(containerWidth / contentWidth)` with no upper bound.

**Fix:** One critical change in `FittedLine.tsx`:
```tsx
// Before: scales both up AND down — causes enlargement
const scale = containerWidth / contentWidth;

// After: only scale DOWN, never up — matches Flutter
const scale = Math.min(1.0, containerWidth / contentWidth);
```

### Font Size Strategy

Switched from responsive `clamp()` and dynamic `height/N` calculations to a fixed `28px` base font size:
- QPC glyphs are designed for specific sizes — scaling down preserves quality, scaling up distorts
- At 28px, full QPC lines (10-15 words) naturally overflow the container and get scaled down by FittedLine
- Short lines stay at 28px (reasonable size, never enlarged)
- Removed `lineHeight: 1.8` which was causing vertical overflow and cutting off bottom content

### Surah Headers — Full Width

Matched Flutter's full-width surah header bar:
- **Before:** Small inline pill wrapping only the text (`inline-block`)
- **After:** Full-width bar spanning the entire page width (`w-full`)
- Styling: `bg-cyan-50`, `border-cyan-200`, `text-cyan-800`, 18px Amiri font
- Bismillah: 18px, Amiri Quran font, `text-cyan-700`

### 3-Tier Responsive Layout

Redesigned the entire app layout with three responsive tiers:

| Feature | Phone (<640px) | Tablet/Small Laptop (640-1024px) | Desktop (>=1024px) |
|---------|----------------|-----------------------------------|---------------------|
| **Navigation** | Bottom nav bar | Bottom nav bar | Top tab nav |
| **Mushaf Page** | Full-screen, edge-to-edge | Centered, sized for viewport | Centered, sized for viewport |
| **Reader Controls** | Overlay on page | Header bar with controls | Header bar + legend + page info |
| **Role Banner** | Hidden | Hidden | Visible |
| **Role Switcher** | Hidden | Hidden | Visible |

**Breakpoint Change:** Moved the nav breakpoint from `sm` (640px) to `lg` (1024px):
- Bottom nav now shows on phones, tablets, AND small laptops (below 1024px)
- Top tab navigation only appears on screens 1024px and wider
- This ensures small 12-13" laptop screens get the cleaner bottom nav layout

### Page Dimensions

- **Phone** (<640px): Full viewport width, height = viewport - 112px (header + bottom nav)
- **Tablet** (640-1024px): Height = min(80vh, viewport - 240px), width = height * 0.7, max 500px. Accounts for bottom nav + header cards.
- **Desktop** (>=1024px): Height = min(80vh, viewport - 160px), width = height * 0.7, max 500px

### Vertical Space Optimization

On tablet/small laptop screens, the legend and page info cards are hidden (only shown on desktop) to ensure the mushaf page fits entirely in the viewport without scrolling:
- Legend card: `hidden lg:block` (was `hidden sm:block`)
- Page info card: `hidden lg:flex` (was `hidden sm:flex`)
- Saves ~100px of vertical space on tablet

### Files Modified

| File | Changes |
|------|---------|
| `quran_frontend/src/components/FittedLine.tsx` | Rewritten — `Math.min(1.0, scale)`, uniform `scale()` |
| `quran_frontend/src/pages/QuranReader.tsx` | Fixed font size (28px), full-width surah headers, 3-tier dimensions, hide cards below lg |
| `quran_frontend/src/pages/Classroom.tsx` | Same font size and surah header fixes, bottom-nav-aware dimensions |
| `quran_frontend/src/components/Layout.tsx` | Nav breakpoint `sm` → `lg`, bottom nav shows below 1024px |

### Documentation Created

| File | Purpose |
|------|---------|
| `docs/Technical Implementation Journey/Quran Reader/FLUTTER-RENDERING-REFERENCE.md` | Complete Flutter rendering system reference |
| `docs/Technical Implementation Journey/Quran Reader/WEB-READER-RENDERING-ISSUES.md` | Updated with all fixes and 3-tier responsive table |

**Final tuning (9 Feb):** Responsive font size `min(28, pageHeight/21)px` to prevent text cutoff on smaller screens. All QuranReader content breakpoints moved from `sm` to `lg` — tablet uses compact overlay controls on the mushaf page (no header pushing content down). Legend shown above page on tablet to fill dead space. chromeHeight tuned to 220px for tablet.

**Overflow line fix (11 Feb):** Pulled surah headers and bismillahs out of line flex items into their own `flex-none` slots. Previously, lines with headers (e.g. page 591 with Surah 87 starting mid-page) had header + bismillah + QPC text all inside one `flex-1` item, causing overflow that clipped the last verses. Now headers/bismillahs are separate flex items so the layout properly accounts for their height. Fixes all 13 pages with overflow lines (pages 144, 587-599). Uses `React.Fragment` to return multiple flex children per line iteration.

See: [WEB-READER-RENDERING-ISSUES.md](./Technical%20Implementation%20Journey/Quran%20Reader/WEB-READER-RENDERING-ISSUES.md), [FLUTTER-RENDERING-REFERENCE.md](./Technical%20Implementation%20Journey/Quran%20Reader/FLUTTER-RENDERING-REFERENCE.md)

---

## Phase 15: Light Mode Overhaul & Bug Fixes

**Status:** DONE
**Date:** 11 February 2026

### Light Mode Theme

Redesigned the light mode for better contrast and visual hierarchy:

- **Navbar gradient:** Moved the cyan gradient (`rgb(186,230,253)` → `rgb(165,243,252)` → `rgb(207,250,254)`) from the page body to the top navbar and bottom nav. Body is now neutral `#f8fafc`.
- **Nav tab contrast:** Active tabs use white backgrounds (`bg-white`) with `text-cyan-700` that pop against the cyan gradient. Inactive tabs use `text-slate-700` for readability. Same for role switcher (Teacher/Student), theme toggle, and user menu.
- **Performance dropdowns:** Added dark/light conditionals — light mode uses solid backgrounds (`bg-blue-100 text-blue-700`, `bg-teal-100 text-teal-700`, etc.) instead of transparent dark-mode-only styles.
- **Portion rows** (HIFZ/SABQI/MANZIL on classes page): `bg-blue-50 text-blue-600` etc. instead of invisible `bg-blue-500/5 text-blue-400`.
- **Mistake highlights:** CSS `.light .mistake-*` overrides increase opacity from ~30% to ~50% so amber/yellow highlights are visible on white card backgrounds.
- **Notes button, mistake badges, previous mistake colors:** All have proper light mode variants.

### Bug Fix: "Class not found"

All classes showed "Class not found" when clicked. Root cause: `getClass()` in `supabase-api.ts` selected a `performance` column from the `class_students` join that doesn't exist in the Supabase table schema. Supabase returned error `column class_students_1.performance does not exist`, caught silently by `.catch(console.error)`.

**Fix:** Removed `performance` from `class_students` select in `getClass()` and student `fetchClassesFromSupabase()`. Redirected `updateStudentPerformance()` to write to `classes` table instead.

### Files Modified

| File | Changes |
|------|---------|
| `quran_frontend/src/index.css` | Neutral light body, `.light .mistake-*` opacity overrides |
| `quran_frontend/src/components/Layout.tsx` | Navbar gradient, nav tab/button contrast for light mode |
| `quran_frontend/src/lib/supabase-api.ts` | Removed non-existent `performance` column from class_students queries |
| `quran_frontend/src/pages/TeacherClasses.tsx` | Performance dropdown + portion row light mode styles |
| `quran_frontend/src/pages/Classroom.tsx` | Performance dropdown, notes button, mistake colors for light mode |

---

### Documentation

All implementation details are in:

**Flutter App Overhaul:**
`docs/Technical Implementation Journey/Flutter App Overhaul/`
- `00-OVERVIEW.md` - Summary of the overhaul
- `01-THEME-SYSTEM.md` - Theme implementation details
- `02-AUTHENTICATION.md` - Supabase auth integration
- `03-NAVIGATION.md` - Role-based navigation structure
- `04-SCREENS.md` - Dashboard, Classes, Reader updates
- `05-SHARED-WIDGETS.md` - Widget catalog and usage
- `06-QURAN-READER.md` - QPC page-based reader rewrite

**Web Quran Reader:**
`docs/Technical Implementation Journey/Quran Reader/`
- `WEB-READER-RENDERING-ISSUES.md` - All rendering fixes, approaches, and responsive breakpoints
- `FLUTTER-RENDERING-REFERENCE.md` - Flutter rendering gold standard reference

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