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
│   ├── Student_Reports.md                  # Student reports feature (data, export, UI)
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

## Phase 8: UI Improvements & Smart Suggestions

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
- Created `seed_database.py` for populating sample data
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

## Phase 16: Student Reports Feature

**Status:** DONE
**Date:** 15 February 2026

### Overview

Added comprehensive student reports feature for teachers to generate individual progress reports for each student. Reports include mistake analysis, class attendance, performance history, and export functionality.

### Backend

- Added new endpoint: `GET /api/students/{student_id}/report`
- Returns: student profile, summary stats (classes, mistakes), classes attended, mistakes grouped by surah, repeated mistakes (error_count > 1), performance trend over time

### Frontend

- Created `report-types.ts` - TypeScript interfaces for report data structures
- Added `getStudentReport()` function to `supabase-api.ts` - fetches directly from Supabase
- Created `StudentReport.tsx` page with:
  - Student info header with quick stats cards
  - Mistakes by surah visualization (bar chart)
  - Repeated mistakes table (needs focus)
  - Performance history timeline
  - Class attendance list
- Added route: `/teacher/students/:studentId/report`
- Added "View Report" button on Teacher Dashboard student cards

### Export Functionality

Added client-side export with libraries:
- **PDF** - jsPDF with jspdf-autotable for formatted tables
- **CSV** - Simple CSV string export
- **Word** - docx library for Word documents

Dependencies added: `jspdf`, `jspdf-autotable`, `docx`, `file-saver`, `@types/file-saver`

### Build Fixes (same session)

Fixed multiple build-breaking issues across the codebase:

- **TeacherClasses.tsx** — Removed ~200 lines of orphaned "Test Portion" JSX left behind from the test feature removal (commit `22dd67c`). The `classType === 'test'` ternary condition had been removed but its entire UI branch (page/surah picker) was left in place, creating a broken ternary chain. Also removed stale `setClassType('regular')` call and unused `updateClassPublish` import.
- **report-export.ts** — Fixed unused `BorderStyle` import, removed unused `surahNames` constant, changed `children` type from `Paragraph[]` to `(Paragraph | Table)[]` for Word export tables.
- **supabase-api.ts** — Added `as any` casts to new Supabase queries (`profiles`, `class_students`, `mistakes`) to match existing file pattern. Cast query results to `any[]` to resolve `never` type errors. Fixed unused `studentId` parameter.
- **StudentReport.tsx** — Removed unused `useAuth` import, added non-null assertion for `studentId` param.
- **Classroom.tsx** — Added `student_id` to local `Mistake` interface and made `MistakeOccurrence` fields optional for type compatibility with `MistakeWithOccurrences`.

### Files Created

| File | Description |
|------|-------------|
| `quran_frontend/src/lib/report-types.ts` | TypeScript interfaces for student reports |
| `quran_frontend/src/lib/report-export.ts` | Export utilities (PDF, CSV, Word) |
| `quran_frontend/src/pages/StudentReport.tsx` | Report viewer page with all visualizations |

### Files Modified

| File | Changes |
|------|---------|
| `quran_backend/main.py` | Added `/api/students/{student_id}/report` endpoint |
| `quran_frontend/src/lib/supabase-api.ts` | Added `getStudentReport()`, fixed type casts |
| `quran_frontend/src/App.tsx` | Added route for student report |
| `quran_frontend/src/pages/TeacherDashboard.tsx` | Added "View Report" buttons to student cards |
| `quran_frontend/src/pages/TeacherClasses.tsx` | Removed orphaned Test Portion JSX, cleanup |
| `quran_frontend/src/pages/Classroom.tsx` | Fixed Mistake interface compatibility |
| `quran_frontend/package.json` | Added export dependencies |

### Documentation

- Technical doc: [`Student_Reports.md`](./Technical%20Implementation%20Journey/Student_Reports.md)
- Session log: `docs/Logs/2026-02-15-003-student-reports-feature.md`

---

## Phase 16.1: Student Report Redesign — Tab-Based Dashboard

**Status:** DONE
**Date:** 15 February 2026

### Overview

Redesigned the Student Report from a simple stacked layout into a comprehensive tab-based dashboard with client-side filtering, per-class mistake breakdowns, and a configurable export modal.

### New: Quran Utilities Module

- Created `quran-utils.ts` with centralized `surahNames` map (previously duplicated in 4+ files), `JUZ_BOUNDARIES` (30 entries), and helper functions (`getSurahRangeForJuz`, `getJuzForSurah`, `isSurahInJuz`)
- Replaced all duplicate `surahNames` in `TeacherClasses.tsx`, `StudentClasses.tsx`, `StudentDashboard.tsx`, `supabase-api.ts`

### API Changes

- Updated `getStudentReport()` to join `mistake_occurrences` table (links mistakes to specific classes)
- Built per-class mistake mapping from occurrence data
- Added `avg_performance` computation (maps ratings Excellent/Very Good/Good/Needs Work to 4/3/2/1 scale and back)
- Each class now includes `mistakes[]` and `mistake_count`

