# Session Log: Guided Tour Word Popup Scroll Race

**Date:** 2026-07-29
**Session:** 007
**Author:** Kyle

## Summary

Fixed the production guided-tour failure reported at step 19/32. After the user followed step 18 and clicked another Quran word, the tour advanced to **Letter Mistakes**, but the word mistake popup disappeared and Driver.js left the rest of the page blocked.

## Evidence

Hamza's WhatsApp screenshot showed:

- Tour at step **19 / 32** (`Letter Mistakes`).
- Quran word `عظيم` highlighted from the preceding click.
- The word popup and its letter buttons no longer present.
- The Driver.js modal overlay still active, leaving no valid interactive target.

Attachment inspected:

`/home/hamza-minipc/Documents/PersonalOpsAgent/data/whatsapp_media/2026-07-29/3EB06179D0D4FE5D69B5FC-1785348093634.jpg`

## Root Cause

`TourContext.showStep()` called `scrollIntoView()` for every highlighted element, both immediately and again after 300 ms. The letter and haraka controls live inside the fixed-position word popup.

`Classroom.tsx` intentionally closes the word popup on any captured scroll event. Therefore, entering step 19 caused this sequence:

1. The second Quran word opened the word popup.
2. The tour observed the popup and advanced to Letter Mistakes.
3. `showStep()` called `scrollIntoView()` on `[data-tour="letter-mistakes"]`.
4. That emitted a scroll event.
5. Classroom's scroll listener closed the word popup.
6. Driver.js remained active against a removed target and blocked normal interaction.

The same defect could affect the later Haraka Mistakes step.

## Fix

Updated `quran_frontend/src/contexts/TourContext.tsx` so both automatic recenter passes skip `scrollIntoView()` whenever the target is inside `[data-tour="word-popup"]`.

The popup is `position: fixed` and already visible, so it does not require page recentering. Normal tour targets still retain the existing recenter behavior.

Added a regression assertion in:

`quran_backend/tests/test_listener_reciter_schema_sql.py`

The assertion requires both recenter paths to preserve fixed word-popup targets.

## Validation

- Frontend production build: passed.
- Targeted ESLint for `src/contexts/TourContext.tsx`: passed.
- Python regression suite: **23/23 passed**.
- Full repository ESLint remains red from 182 pre-existing errors, including generated Tauri assets and unrelated legacy files; no error was reported for the changed TourContext file.
- `git diff --check`: passed (line-ending warnings only).

## Files Changed

- `quran_frontend/src/contexts/TourContext.tsx`
- `quran_backend/tests/test_listener_reciter_schema_sql.py`
- `docs/Logs/2026-07-29-007-tour-word-popup-scroll-race.md`
