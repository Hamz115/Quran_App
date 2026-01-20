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
│   └── Supabase Implementation/            # Supabase cloud setup
│       ├── Implementation_Journey.md       # Step-by-step setup record
│       ├── Supabase_Reference.md           # Full schema & policy reference
│       └── Supabase_Frontend_Integration_Reference.md  # Frontend integration code
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
