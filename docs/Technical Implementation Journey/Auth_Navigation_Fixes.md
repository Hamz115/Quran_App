# Authentication & Navigation Fixes

## Overview

This document covers fixes made to resolve authentication state issues and navigation problems that were causing the app to redirect to the login page unexpectedly.

## Issues Fixed

### 1. Profile Fetch Timeout Causing Logout

**Problem**: When navigating between pages, the app would sometimes go blank (blue screen) and redirect to the login page. Console showed: `AuthContext: Profile fetch in onChange failed: Error: TIMEOUT:fetchProfile-onChange`

**Root Cause**:
- Supabase triggers `onAuthStateChange` events during navigation (e.g., token refresh)
- When profile fetch timed out during these events, the user state wasn't properly maintained
- `ProtectedRoute` checks `isAuthenticated` (which is `!!user`), so if user becomes falsy, it redirects to login

**Solution** (AuthContext.tsx):
```typescript
// When profile fetch fails but session exists:
// 1. Keep existing user state if we have one
// 2. Create minimal user from session data if no previous user
setUser(prev => {
  if (prev) {
    console.log('AuthContext: Keeping existing user state despite profile fetch failure');
    return prev;
  }
  // Create minimal user from session
  const sessionUser = newSession.user;
  return {
    id: sessionUser.id,
    student_id: '',
    username: sessionUser.email?.split('@')[0] || '',
    email: sessionUser.email || '',
    first_name: sessionUser.user_metadata?.name?.split(' ')[0] || '',
    last_name: sessionUser.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
    role: sessionUser.user_metadata?.role || 'student',
    is_verified: sessionUser.email_confirmed_at ? true : false,
    created_at: sessionUser.created_at || new Date().toISOString(),
  };
});
```

### 2. Premature User State Clearing

**Problem**: User state was being cleared on any null session, even temporary ones during token refresh.

**Solution**:
- Only clear user on explicit `SIGNED_OUT` event
- For null sessions without SIGNED_OUT, wait 1 second and recheck before clearing
```typescript
} else if (event === 'SIGNED_OUT') {
  // Only clear user on explicit sign out
  setUser(null);
} else if (!newSession) {
  // Session is null but not a sign out event - might be temporary
  setTimeout(async () => {
    const { data: { session: checkSession } } = await supabase.auth.getSession();
    if (!checkSession && isMounted) {
      setUser(null);
    }
  }, 1000);
}
```

### 3. Full Page Reloads Breaking Auth State

**Problem**: Navigation buttons used `window.location.href` which causes full page reloads, triggering auth state re-initialization and potential timeouts.

**Files Affected**:
- `TeacherDashboard.tsx` - "Start New Class" buttons
- `StudentClasses.tsx` - Class card clicks

**Solution**: Replace `window.location.href` with React Router's `navigate()`:
```typescript
// Before (causes full reload)
onClick={() => window.location.href = '/teacher/classes?new=1'}

// After (SPA navigation, preserves state)
onClick={() => navigate('/teacher/classes?new=1')}
```

### 4. Missing Class Card Navigation

**Problem**: Clicking on class cards in TeacherClasses didn't navigate to the classroom - nothing happened.

**Solution**: Added onClick handler and cursor styling to class cards:
```typescript
<div
  key={cls.id}
  onClick={() => navigate(`/teacher/classes/${cls.id}`)}
  className={`rounded-xl border overflow-hidden cursor-pointer transition-colors ...`}
>
```

## Files Modified

| File | Changes |
|------|---------|
| `src/contexts/AuthContext.tsx` | Added resilient profile fetch handling, session recovery logic |
| `src/pages/TeacherDashboard.tsx` | Added useNavigate, replaced window.location.href |
| `src/pages/TeacherClasses.tsx` | Added useNavigate, added class card onClick handler |
| `src/pages/StudentClasses.tsx` | Added useNavigate, replaced window.location.href |

## Related: RLS Policy Fix (Supabase)

Earlier in this session, a recursive RLS policy was also fixed:

**Problem**: The policy "Teachers can lookup any student profile" had a recursive subquery that caused infinite loops and timeouts.

**Original Policy** (recursive - caused timeouts):
```sql
CREATE POLICY "Teachers can lookup any student profile" ON profiles
FOR SELECT USING (
  role = 'student' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'
  )
);
```

**Fixed Policy** (using SECURITY DEFINER function):
```sql
-- Function that bypasses RLS
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy using the function (no recursion)
CREATE POLICY "Teachers can lookup any student profile" ON profiles
FOR SELECT USING (role = 'student' AND public.is_teacher());
```

## API Migration: FastAPI to Supabase

Several legacy FastAPI endpoints were returning 401 Unauthorized because they expected JWT tokens that weren't being sent. These were migrated to use Supabase directly.

### Mistakes API

**Problem**: `/api/mistakes/with-occurrences` returned 401 Unauthorized.

**Cause**: The legacy fetch call had no Authorization header:
```typescript
// OLD - No auth!
const res = await fetch(`${API_BASE}/mistakes/with-occurrences`);
```

**Solution**: Created Supabase version in `supabase-api.ts`:
```typescript
export async function getMistakesWithOccurrences(surahNumber?: number, studentId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase.from('mistakes').select(`
    *,
    mistake_occurrences (class_id, classes (date))
  `);
  // ... filters and mapping
}
```

### Suggested Portions API

**Problem**: `/api/students/{id}/suggested-portions` returned 401 Unauthorized.

**Solution**: Created Supabase version that:
1. Finds student's most recent class
2. Returns the assignments from that class as suggestions
3. Teacher can then adjust from there (no need to scroll to find the surah)

### isTeacher Bug

**Problem**: `Classroom.tsx` used `user?.is_verified === true` to check if user is a teacher.

**Fix**: Changed to `user?.role === 'teacher'`

### Auto-publish Classes

**Problem**: New classes defaulted to "Draft" mode, so students couldn't see them.

**Solution**: Classes now auto-publish on creation (`is_published: true`).

## Files Modified (API Migration)

| File | Changes |
|------|---------|
| `src/lib/supabase-api.ts` | Added `getMistakesWithOccurrences`, `getSuggestedPortions` |
| `src/api.ts` | Removed legacy FastAPI versions, re-export from Supabase |
| `src/pages/Classroom.tsx` | Fixed `isTeacher` check |

## Testing Checklist

- [ ] Login as Teacher 1 (hamzaferoze115@gmail.com)
- [ ] Click "Start New Class" from dashboard - should navigate without redirect to login
- [ ] Click on an existing class - should open the classroom
- [ ] Click on words in classroom - popup should appear to mark mistakes
- [ ] Mark a mistake - should save and word should highlight
- [ ] Create a new class - suggestions should auto-populate from last class
- [ ] New class should be visible to student immediately (auto-published)
- [ ] Login as Student 1 (hamza@iiotsolutions.sa)
- [ ] Click on a class - should navigate to classroom
- [ ] Sign up new account and verify email - should auto-login after verification

## Key Learnings

1. **Don't query a table from within its own RLS policy** - causes infinite recursion
2. **Use SECURITY DEFINER functions** to bypass RLS when needed for policy checks
3. **Use React Router's navigate()** instead of `window.location.href` in SPAs to preserve state
4. **Auth state handlers should be resilient** - don't lose user state on temporary failures
5. **Only clear auth on explicit sign out** - null sessions can be temporary during token refresh
6. **Migrate legacy APIs to Supabase** - Supabase client handles auth automatically
7. **Check role, not verification status** - `user.role === 'teacher'` not `user.is_verified`
