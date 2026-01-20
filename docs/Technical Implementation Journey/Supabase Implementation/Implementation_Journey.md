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

## Step 13: RLS Infinite Recursion Fix (20 January 2026)

During testing, discovered a critical RLS policy bug causing infinite recursion.

**Problem Discovered:**
- App stuck on "Loading..." screen after login
- Browser console showed: `"infinite recursion detected in policy for relation 'class_students'"`

**Root Cause:**
Two RLS policies created a circular dependency:
1. `classes` table policy "Students can view their classes" queried `class_students` table
2. `class_students` table policy "Teachers can manage class students" queried `classes` table

When PostgreSQL evaluated the `class_students` policy, it triggered the `classes` policy, which triggered `class_students` again → infinite loop.

**Solution:**
Created a `SECURITY DEFINER` function to break the recursion cycle:

```sql
-- Function that bypasses RLS to check class ownership
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

-- Drop the problematic policy
DROP POLICY "Teachers can manage class students" ON public.class_students;

-- Create new policy using the function (no recursion)
CREATE POLICY "Teachers can manage class students"
ON public.class_students FOR ALL
USING (public.is_class_teacher(class_id));

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_class_teacher(uuid) TO authenticated;
```

**Why SECURITY DEFINER Works:**
- `SECURITY DEFINER` functions run with the privileges of the function owner (postgres)
- This bypasses RLS checks within the function
- The function can query `classes` directly without triggering the `classes` RLS policy
- Breaks the circular dependency while maintaining security

**Testing Results:**
- ✅ Login successful - no more infinite loading
- ✅ Auth state changes properly (INITIAL_SESSION → SIGNED_IN)
- ✅ Student dashboard loads correctly
- ✅ User profile displays properly
- ✅ No console errors

---

## Step 14: Frontend Integration Verified (20 January 2026)

Full integration testing completed successfully.

**Test Results:**
- Auth flow: ✅ Working
- Session persistence: ✅ Working
- Profile fetch: ✅ Working
- Dashboard loading: ✅ Working

**Technical Notes:**
- Cleared stale localStorage to fix initial loading issue
- Demo accounts from Login.tsx won't work (they're from old SQLite database)
- Real Supabase accounts must be created via signup or dashboard

---

## Step 15: Race Condition Fix (20 January 2026)

Added cleanup handlers to prevent state updates on unmounted components.

**Problem Discovered:**
- Clicking quickly between pages (My Classes → My Dashboard) caused app to freeze
- All pages showed "Loading..." indefinitely
- Even sign out stopped working
- No console errors visible

**Root Cause:**
When navigating quickly:
1. Component A starts loading data (API calls to Supabase)
2. User navigates to Component B before API returns
3. Component A unmounts but API calls still pending
4. API returns, tries to update state on unmounted component
5. State gets corrupted, app freezes

**Solution:**
Added `isMounted` flag pattern to all page components:

```typescript
useEffect(() => {
  let isMounted = true;

  async function loadData() {
    try {
      const data = await getClasses('student');
      if (isMounted) {
        setClasses(data);
        setLoading(false);
      }
    } catch (err) {
      if (isMounted) {
        setLoading(false);
      }
    }
  }
  loadData();

  return () => {
    isMounted = false;  // Cleanup on unmount
  };
}, []);
```

**Files Modified:**
- `src/pages/StudentDashboard.tsx`
- `src/pages/StudentClasses.tsx`
- `src/pages/TeacherDashboard.tsx`
- `src/pages/TeacherClasses.tsx`

---

## Step 16: localStorage Corruption Fix (20 January 2026)

Diagnosed and fixed a critical issue where the Supabase client hung indefinitely on `getSession()`.

**Problem Discovered:**
- App stuck on "Loading..." forever after successful login
- Session token existed in localStorage (`sb-qwfnbkkegbhwxxjvyhzl-auth-token`)
- Token was NOT expired (49 minutes remaining)
- No console errors visible
- Network requests to Supabase API never appeared

**Diagnosis Process:**
1. Created fresh Supabase client with memory storage → `getSession()` completed instantly (1ms)
2. Same client with localStorage → `getSession()` timed out after 5 seconds
3. Direct fetch to Supabase API → 200 OK response
4. Conclusion: localStorage data was corrupted, causing Supabase client to hang

**Solution:**
Clear all Supabase-related localStorage entries:

```javascript
// Clear corrupted localStorage
const keys = Object.keys(localStorage).filter(k => k.includes('sb-') || k.includes('supabase'));
keys.forEach(k => localStorage.removeItem(k));
```

After clearing, the app worked immediately and login created a fresh, valid session.

**Prevention:**
Added better error handling and logging to AuthContext.tsx:
- Try-catch around `getSession()` call
- `isMounted` cleanup pattern to prevent orphaned promises
- Detailed logging for debugging auth issues

**Technical Notes:**
- The Supabase JS client can hang if localStorage contains malformed session data
- This can happen if browser crashes during session save or during debugging
- The session token looked valid (parseable JSON, correct structure) but something internal caused the hang
- Using memory storage bypasses the issue but loses session persistence

---

## Next Steps (Pending)

1. **Mobile Integration** - Update Flutter app to use Supabase client
2. **Realtime Setup** - Enable realtime subscriptions for instant updates
3. **Migrate Remaining Functions** - Tests, portion suggestions, etc.
4. **Create Demo Accounts in Supabase** - Add test users to Supabase for development

---

## References

- Architecture Doc: [Supabase_Migration_Architecture.md](../../Architecture/Supabase_Migration_Architecture.md)
- Supabase Reference: [Supabase_Reference.md](./Supabase_Reference.md)
- Supabase Dashboard: https://supabase.com/dashboard/project/qwfnbkkegbhwxxjvyhzl
