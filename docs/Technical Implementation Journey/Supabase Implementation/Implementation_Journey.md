# Supabase Implementation Journey

A step-by-step record of how Supabase was set up for QuranTrack.

---

## Step 1: Architecture Discussion (18 January 2026)

Discussed the problem of connecting Teacher and Student apps without a 24/7 cloud server.

**Problem:**
- Current setup: FastAPI backend + SQLite on local computer
- Students can only connect when on same WiFi network
- Goal: Students should be able to sync from anywhere (home, school, etc.)

**Options Considered:**
1. **Traditional Cloud Database** - Expensive, requires server maintenance
2. **S3 + Tiny Server** - Complex, still needs server code
3. **Google Drive** - Complex OAuth, not designed for databases
4. **Supabase** - Free tier, built-in auth, realtime, auto-generated API

**Decision:** Supabase was chosen as the best solution.

---

## Step 2: Account Setup (19 January 2026)

Created Supabase account and new project.

**Actions:**
1. Navigated to [supabase.com](https://supabase.com)
2. Created new account
3. Created new project: "Hamz115's Project"
4. Selected region: **Asia Pacific** (Middle East not available)
5. Configured settings:
   - Data API enabled
   - Connection String enabled
   - Public schema exposed
   - Normal Postgres (not Pooled)

**Project Details:**
- Project ID: `qwfnbkkegbhwxxjvyhzl`
- Project URL: `https://qwfnbkkegbhwxxjvyhzl.supabase.co`

---

## Step 3: API Keys Retrieved (19 January 2026)

Retrieved API keys from Project Settings > API.

**Keys Retrieved:**
- `anon` key (also called "publishable") - Safe to use in frontend
- `service_role` key (also called "secret") - Server-side only, never expose

**Storage:**
API keys stored securely by Hamza in a private location.

---

## Step 4: Database Schema Created (19 January 2026)

Created all database tables via SQL Editor.

**Tables Created (7 total):**
1. `profiles` - User profiles (extends auth.users)
2. `teacher_students` - Teacher-student relationships
3. `classes` - Class sessions
4. `class_students` - Students in each class (junction table)
5. `assignments` - Hifz, Sabqi, Revision assignments
6. `mistakes` - Global mistakes per student
7. `mistake_occurrences` - When each mistake occurred

**Method:**
- Used SQL Editor in Supabase dashboard
- Injected SQL via JavaScript into Monaco editor
- Query saved as "QuranTrack Supabase Schema"

---

## Step 5: Row Level Security (RLS) Enabled (19 January 2026)

Enabled RLS on all tables and created security policies.

**Why RLS:**
- Without RLS, anyone with the anon key could access ALL data
- RLS ensures users can only see data they're authorized to see

**Policies Created (14 total):**
- Profiles: 4 policies (view own, update own, teachers view students, students view teachers)
- Teacher_students: 2 policies (teachers manage, students view)
- Classes: 2 policies (teachers manage, students view published)
- Class_students: 2 policies (teachers manage, students view own)
- Assignments: 2 policies (teachers manage, students view)
- Mistakes: 2 policies (teachers manage for students, students view own)
- Mistake_occurrences: 2 policies (teachers manage, students view own)

**Method:**
- Used SQL Editor in Supabase dashboard
- Query saved as "QuranTrack Row-Level Security Policies"

**Verification:**
- Security Advisor showed 0 errors, 0 warnings
- All tables now show RLS enabled (no "Unrestricted" badge)

---

## Step 6: Triggers Created (19 January 2026)

Created database triggers for automatic actions.

**Triggers Created (4 total):**

1. **`on_auth_user_created`** on `auth.users`
   - Fires when a new user signs up
   - Automatically creates a profile entry
   - Extracts name from user metadata or uses email prefix
   - Defaults role to 'student'

2. **`update_profiles_updated_at`** on `profiles`
   - Fires before UPDATE
   - Sets `updated_at` to current timestamp

3. **`update_classes_updated_at`** on `classes`
   - Fires before UPDATE
   - Sets `updated_at` to current timestamp

4. **`update_mistakes_updated_at`** on `mistakes`
   - Fires before UPDATE
   - Sets `updated_at` to current timestamp

**Functions Created (2 total):**
1. `handle_new_user()` - Creates profile on signup
2. `update_updated_at()` - Updates timestamp

**Method:**
- Used SQL Editor in Supabase dashboard
- Query saved as "Auto-create Profiles & Update Timestamps"

---

## Step 7: Verification (19 January 2026)

Verified all components were created correctly.

**Table Editor Check:**
- All 7 tables visible
- All tables show RLS enabled
- Column structures correct

**Security Advisor Check:**
- 0 errors
- 0 warnings
- 0 suggestions

**Saved SQL Queries:**
1. QuranTrack Supabase Schema
2. QuranTrack Row-Level Security Policies
3. Auto-create Profiles & Update Timestamps

---

## Step 8: Frontend Package Setup (19 January 2026)

Installed Supabase client library in React frontend.

**Actions:**
1. Ran `npm install @supabase/supabase-js` in `quran_frontend/`
2. Created `.env.local` with Supabase URL and anon key
3. Created `.env.example` as template for other developers
4. Verified `.gitignore` already ignores `*.local` files

**Files Created:**
- `quran_frontend/.env.local` - Contains actual credentials (not committed)
- `quran_frontend/.env.example` - Template for credentials

---

## Step 9: Supabase Client Created (19 January 2026)

Created the Supabase client module and TypeScript types.

**Files Created:**
- `src/lib/supabase.ts` - Supabase client initialization with auth config
- `src/lib/database.types.ts` - TypeScript types for all 7 tables

**Features:**
- Auto-refresh tokens enabled
- Session persistence in localStorage
- Typed client using generated Database interface
- Helper function `getCurrentUserId()` for convenience

---

## Step 10: Auth Migration (19 January 2026)

Replaced custom JWT auth with Supabase Auth.

**Files Modified:**
- `src/contexts/AuthContext.tsx` - Complete rewrite to use Supabase Auth
- `src/pages/Login.tsx` - Changed from "email or username" to email-only login
- `src/pages/Signup.tsx` - No changes needed (already passes correct data)

**Key Changes:**
- Removed manual token management (setTokens, clearTokens, refreshTokens)
- Added `supabase.auth.onAuthStateChange()` listener for automatic session sync
- Profile fetched from `profiles` table after successful auth
- `fetchUserProfile()` maps Supabase profile to existing User type

**Backward Compatibility:**
- AuthContext interface unchanged: user, isAuthenticated, isVerified, login, signup, logout
- Existing components work without modification

---

## Step 11: API Migration (19 January 2026)

Created new API modules for Supabase data operations.

**Files Created:**
- `src/lib/supabase-api.ts` - Student, class, mistake functions using Supabase client
- `src/lib/quran-api.ts` - Local Quran data functions (still uses FastAPI)

**Files Modified:**
- `src/api.ts` - Updated to re-export from new modules, keeping backward compatibility
- `src/types/index.ts` - Changed entity IDs from `number` to `string` (UUIDs)

**Functions Migrated to Supabase:**
- Students: `getMyStudents`, `lookupStudent`, `addStudent`, `removeStudent`
- Teachers: `getMyTeachers`
- Classes: `getClasses`, `getClass`, `createClass`, `deleteClass`, `updateClassNotes`, `updateClassPerformance`, `updateClassPublish`, `addClassStudents`, `removeClassStudent`
- Mistakes: `getMistakes`, `addMistake`, `removeMistake`
- Stats: `getStats`

**Functions Staying with FastAPI:**
- Quran data: `getSurahs`, `getSurah`, `getQuranPageWords` (local data)
- Tests: All test-related functions (complex logic)
- Backup: `createBackup`, `listBackups`, `restoreBackup`
- Portion suggestions: `getSuggestedPortions`

---

## Step 12: TypeScript Verification (19 January 2026)

Verified all changes compile without errors.

**Verification:**
- Ran `npx tsc --noEmit` - 0 errors
- All new modules properly typed
- Backward compatibility maintained via api.ts facade

---

## Next Steps (Pending)

1. **Testing** - Full integration testing with Supabase backend
2. **Mobile Integration** - Update Flutter app to use Supabase client
3. **Realtime Setup** - Enable realtime subscriptions for instant updates
4. **Migrate Remaining Functions** - Tests, portion suggestions, etc.

---

## References

- Architecture Doc: [Supabase_Migration_Architecture.md](../../Architecture/Supabase_Migration_Architecture.md)
- Supabase Reference: [Supabase_Reference.md](./Supabase_Reference.md)
- Supabase Dashboard: https://supabase.com/dashboard/project/qwfnbkkegbhwxxjvyhzl
