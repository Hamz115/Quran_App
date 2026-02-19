# Web Portion Management Plan

> **Features covered:** Edit Portion (Supabase migration), Delete Portion, "By Juz" Selection Mode
> **Platform:** React Web (`quran_frontend/`)
> **Created:** 2026-02-19

---

## Table of Contents

1. [Feature 1: Edit Portion — Supabase Migration](#feature-1-edit-portion--supabase-migration)
2. [Feature 2: Delete Portion — New Feature](#feature-2-delete-portion--new-feature)
3. [Feature 3: "By Juz" Selection Mode](#feature-3-by-juz-selection-mode)

---

## Feature 1: Edit Portion — Supabase Migration

### Current State

The edit portion feature **already works in the UI** — `Classroom.tsx` has full edit modals and state management. The problem is that the API calls still go through legacy FastAPI instead of Supabase.

**Legacy calls in `api.ts:106-135`:**

```typescript
// api.ts:106-119 — calls FastAPI PATCH /api/assignments/{id}
export async function updateAssignment(assignmentId: string, assignment: {
  type: string;
  start_surah: number;
  end_surah: number;
  start_ayah?: number;
  end_ayah?: number;
}) {
  const res = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assignment),
  });
  return res.json();
}

// api.ts:121-135 — calls FastAPI POST /api/classes/{id}/assignments
export async function addClassAssignments(classId: string, assignments: Array<{
  type: string;
  start_surah: number;
  end_surah: number;
  start_ayah?: number;
  end_ayah?: number;
  student_id?: string;
}>) {
  const res = await fetch(`${API_BASE}/classes/${classId}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assignments),
  });
  return res.json();
}
```

**Existing Supabase patterns in `supabase-api.ts`:**

- Insert pattern at `supabase-api.ts:414-428`:
  ```typescript
  const assignments = classData.assignments.map(a => ({
    class_id: newClass.id,
    type: a.type,
    start_surah: a.start_surah,
    end_surah: a.end_surah,
    start_ayah: a.start_ayah,
    end_ayah: a.end_ayah,
  }));
  const { error } = await supabase.from('assignments' as any).insert(assignments as any);
  ```

- Delete pattern at `supabase-api.ts:437-448` (`deleteClass`):
  ```typescript
  const { error } = await supabase.from('classes' as any).delete().eq('id', classId);
  ```

### What's Missing

Two Supabase functions in `supabase-api.ts` that replace the FastAPI calls.

### Implementation Steps

#### Step 1: Add `updateAssignment()` to `supabase-api.ts`

Add after the `deleteClass` function (~line 449):

```typescript
export async function updateAssignment(assignmentId: string, data: {
  type?: string;
  start_surah?: number;
  end_surah?: number;
  start_ayah?: number | null;
  end_ayah?: number | null;
}): Promise<{ message: string }> {
  const { error } = await supabase
    .from('assignments' as any)
    .update(data as any)
    .eq('id', assignmentId);

  if (error) throw new Error(error.message);

  // Invalidate classes cache so updated assignments show up
  invalidateCache('classes');

  return { message: 'Assignment updated successfully' };
}
```

#### Step 2: Add `addClassAssignments()` to `supabase-api.ts`

Add right after `updateAssignment`:

```typescript
export async function addClassAssignments(classId: string, assignments: Array<{
  type: string;
  start_surah: number;
  end_surah: number;
  start_ayah?: number | null;
  end_ayah?: number | null;
  student_id?: string | null;
}>): Promise<{ message: string }> {
  const rows = assignments.map(a => ({
    class_id: classId,
    type: a.type,
    start_surah: a.start_surah,
    end_surah: a.end_surah,
    start_ayah: a.start_ayah,
    end_ayah: a.end_ayah,
    student_id: a.student_id || null,
  }));

  const { error } = await supabase
    .from('assignments' as any)
    .insert(rows as any);

  if (error) throw new Error(error.message);

  invalidateCache('classes');

  return { message: 'Assignments added successfully' };
}
```

#### Step 3: Update `api.ts` barrel exports

In `api.ts`, the two functions at lines 106-135 should be replaced with re-exports from supabase-api:

```typescript
// ============ ASSIGNMENTS (Supabase) ============
export { updateAssignment, addClassAssignments } from './lib/supabase-api';
```

Remove the old `fetch`-based implementations.

#### Step 4: Verify — No Classroom.tsx Changes Needed

`Classroom.tsx` imports `updateAssignment` and `addClassAssignments` from `../api`. Since `api.ts` will now re-export the Supabase versions, no changes are needed in `Classroom.tsx`.

**Files to modify:**
| File | Action |
|------|--------|
| `src/lib/supabase-api.ts` | Add `updateAssignment()` + `addClassAssignments()` |
| `src/api.ts` | Replace lines 106-135 with re-exports from supabase-api |

---

## Feature 2: Delete Portion — New Feature

### Current State

No delete assignment feature exists anywhere — neither in the frontend UI nor in the Supabase API layer.

**Existing patterns to follow:**
- Delete class: `supabase-api.ts:437-448` — `.delete().eq('id', classId)`
- Edit button pattern: `Classroom.tsx:949-966` — pencil icon button next to each portion

### Implementation Steps

#### Step 1: Add `deleteAssignment()` to `supabase-api.ts`

Add after the `addClassAssignments` function:

```typescript
export async function deleteAssignment(assignmentId: string): Promise<{ message: string }> {
  const { error } = await supabase
    .from('assignments' as any)
    .delete()
    .eq('id', assignmentId);

  if (error) throw new Error(error.message);

  invalidateCache('classes');

  return { message: 'Assignment deleted successfully' };
}
```

#### Step 2: Export from `api.ts`

Add to the barrel exports:

```typescript
export { updateAssignment, addClassAssignments, deleteAssignment } from './lib/supabase-api';
```

#### Step 3: Add `handleDeletePortion` handler in `Classroom.tsx`

Add near the existing `handleEditPortion` and `handleAddPortion` handlers:

```typescript
const handleDeletePortion = async (assignmentId: string) => {
  if (!classData) return;

  // Prevent deleting the last assignment in this section
  const sectionAssignments = classData.assignments.filter(a => a.type === activeSection);
  if (sectionAssignments.length <= 1) {
    alert('Cannot delete the last portion in a section.');
    return;
  }

  if (!confirm('Are you sure you want to delete this portion?')) return;

  try {
    await deleteAssignment(assignmentId);
    // Refresh class data
    await refreshClassData();
    setSelectedPortionIndex(0);
  } catch (err) {
    console.error('Failed to delete portion:', err);
    alert('Failed to delete portion');
  }
};
```

#### Step 4: Add trash icon button in `Classroom.tsx` portion selector

At `Classroom.tsx:949-966`, after the existing edit pencil button, add a delete button:

```tsx
{isTeacher && (
  <div className="flex items-center gap-1">
    <button
      onClick={() => { /* existing edit logic */ }}
      className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 flex items-center justify-center"
    >
      {/* pencil SVG */}
    </button>
    <button
      onClick={() => handleDeletePortion(assignment.id)}
      className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-red-600/50 text-slate-400 hover:text-red-400 flex items-center justify-center"
      title="Delete portion"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>
)}
```

#### Step 5: RLS Consideration

The `assignments` table's RLS policy likely restricts deletes to the teacher who created the class. Verify by checking:
- The `assignments` table has a policy like: `USING (class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid()))`
- If no DELETE policy exists, one must be added in Supabase dashboard

**Files to modify:**
| File | Action |
|------|--------|
| `src/lib/supabase-api.ts` | Add `deleteAssignment()` |
| `src/api.ts` | Add `deleteAssignment` to re-exports |
| `src/pages/Classroom.tsx` | Add `handleDeletePortion`, add trash button in portion selector |

---

## Feature 3: "By Juz" Selection Mode

### Current State

**Data exists — UI doesn't.**

`quran-utils.ts:30-78` has complete Juz boundary data with ayah-level precision:

```typescript
// quran-utils.ts:31-37
interface JuzBoundary {
  juz: number;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
}