### New Tab-Based Dashboard

**Filter Bar** (3 filter types, all client-side via `useMemo`):
- Date range: Presets (1 Month, 2 Months, 6 Months, All Time) + custom date pickers
- Surah range: From/To dropdowns (114 surahs)
- Juz: Dropdown (1-30), overrides surah range when selected

**Summary Strip**: 5 stats — Classes, Total Mistakes, Unique, Repeated, Avg Performance

**3 Tabs**:
- **Classes**: Table with expandable rows showing per-class mistakes and teacher notes. Columns: Date, Portions (HIFZ/SABQI/MANZIL tags), Mistake count (color-coded), Performance badge, Notes preview
- **Mistakes**: Two-panel layout — Mistakes by Surah (CSS bar chart) + Repeated Mistakes (ranked list)
- **Performance**: CSS bar chart (color-coded by rating) + Stat cards (Current Streak, Best Streak, Mistakes/Class with sparkline, Trend)

### Export Modal

- Format selector: PDF, CSV, Word
- 6 section toggles: Summary, Class Details, Mistakes by Surah, Repeated Mistakes, Performance Chart, Teacher Notes
- Filter summary display (shows active filters and data count)
- All export functions updated to accept `ExportConfig` with conditional sections and filter headers

### New Interfaces

- `ReportFilters` — date/surah/juz filter state
- `ClassMistake` — mistake linked to a specific class
- `ExportConfig` — format, section toggles, filters, filtered report data
- `PerformanceStats` — streaks, mistakes/class, trend computation

### Files

| File | Action | Description |
|------|--------|-------------|
| `src/lib/quran-utils.ts` | Created | Centralized surahNames, Juz boundaries, helpers |
| `src/lib/report-types.ts` | Modified | Added 4 new interfaces, updated StudentClass + summary |
| `src/lib/supabase-api.ts` | Modified | mistake_occurrences join, per-class mapping, avg_performance |
| `src/pages/StudentReport.tsx` | Rewritten | Tab-based dashboard (~1060 lines) |
| `src/lib/report-export.ts` | Modified | ExportConfig, conditional sections, filter headers |
| `src/pages/TeacherClasses.tsx` | Modified | Import surahNames from quran-utils |
| `src/pages/StudentClasses.tsx` | Modified | Import surahNames from quran-utils |
| `src/pages/StudentDashboard.tsx` | Modified | Import surahNames from quran-utils |

### Documentation

- Technical doc: [`Student_Reports.md`](./Technical%20Implementation%20Journey/Student_Reports.md) (updated)
- Session log: `docs/Logs/2026-02-15-004-student-report-redesign.md`

---

## Phase 16.2: Classes Revamp — Inline Report Dashboard

**Status:** DONE
**Date:** 16 February 2026

### Overview

Decomposed the standalone `StudentReport` page (1066 lines) into 9 reusable components, inlined them as the primary content of `TeacherClasses`, redesigned the export modal, and moved PDF generation from client-side html2pdf.js to a backend Playwright endpoint.

### Architecture Change

The Classes page was fundamentally restructured:
- **Before:** Classes page showed class cards with month tabs. A separate `/teacher/students/:id/report` page showed student reports.
- **After:** Classes page IS the report. Student pills at top select a student → report loads inline as the main content. Class cards, month tabs, and the standalone report route were removed.

Architecture went through 3 iterations: slide-out panel overlay → view replacement with back button → inline report as primary content.

### Component Decomposition

The monolithic `StudentReport.tsx` was split into 9 files under `src/components/teacher-classes/`:

| File | Description |
|------|-------------|
| `report-helpers.ts` | Pure functions: constants, badge classes, formatters, stats, filters |
| `ReportFilterBar.tsx` | Month pills (3 recent + older dropdown), surah/juz selectors, clear-all |
| `ReportSummaryStrip.tsx` | 5-stat horizontal bar (classes, total mistakes, unique, repeated, avg performance) |
| `ExportModal.tsx` | Format picker (PDF/CSV/Word), section toggles, loading/error states |
| `ReportClassesTab.tsx` | Classes table with expandable rows, clickable to navigate to class session |
| `ReportMistakesTab.tsx` | Mistakes by surah (CSS bar chart) + repeated mistakes ranked list |
| `ReportPerformanceTab.tsx` | Performance bar chart + stats sidebar (streaks, trend) |
| `ReportPanel.tsx` | Orchestrator: state management, data fetching, tab switching |
| `index.ts` | Barrel exports |

### Date Filter Redesign

Replaced abstract presets (1m/2m/6m/All + date pickers) with concrete **month pills**:
- Last 3 months shown as pills (e.g., "February 2026", "January 2026", "December 2025")
- "All" pill for unfiltered view
- "Older months..." dropdown with 9 more months going back ~1 year

### Export Modal & PDF Export

**Export Modal Redesign:**
- Wider modal (540px), bigger format buttons, bordered toggle card
- Scrollable body with fixed header/footer
- Loading spinner + error states during async PDF generation

