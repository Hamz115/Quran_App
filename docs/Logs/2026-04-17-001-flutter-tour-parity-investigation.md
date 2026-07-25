# Session Log: Flutter Tour Parity Investigation

**Date:** 2026-04-17
**Session:** 001
**Status:** Investigation + implementation start

## Objective

Figure out why the Tauri/web tour has 31 interactive steps while Flutter/mobile still has only 9 steps, and identify the concrete code issues blocking parity.

## Findings

### 1. The tours diverged intentionally in March

The exact divergence is documented in:
- `docs/Logs/2026-03-29-001-interactive-tour-rewrite-v1.10.0.md`

That log explicitly states:
- Tauri/web was rewritten to a **31-step interactive tour**
- Flutter/mobile was **not updated** and remained on the old **9-step demo-class tour**
- The note says Flutter was intentionally skipped at the time

### 2. Tauri/web uses a real interactive flow

Files:
- `quran_frontend/src/lib/tour.ts`
- `quran_frontend/src/contexts/TourContext.tsx`

Key characteristics:
- 31 steps
- interactive steps hide the Next button
- steps advance when the user actually clicks/changes/types in the target
- no fake demo class is auto-created
- the user goes through the real flow: start session → date → student selector → portions → create session → classroom interactions → notes/performance → delete

### 3. Flutter/mobile is still on the old demo-class flow

Files:
- `quran_mobile/lib/core/services/tour_service.dart`
- `quran_mobile/lib/main.dart`

Current characteristics:
- only 9 steps
- still auto-creates a demo class via `TourService.createDemoClass()`
- still auto-pushes `ClassroomScreen(...)`
- still uses a generic tooltip with a normal Next button
- does not support true interactive "must tap the target to continue" behavior

### 4. Concrete Flutter bugs found

#### A. Wrong spotlight size for dashboard steps
- The spotlight originally targeted tiny button widgets instead of a larger region
- This caused the rest of the screen to look black/blank

#### B. Start Session is not interactive
- The tooltip still allows `controller.next()` directly
- No mobile equivalent of the web tour's `type: 'interactive'` flow exists yet

#### C. Demo class uses the wrong classroom flow
- `main.dart` creates a demo class and passes `_demoClassId.toString()` into `ClassroomScreen`
- this mixes local integer IDs and Supabase UUID-capable flows
- this contributed to the `invalid input syntax for type uuid: "29"` error path

#### D. Demo class has no explicit student selection step
- `TourService.createDemoClass()` creates a class directly in the repository
- it does not go through the real session creation UI
- it does not force a valid student selection flow

## Current Flutter step list (old)

1. Welcome
2. Add Contacts
3. Start Session
4. Section Tabs
5. Mushaf Page
6. Mistake Tracking
7. Reader
8. Settings
9. Farewell

## Current Tauri step model (new)

The web version walks through the real flow in much more detail, including:
- Add Contacts
- Start Session (interactive)
- Session Date
- Student Selector
- Next: Choose Portions (interactive)
- Hifz section
- Portion mode
- Surah selector (interactive)
- Ayah range
- Sabqi toggle
- Manzil toggle
- Create Session (interactive)
- Section Tabs
- Quran page interactions
- Whole-word mistake
- Letter mistake
- Haraka mistake
- Mistakes area
- Page/All toggle
- Notes
- Performance
- Reader
- Settings
- Delete
- Farewell

## Implementation direction

### Recommended direction
Bring Flutter toward the web model instead of continuing to patch the old 9-step demo-class design.

### First required mobile changes
1. Add a Flutter concept of **interactive tour steps**
2. Allow steps with **no Next button** where the user must tap the target
3. Stop silently auto-creating a fake class in the old flow
4. Walk through the real create-session UI on mobile:
   - start session
   - student selection
   - portion configuration
   - create session
5. Only continue to classroom steps after a valid session actually exists
6. Fix ID handling so tutorial navigation does not pass a local int where UUID-aware logic is expected

## Files to change next
- `quran_mobile/lib/core/services/tour_service.dart`
- `quran_mobile/lib/main.dart`
- `quran_mobile/lib/presentation/widgets/tour_tooltip.dart`
- `quran_mobile/lib/presentation/screens/classes/create_class_screen.dart`
- possibly `quran_mobile/lib/presentation/providers/providers.dart`
- possibly `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart`

## Notes
- This session was investigation-first to map the exact parity gap before rewriting the Flutter tour flow
- The main conclusion: Flutter is not broken because of one small UI bug; it is still running an older tutorial architecture than the Tauri app