// quran-utils.ts:40-71 — all 30 boundaries
export const JUZ_BOUNDARIES: JuzBoundary[] = [
  { juz: 1,  startSurah: 1,  startAyah: 1,   endSurah: 2,   endAyah: 141 },
  { juz: 2,  startSurah: 2,  startAyah: 142,  endSurah: 2,   endAyah: 252 },
  // ... all 30
];

// quran-utils.ts:74-78 — helper function
export function getSurahRangeForJuz(juz: number): { startSurah: number; endSurah: number } | null
```

**Current UI in `TeacherClasses.tsx:478-501`** — mode toggle only has "By Page" and "By Surah":

```tsx
<div className="flex gap-2 mb-2">
  <button onClick={() => updatePortion(portion.id, { mode: 'page' })} ...>By Page</button>
  <button onClick={() => updatePortion(portion.id, { mode: 'surah' })} ...>By Surah</button>
</div>
```

**Juz dropdown pattern exists** in `ReportFilterBar.tsx:163-172` — can be adapted.

### Implementation Steps

#### Step 1: Update `SinglePortion.mode` type

In `TeacherClasses.tsx:16-18`:

```typescript
// Before:
interface SinglePortion {
  id: string;
  mode: 'page' | 'surah';

// After:
interface SinglePortion {
  id: string;
  mode: 'page' | 'surah' | 'juz';
```

Also add a `juz` field to `SinglePortion`:

```typescript
interface SinglePortion {
  id: string;
  mode: 'page' | 'surah' | 'juz';
  startPage: number;
  endPage: number;
  startSurah: number;
  endSurah: number;
  startAyah: string;
  endAyah: string;
  juz: number;  // New field — selected Juz number (1-30)
}
```

Update the default `SinglePortion` factory to include `juz: 1`.

#### Step 2: Add import

In `TeacherClasses.tsx`, add import:

```typescript
import { JUZ_BOUNDARIES } from '../lib/quran-utils';
```

#### Step 3: Add "By Juz" toggle button

At `TeacherClasses.tsx:490-501`, add a third button after "By Surah":

```tsx
<button
  type="button"
  onClick={() => updatePortion(portion.id, { mode: 'juz' })}
  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
    portion.mode === 'juz'
      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
      : 'bg-slate-700/50 text-slate-400 border border-transparent hover:bg-slate-700'
  }`}
>
  By Juz
</button>
```

#### Step 4: Add Juz selection conditional branch

After the existing `portion.mode === 'surah'` block (around line 560), add:

```tsx
{portion.mode === 'juz' && (
  <div>
    <label className="block text-xs text-slate-400 mb-1">Juz</label>
    <select
      value={portion.juz}
      onChange={(e) => {
        const juzNum = Number(e.target.value);
        const boundary = JUZ_BOUNDARIES.find(b => b.juz === juzNum);
        if (boundary) {
          updatePortion(portion.id, {
            juz: juzNum,
            startSurah: boundary.startSurah,
            endSurah: boundary.endSurah,
            startAyah: String(boundary.startAyah),
            endAyah: String(boundary.endAyah),
          });
        }
      }}
      className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm"
    >
      {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
        <option key={j} value={j}>Juz {j}</option>
      ))}
    </select>
    {/* Show auto-filled range for reference */}
    {(() => {
      const b = JUZ_BOUNDARIES.find(x => x.juz === portion.juz);
      if (!b) return null;
      return (
        <p className="text-xs text-slate-500 mt-1">
          Surah {b.startSurah}:{b.startAyah} — Surah {b.endSurah}:{b.endAyah}
        </p>
      );
    })()}
  </div>
)}
```

#### Step 5: Also add Juz option to Add/Edit Portion modals in `Classroom.tsx`

The Add Portion modal (`Classroom.tsx:1347-1404`) and Edit Portion modal (`Classroom.tsx:1406-1454`) currently only have surah/ayah dropdowns. Consider adding a "Quick Fill from Juz" dropdown at the top of each modal that auto-fills the surah/ayah fields when selected:

```tsx
<div>
  <label className="block text-sm font-medium text-slate-300 mb-2">Quick Fill from Juz (optional)</label>
  <select
    value=""
    onChange={(e) => {
      const juzNum = Number(e.target.value);
      const boundary = JUZ_BOUNDARIES.find(b => b.juz === juzNum);
      if (boundary) {
        setNewPortionStart(boundary.startSurah);
        setNewPortionEnd(boundary.endSurah);
        setNewPortionStartAyah(boundary.startAyah);
        setNewPortionEndAyah(boundary.endAyah);
      }
    }}
    className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100"
  >
    <option value="">— Select Juz —</option>
    {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
      <option key={j} value={j}>Juz {j}</option>
    ))}
  </select>
</div>
```

Import `JUZ_BOUNDARIES` from `../lib/quran-utils` at the top of `Classroom.tsx`.

**Files to modify:**
| File | Action |
|------|--------|
| `src/pages/TeacherClasses.tsx` | Add `'juz'` mode, import `JUZ_BOUNDARIES`, add toggle + dropdown |
| `src/pages/Classroom.tsx` | Add "Quick Fill from Juz" dropdown in Add/Edit modals |

---

## Implementation Order

Recommended sequence:
1. **Feature 1** (Edit Portion migration) — lowest risk, just swapping API layer
2. **Feature 2** (Delete Portion) — builds on Feature 1's API pattern
3. **Feature 3** (By Juz) — standalone UI addition, uses existing data

All three features are independent and could be implemented in parallel by different agents if desired.