**PDF Export — Client-Side (html2pdf.js):**
- Replaced jsPDF (can't handle Arabic/RTL) with html2pdf.js (HTML → canvas → PDF)
- Styled HTML matching report mockup: gradient header, stat cards, class table, bar charts
- Key fix: do NOT manually append container to DOM — let html2pdf manage its own container (otherwise `position:fixed` is inherited by the clone, causing blank captures)

**PDF Export — Backend Playwright (final solution):**
- Added `POST /api/export/pdf` endpoint to FastAPI
- Accepts HTML string, generates PDF via Playwright + Edge (`channel="msedge"`)
- Produces vector-quality PDFs with selectable text, perfect CSS gradients
- Running header/footer on every page ("Student Progress Report" + "Page X of Y")
- 30-second timeout, 5MB HTML limit
- Client-side html2pdf.js kept as fallback

### Files Created

| File | Description |
|------|-------------|
| `src/components/teacher-classes/report-helpers.ts` | Pure functions extracted from StudentReport |
| `src/components/teacher-classes/ReportFilterBar.tsx` | Month pills + surah/juz filters |
| `src/components/teacher-classes/ReportSummaryStrip.tsx` | 5-stat summary bar |
| `src/components/teacher-classes/ExportModal.tsx` | Export dialog with loading/error states |
| `src/components/teacher-classes/ReportClassesTab.tsx` | Classes table with expandable rows |
| `src/components/teacher-classes/ReportMistakesTab.tsx` | Mistakes by surah + repeated list |
| `src/components/teacher-classes/ReportPerformanceTab.tsx` | Bar chart + stats sidebar |
| `src/components/teacher-classes/ReportPanel.tsx` | Slide-out → inline panel orchestrator |
| `src/components/teacher-classes/index.ts` | Barrel exports |

### Files Modified

| File | Changes |
|------|---------|
| `src/pages/TeacherClasses.tsx` | Removed class cards/month tabs (~400 lines), added inline ReportPanel |
| `src/App.tsx` | Removed StudentReport import and route |
| `src/pages/TeacherDashboard.tsx` | "View Report" → `?report=ID` query param navigation |
| `src/api.ts` | Added `getStudentReport` re-export |
| `src/lib/report-export.ts` | html2pdf.js rewrite + `buildReportHTML()` + `exportToPDFBackend()` |
| `quran_backend/main.py` | Added `POST /api/export/pdf` endpoint (~70 lines) |
| `quran_backend/requirements.txt` | Added `playwright` dependency |
| `package.json` | Added `html2pdf.js` dependency |

### Files Deleted

| File | Reason |
|------|--------|
| `src/pages/StudentReport.tsx` | Replaced by component system in `src/components/teacher-classes/` |

### Documentation

- Planning doc: [`Classes_Revamp_Plan.md`](./Technical%20Implementation%20Journey/Classes_Revamp_Plan.md)
- Agent guide: [`Classes_Revamp_Agents.md`](./Technical%20Implementation%20Journey/Classes_Revamp_Agents.md)
- Implementation doc: [`Classes_Revamp_Implementation.md`](./Technical%20Implementation%20Journey/Classes_Revamp_Implementation.md)
- Session logs: `2026-02-16-001` (planning + implementation), `2026-02-16-002` (architecture fix), `2026-02-16-003` (export + PDF), `2026-02-16-004` (backend Playwright PDF)

---

## Phase 17: Tauri Desktop App

**Status:** In Progress (Phases 1-4 complete, Phase 5 pending)
**Date:** 17-18 February 2026

### Overview

Wrapped the existing React/Vite frontend in a native Tauri v2 desktop app with the FastAPI backend bundled as a PyInstaller sidecar. The app launches as a native Windows window, auto-starts the backend, and kills it on close.

### Architecture

```
┌─────────────────────────────────────────────────┐
│                  Tauri Shell (Rust)              │
│  ┌───────────────────┐  ┌────────────────────┐  │
│  │   WebView2 Window │  │  Sidecar Manager   │  │
│  │  (React Frontend) │  │  (lifecycle ctrl)  │  │
│  └────────┬──────────┘  └────────┬───────────┘  │
│           │   fetch()            │  spawn/kill   │
│           ▼                      ▼               │
│  ┌─────────────────────────────────────────────┐ │
│  │     FastAPI Sidecar (PyInstaller .exe)      │ │
│  │  localhost:8000 — all existing endpoints    │ │
│  │  ┌──────────┐ ┌─────────┐ ┌─────────────┐  │ │
│  │  │ app.db   │ │quran.db │ │ Supabase    │  │ │
│  │  │ (r/w)    │ │ (r/o)   │ │ sync (bg)   │  │ │
│  │  └──────────┘ └─────────┘ └─────────────┘  │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Key:** The frontend talks to the sidecar via `fetch("http://localhost:8000/...")` — identical to how it works in development. Zero frontend API rewrites.

### Phase 1: Tauri Scaffold (2026-02-17)

- Installed prerequisites: Rust 1.93.1 (MSVC toolchain), Visual Studio Build Tools (C++ workload)
- Installed npm packages: `@tauri-apps/cli`, `@tauri-apps/api`, `@tauri-apps/plugin-shell`
- Ran `npx tauri init` inside `quran_frontend/`
- Configured `tauri.conf.json` (window 1280x800, CSP for localhost:8000 + Supabase)
- Configured capabilities (shell permissions for sidecar)
- First build compiled 409 Rust crates — React frontend loaded in native window

### Phase 2: PyInstaller Sidecar (2026-02-17)

- Created `pyinstaller_entry.py` — entrypoint with `freeze_support()`, stdout redirect for `--noconsole` mode, parent-watcher thread
- Created `QuranTrackBackend.spec` — hidden imports for all Python dependencies, bundles quran.db + quran-pages/ + .env
- Modified `main.py`, `auth/routes.py`, `sync_service.py` — frozen-mode path resolution (`sys._MEIPASS` for read-only, `sys.executable.parent` for read-write)
- Built 31MB sidecar exe, verified standalone HTTP 200

### Phase 3: Sidecar Integration (2026-02-17)

- Wrote `lib.rs` sidecar lifecycle: spawn on `setup()`, log stdout/stderr, kill on `CloseRequested`
- Stored `CommandChild` handle in `Mutex<Option<CommandChild>>` state
- Fixed Rust compiler errors: missing `use tauri::Manager`, borrow checker issue with `MutexGuard`
- Fixed sidecar path resolution: `externalBin` must be `"quran-backend"` (no `binaries/` prefix)
- Full integration verified: Tauri launches → sidecar starts → frontend connects → window close kills sidecar

### Phase 4: Icon & Polish (2026-02-17)

- Generated all app icons from `logo.png` via `npx tauri icon`
- Fixed parent-watcher crash: `SYNCHRONIZE` (0x100000) → `PROCESS_QUERY_LIMITED_INFORMATION` (0x1000) with test-before-start pattern
- Verified QPC fonts render correctly in WebView
- Resources (quran.db, quran-pages/) bundled inside PyInstaller exe — Tauri's `resources/` not needed
- Windows Defender fix: added exclusion for `src-tauri/` folder (PyInstaller exe false positive)

### Key Gotchas & Fixes

| Issue | Fix |
|-------|-----|
| `opener:default` permission not found | Removed; use flat `shell:allow-spawn/kill/open` |
| PyInstaller `--noconsole` crashes uvicorn | Redirect stdout/stderr to `backend.log` before importing |
| `os.kill(pid, 0)` broken on Windows | Use `kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION)` |
| `externalBin: "binaries/quran-backend"` not found | Changed to `"quran-backend"` — Tauri doesn't use subdirectory prefix |
| Parent-watcher kills sidecar immediately | SYNCHRONIZE access denied → switched to least-privilege flag |
| Windows Defender blocks sidecar exe (code 5) | Add Defender exclusion for `src-tauri/` folder |
| Orphaned sidecar blocks port 8000 | `taskkill /PID <pid> /F` to kill the orphan |
| `unittest` excluded but pyparsing needs it | Removed from PyInstaller excludes |

### Files Created

| File | Description |
|------|-------------|
| `quran_frontend/src-tauri/` | Entire Tauri directory (config, Rust source, capabilities, icons) |
| `quran_backend/pyinstaller_entry.py` | PyInstaller entrypoint (freeze_support, stdout fix, parent watcher) |
| `quran_backend/QuranTrackBackend.spec` | PyInstaller spec file (hidden imports, data, excludes) |

### Files Modified

| File | Changes |
|------|---------|
| `quran_frontend/package.json` | Added Tauri deps + scripts |
| `quran_backend/main.py` | Frozen-mode path resolution (`_BASE_DIR` / `_WRITABLE_DIR`) |
| `quran_backend/auth/routes.py` | Frozen-mode APP_DB path |
| `quran_backend/sync_service.py` | Frozen-mode `_WRITABLE_DIR` / `_SRC_DIR` |
| `.gitignore` | Added `src-tauri/target/`, sidecar exe, `gen/` |

### Documentation

- Planning doc: [`Tauri_Desktop_App_Plan.md`](./Technical%20Implementation%20Journey/Tauri_Desktop_App_Plan.md)
- Session logs: `2026-02-17-001` (planning), `002` (Phase 1), `003` (Phase 2), `004` (Phase 3), `005` (Phase 4)

### Phase 5 (Pending)

- [ ] Test `tauri build` → NSIS installer
- [ ] Test installer on clean Windows machine
- [ ] Verify Supabase sync from installed app
- [ ] Code-sign exe to avoid SmartScreen warnings

---

## Phase 17.0.1: Remove "View Report" Button from Teacher Dashboard

**Status:** DONE
**Date:** 18 February 2026

Removed the "View Report" button from student cards on TeacherDashboard. The button navigated to `/teacher/classes?report=ID` which is redundant — the Classes tab already shows the full report inline for the selected student (added in Phase 16.2).

### Files Modified

| File | Changes |
|------|---------|
| `src/pages/TeacherDashboard.tsx` | Removed "View Report" button from student cards (kept "Remove" button) |

---

## Phase 18: Flutter Offline QPC Fonts + Classes Tab Revamp

**Status:** DONE
**Date:** 18 February 2026

### Overview

Two major Flutter mobile app changes: (1) bundled QPC fonts for fully offline Quran rendering, and (2) revamped classes screen with student reports matching the web app's Phase 16.2 design. Also added character-level mistake rendering on the Mushaf page.

### Part 1: Offline QPC Fonts (Phase A)

Bundled all 604 QPC TTF font files (~92MB) as Flutter assets, eliminating the dependency on the FastAPI backend for font loading. The Quran reader now works completely offline on mobile devices.

**Changes:**
- Copied 604 TTFs from `quran_backend/fonts/qpc/` to `quran_mobile/assets/fonts/qpc/`
- Rewrote `QpcFontService._downloadFontMobile()` → `_loadFontFromAssets()` using `rootBundle.load()`
- Deleted `qpc_font_io_mobile.dart` and `qpc_font_io_stub.dart` (disk cache no longer needed)
- Simplified `quran_page_provider.dart` baseUrl for mobile

### Part 2: Classes Tab Revamp (Phases B-E)

Rewrote the Flutter classes screen to match the web app's inline report dashboard (Phase 16.2), with student pills, month filters, summary stats, and tabbed report view.

**New data layer:**
- `student_report.dart` — 9 model classes (StudentReport, StudentInfo, ReportSummary, etc.)
- `report_filters.dart` — DatePreset enum, ReportFilters, PerformanceStats
- `report_helpers.dart` — pure helper functions ported from web's `report-helpers.ts`
- `report_provider.dart` — Riverpod providers (studentReport, reportFilters, filteredReport, performanceStats)

**New report widgets** (6 files under `presentation/screens/classes/report/`):
- `report_summary_strip.dart` — 5-stat horizontal strip
- `report_filter_bar.dart` — month pills + surah/juz selectors
- `report_classes_tab.dart` — classes table with expandable rows
- `report_mistakes_tab.dart` — mistakes by surah bar chart + repeated mistakes list
- `report_performance_tab.dart` — performance bar chart + stats sidebar
- `report_panel.dart` — report orchestrator (tabs, filters, data fetching)

**Classes screen rewrite:**
- Teacher view: student pills at top → select student → inline ReportPanel
- Student view: own report displayed directly (no student selector)
- Fixed `teacherStudentsProvider` — removed `if (!kIsWeb) return []` guard

### Part 3: Character-Level Mistake Rendering (Phase G)

Added per-character mistake highlighting on the Mushaf page, matching the web app's character-level rendering system.

**Changes:**
- `mushaf_page_widget.dart` — added `_getMistakeLevel` for char-level detection + rendering with `textUthmani` + Amiri font
- `classroom_screen.dart` — char-level mistake removal with picker dialog
- `arabic_text_utils.dart` — shared Arabic word parser extracted from `word_popup.dart`

### Files Created

| File | Purpose |
|------|---------|
| `quran_mobile/assets/fonts/qpc/QCF_P001.ttf` ... `QCF_P604.ttf` | 604 bundled QPC font files |
| `quran_mobile/lib/data/models/student_report.dart` | Report data models |
| `quran_mobile/lib/data/models/report_filters.dart` | Filter + stats models |
| `quran_mobile/lib/core/services/report_helpers.dart` | Pure helper functions |
| `quran_mobile/lib/core/services/arabic_text_utils.dart` | Shared Arabic word parser |
| `quran_mobile/lib/presentation/providers/report_provider.dart` | Report Riverpod providers |
| `quran_mobile/lib/presentation/screens/classes/report/report_panel.dart` | Report orchestrator |
| `quran_mobile/lib/presentation/screens/classes/report/report_filter_bar.dart` | Filter bar widget |
| `quran_mobile/lib/presentation/screens/classes/report/report_summary_strip.dart` | Summary strip widget |
| `quran_mobile/lib/presentation/screens/classes/report/report_classes_tab.dart` | Classes tab widget |
| `quran_mobile/lib/presentation/screens/classes/report/report_mistakes_tab.dart` | Mistakes tab widget |
| `quran_mobile/lib/presentation/screens/classes/report/report_performance_tab.dart` | Performance tab widget |

### Files Modified

| File | Changes |
|------|---------|
| `quran_mobile/pubspec.yaml` | Added `assets/fonts/qpc/` to assets list |
| `quran_mobile/lib/core/services/qpc_font_service.dart` | Replaced HTTP download with `rootBundle.load()` |
| `quran_mobile/lib/presentation/providers/quran_page_provider.dart` | Simplified baseUrl for mobile |
| `quran_mobile/lib/presentation/providers/providers.dart` | Fixed teacherStudentsProvider kIsWeb guard |
| `quran_mobile/lib/presentation/screens/classes/classes_screen.dart` | Full rewrite — student pills + ReportPanel |
| `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` | Char-level mistake rendering |
| `quran_mobile/lib/presentation/screens/classroom/word_popup.dart` | Extracted parser to shared util |
| `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` | Char-level mistake removal |

### Files Deleted

| File | Reason |
|------|--------|
| `quran_mobile/lib/core/services/qpc_font_io_mobile.dart` | Disk cache no longer needed |
| `quran_mobile/lib/core/services/qpc_font_io_stub.dart` | Web stub no longer needed |

### Documentation

- Planning doc: [`Flutter_Local_Quran_And_Classes_Revamp_Plan.md`](./Technical%20Implementation%20Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md)
- Session log: `docs/Logs/2026-02-18-003-flutter-local-quran-and-classes-revamp.md`

---

## Phase 19: Portion Management, Char-Level Polish & Smart Suggestions

**Status:** DONE
**Date:** 19 February 2026

### Overview

Nine features across web and Flutter: edit/delete portions, "By Juz" selection, character-level mistake polish, tab overflow fix, and smart suggestions. Implemented by a 4-agent team (Web Portions, Flutter Portions, Flutter Polish, Docs).

### Web — Edit / Delete / "By Juz" Portions (Features 1-3)

Migrated portion CRUD from legacy FastAPI fetch calls to Supabase client queries and added Juz-based portion selection.

**Edit Portion:**
- Added `updateAssignment()` to `supabase-api.ts` (`.update().eq('id', assignmentId)` + cache invalidation)
- Added `addClassAssignments()` for bulk insert
- Replaced legacy FastAPI `fetch` calls in `api.ts` with re-exports from `supabase-api.ts`

**Delete Portion:**
- Added `deleteAssignment()` to `supabase-api.ts` (`.delete().eq('id', assignmentId)`)
- Added `handleDeletePortion` in `Classroom.tsx` with `confirm()` dialog + last-portion protection
- Trash icon button next to edit pencil in portion selector

**"By Juz" Selection:**
- Added `'juz'` to `SinglePortion.mode` type union in `TeacherClasses.tsx`
- "By Juz" toggle + Juz dropdown (1-30) auto-fills surah/ayah from `JUZ_BOUNDARIES`
- "Quick Fill from Juz" dropdown in both Add and Edit Portion modals in `Classroom.tsx`

### Flutter — Edit / Delete / "By Juz" Portions (Features 4-6)

Mirrored the web's portion management in Flutter with dual-path architecture (Supabase on web, local SQLite on mobile).

**Edit Portion:**
- Added `updateAssignment()` to `ClassesNotifier` in `providers.dart` (dual-path Supabase/SQLite)
- Edit pencil button + `StatefulBuilder` bottom sheet in `classroom_screen.dart`

**Delete Portion:**
- Added `deleteAssignment()` to `class_repository.dart` (soft delete: `is_deleted: 1` for sync compatibility)
- `ClassesNotifier` in `providers.dart`: hard delete on web/Supabase, soft delete on mobile
- Trash icon + `AlertDialog` confirmation in `classroom_screen.dart`, last-portion protection

**"By Juz" Selection:**
- Added `JuzBoundary` class + full 30-entry `juzBoundaries` list to `quran_data.dart`
- Updated `report_helpers.dart` to use public `juzBoundaries` instead of private `_JuzBoundary`
- "By Juz" toggle + Juz dropdown in `create_class_screen.dart`

### Flutter — Character-Level Mistake Polish (Feature 7)

Closed 3 gaps between Flutter and web character-level mistake rendering.

- **Missing harakat codes:** Added 6 Unicode codes (0x0659–0x065E) to `arabic_text_utils.dart` — Flutter now matches web's 21 harakat codes (was 15)
- **Shadda combination:** Updated `parseArabicWord()` and `groupArabicCharacters()` to combine shadda + following haraka into single entry (matching web's `splitArabicWord`)
- **Haraka glow effect:** Added `fontSize: 26`, `FontWeight.bold`, two `Shadow` layers (blurRadius 8 + 16) in `mushaf_page_widget.dart` for mistaken harakat

### Flutter — Tab Overflow Fix (Feature 8)

Wrapped `_TabButton` widgets in `Expanded` in `report_panel.dart` so all 3 tabs share width equally, preventing ~4.3px overflow on narrow screens.

### Flutter — Smart Suggestions (Feature 9)

Intelligent portion suggestions based on student's previous classes.

- **Model:** Created `suggested_portions.dart` with `SuggestedPortion` and `SuggestedPortions` data classes
- **Provider:** Added `suggestedPortionsProvider` (FutureProvider.family) to `providers.dart` — queries Supabase for student's last 10 classes, extracts hifz/sabqi/manzil portions, falls back to Al-Mulk (Surah 67)
- **UI:** Smart Suggestions panel in `create_class_screen.dart` — purple gradient, lightbulb icon, 3-column grid of suggestion cards (HIFZ/blue, SABQI/cyan, MANZIL/grey), tap to auto-fill

### Files Created

| File | Purpose |
|------|---------|
| `quran_mobile/lib/data/models/suggested_portions.dart` | Smart Suggestions data models |

### Files Modified

| File | Changes |
|------|---------|
| `quran_frontend/src/lib/supabase-api.ts` | Added `updateAssignment()`, `addClassAssignments()`, `deleteAssignment()` |
| `quran_frontend/src/api.ts` | Replaced legacy FastAPI fetch with Supabase re-exports |
| `quran_frontend/src/pages/Classroom.tsx` | Delete handler, trash icon, "Quick Fill from Juz" in modals |
| `quran_frontend/src/pages/TeacherClasses.tsx` | `'juz'` mode, "By Juz" toggle + dropdown |
| `quran_mobile/lib/core/services/arabic_text_utils.dart` | 6 missing harakat codes, shadda combination logic |
| `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` | Haraka glow effect in `_buildCharLevelWord()` |
| `quran_mobile/lib/presentation/providers/providers.dart` | `updateAssignment()`, `deleteAssignment()` in ClassesNotifier; `suggestedPortionsProvider` |
| `quran_mobile/lib/data/repositories/class_repository.dart` | `deleteAssignment()` soft delete |
| `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` | Edit pencil + bottom sheet, trash icon + delete dialog |
| `quran_mobile/lib/data/quran_data.dart` | `JuzBoundary` class + `juzBoundaries` list |
| `quran_mobile/lib/core/services/report_helpers.dart` | Public `juzBoundaries` import |
| `quran_mobile/lib/presentation/screens/classes/create_class_screen.dart` | "By Juz" toggle + dropdown, Smart Suggestions panel |
| `quran_mobile/lib/presentation/screens/classes/report/report_panel.dart` | `_TabButton` wrapped in `Expanded` |

### Documentation

- Planning docs: [`Web_Portion_Management_Plan.md`](./Technical%20Implementation%20Journey/Web_Portion_Management_Plan.md), [`Flutter_Portion_Management_Plan.md`](./Technical%20Implementation%20Journey/Flutter_Portion_Management_Plan.md), [`Flutter_CharLevel_Mistakes_Alignment.md`](./Technical%20Implementation%20Journey/Flutter_CharLevel_Mistakes_Alignment.md)
- Session log: `docs/Logs/2026-02-19-002-feature-implementation.md`

---

## Phase 20: Post-Launch Polish, Student View Audit & Tooling (Feb 19–22, 2026)

Comprehensive polish pass across web and mobile — fixing edge-case bugs from Phase 19, auditing the student experience end-to-end, extracting components for performance, and improving developer tooling.

### Web — Class Creation & Dashboard Polish

**Default portion sections enabled:**
- All three portion sections (Hifz, Sabqi, Manzil) now default to enabled in the new class creation modal (`TeacherClasses.tsx`)
- Previously only Hifz was enabled by default, confusing teachers

**Recent Classes on Teacher Dashboard:**
- Added "Recent Classes" section to `TeacherDashboard.tsx` showing last 5 classes with student names, date, and portion summaries
- Fixed navigation to use correct class IDs and student context
- Fixed styling and student name display

**Light/Dark mode for class creation modals:**
- Fixed all modals in `TeacherClasses.tsx` (New Class, Edit Class, Add Portion, Edit Portion) to properly support light mode
- Added `dark:` prefixes for backgrounds, text, borders, and input fields

**Juz selection boundary bug:**
- Fixed `TeacherClasses.tsx` — switching to "By Juz" mode wasn't applying `JUZ_BOUNDARIES` data until user changed the dropdown value
- Now auto-fills surah/ayah fields immediately on mode switch

**Number input UX:**
- Fixed page/ayah number inputs in class creation modal to prevent non-numeric input and enforce min/max constraints

**Input focus loss fix (React anti-pattern):**
- Root-caused input fields losing focus on every keystroke in class creation modal
- **Cause:** `PortionSelector` and `ToggleSwitch` were defined as arrow functions *inside* the `TeacherClasses` render function, creating new component references on every re-render → React unmounts/remounts DOM
- **Fix:** Extracted both as standalone `function` components outside the parent, with explicit props (`darkMode`, `surahList`, `modalBodyRef`) replacing closure captures
- Net change: 387 insertions, 355 deletions in `TeacherClasses.tsx`

**Error logging for mistake_occurrences:**
- Added detailed error logging for `mistake_occurrences` insert failures in `supabase-api.ts` to help diagnose sync issues

### Web — Student View Audit

Full audit of the student experience revealed multiple issues:

- **Stats fix:** `getStats()` in `supabase-api.ts` was failing for students because it queried `class_students` with teacher-oriented logic — fixed to query student's own classes
- **Light mode:** Fixed `StudentDashboard.tsx` and `StudentClasses.tsx` backgrounds, text colors, and card styles for light mode
- **Navigation links:** Fixed broken links on student dashboard (Classes, Quran Reader, Settings)
- **StudentClasses redesign:** Complete visual overhaul — card-based layout with portion chips, teacher name, date, and status indicators (replacing plain table)

### Mobile — Character-Level Mistake Bug Fixes

Several critical bugs prevented char-level mistakes from rendering on Flutter/Supabase:

- **Mistake badges not showing:** Fixed `mushaf_page_widget.dart` — pages without pre-existing mistakes weren't initializing the mistake tracking data structure, so new mistakes on clean pages were invisible
- **Character-level mistakes not rendering on Supabase path:** Fixed code path that was only checking local SQLite for char-level data even when running against Supabase
- **mistake_occurrences never created for UUID classIds:** Fixed `providers.dart` — Supabase UUID class IDs were being compared with integer equality, causing occurrence inserts to silently fail
- **Rendering style alignment:** Updated `mushaf_page_widget.dart` to match web's char-level rendering style (glow effects, font sizing, color coding)
- **Arabic letter joining:** Fixed `arabic_text_utils.dart` — isolated Arabic letters weren't joining correctly in char-level mistake display; added proper Unicode joining logic
- **Gaps documented:** Created `Flutter_CharLevel_Mistakes_Alignment.md` documenting remaining differences between web and Flutter rendering

### Mobile — "By Page" Portion Selector

- Added "By Page" selection mode to `create_class_screen.dart` — enter start/end page numbers directly
- Complements existing "By Surah" and "By Juz" modes

### Developer Tooling

**Nuke All Data script:**
- Created `quran_backend/scripts/nuke_all_data.py` — wipes ALL data from both Supabase and local SQLite
- Supabase: deletes all rows from 7 tables (mistake_occurrences → profiles) + deletes all auth users via Admin API
- Local SQLite: empties all 12 tables in foreign-key-safe order
- Safety: requires typing "NUKE" to confirm

**Scripts reorganization:**
- Moved 5 utility scripts into `quran_backend/scripts/` folder (was cluttering backend root)
- Updated all `Path(__file__).parent` references to `Path(__file__).parent.parent`
- Files moved: `create_test_users.py`, `clear_mistakes.py`, `seed_database.py`, `nuke_all_data.py`, `seed.js`

### Documentation Updates

- Updated root `README.md` with fuller feature descriptions, current project structure, and scripts/ paths
- Updated `docs/README.md` with all newer docs and quick links
- Updated `CLAUDE.md` and `AGENTS.md` with scripts/ folder structure and new commands
- Updated `PROJECT_MAP.md` and `PROJECT_MAP.html` with 47 commits of changes (new Tauri section, Flutter report system, scripts reorganization)

### Files Created

| File | Purpose |
|------|---------|
| `quran_backend/scripts/nuke_all_data.py` | Wipe all data from Supabase + local SQLite |

### Files Modified

| File | Changes |
|------|---------|
| `quran_frontend/src/pages/TeacherClasses.tsx` | Extracted PortionSelector/ToggleSwitch as standalone components; default portions enabled; juz boundary fix; number input UX; light/dark mode |
| `quran_frontend/src/pages/TeacherDashboard.tsx` | Recent Classes section |
| `quran_frontend/src/pages/StudentDashboard.tsx` | Light mode fixes, navigation link fixes |
| `quran_frontend/src/pages/StudentClasses.tsx` | Complete visual redesign with card-based layout |
| `quran_frontend/src/pages/Classroom.tsx` | Light/dark mode for modals |
| `quran_frontend/src/lib/supabase-api.ts` | Student stats fix, error logging for mistake_occurrences |
| `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` | Mistake badge init fix, char-level Supabase path fix, rendering style alignment |
| `quran_mobile/lib/presentation/providers/providers.dart` | UUID class ID comparison fix for mistake_occurrences |
| `quran_mobile/lib/core/services/arabic_text_utils.dart` | Arabic letter joining in char-level display |
| `quran_mobile/lib/presentation/screens/classes/create_class_screen.dart` | "By Page" portion selector |
| `quran_backend/scripts/create_test_users.py` | Path update for scripts/ move |
| `quran_backend/scripts/clear_mistakes.py` | Path update for scripts/ move |
| `quran_backend/scripts/seed_database.py` | Path update for scripts/ move |
| `quran_backend/scripts/seed.js` | Moved to scripts/ |
| `README.md` | Updated features, project structure, scripts paths |
| `docs/README.md` | Updated doc map and quick links |
| `CLAUDE.md` | Updated codebase map and common tasks |
| `AGENTS.md` | Synced with CLAUDE.md |
| `PROJECT_MAP.md` | Updated with 47 commits of changes |

### Session Logs

- `docs/Logs/2026-02-21-001-input-focus-fix.md`
- `docs/Logs/2026-02-21-002-auto-update-strategy.md`
- `docs/Logs/2026-02-21-003-nuke-all-data.md`
- `docs/Logs/2026-02-21-004-project-map-update.md`

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

**Desktop (Tauri):**
```bash
cd quran_frontend
npm run tauri:dev    # Launches native window + sidecar backend
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