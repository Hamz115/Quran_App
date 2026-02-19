# Session Log: Flutter Bug Investigation - Mistakes Display & Create Class Defaults

**Date:** 2026-02-19
**Session:** 005

## Objective

Investigate two bugs in the Flutter mobile app:
1. New mistakes on pages without pre-existing mistakes don't show badges at bottom
2. Verify if create class screen has all three sections toggled on by default

## Summary

Identified root cause for the mistake display bug: `classMistakeIdsProvider` is a `FutureProvider.family` that is never invalidated when new mistakes are added via `mistakesProvider.notifier.addMistake()`. The `_buildMistakesSummary` method depends on this provider to filter "this class" mistakes, so newly added mistakes are invisible in the bottom summary until a full page reload. The create class screen correctly defaults all three sections to enabled.

## Work Completed

### Bug Investigation: Mistakes Not Showing on New Pages
- Traced the full data flow from WordPopup -> addMistake -> MistakesNotifier -> UI rebuild
- Identified that `classMistakeIdsProvider` is stale after adding a new mistake
- The `_buildMistakesSummary` method filters mistakes using `classMistakeIds`, which never gets refreshed
- Additionally, the early return on line 668 (`if (thisClassMistakes.isEmpty && prevMistakes.isEmpty)`) causes the entire section to be hidden

### Verification: Create Class Screen Defaults
- Confirmed all three sections (hifz, sabqi, revision) are toggled ON by default at lines 25-29

## Issues Encountered

- Root cause of bug 1 identified (see detailed analysis in response)

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `docs/Logs/2026-02-19-005-flutter-bug-investigation.md` | Created | Session log |

## Next Steps

- [ ] Fix: Invalidate `classMistakeIdsProvider` after adding/removing mistakes
- [ ] Consider converting `classMistakeIdsProvider` to react to `mistakesProvider` state changes

## Notes

See detailed root cause analysis in the conversation response.
