# Session Log: Clean Release for Update Test

**Date:** 2026-02-28
**Session:** 009

## Objective

Push a clean v1.3.11 release after v1.3.10 was broken by tag deletion/recreation that left the GitHub Release in a corrupted state.

## Summary

v1.3.10 had its tag deleted and recreated during the session, which caused the GitHub Release to have mismatched or missing artifacts. The updater in v1.3.9 hung at "Downloading update... 0%" because the download URL likely pointed to non-existent files. v1.3.11 is a clean release with no tag juggling.

## Work Completed

### Problem: v1.3.10 Broken Release
- v1.3.10 was initially tagged on a commit that didn't have version bumps in all 5 files
- The tag was deleted and recreated, which corrupted the GitHub Release
- The updater on v1.3.9 hung at 0% — download never started because the release artifacts were missing/broken
- The VM got stuck because the sidecar was killed (by design) but the download never completed, leaving the app in a broken state with no backend

### Fix: Clean v1.3.11
- All 5 files bumped to v1.3.11 in one clean commit
- Single tag push — no deletion/recreation

### Lesson Learned
- NEVER delete and recreate a tag that has already triggered a workflow — it corrupts the release
- If a tag was pushed with wrong files, push a new version number instead

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | Version bump to 1.3.11 |
| `quran_frontend/package.json` | Modified | Version bump to 1.3.11 |
| `quran_frontend/src/pages/Settings.tsx` | Modified | Version display to v1.3.11 |
| `website/index.html` | Modified | Download link updated to v1.3.11 |
| `CLAUDE.md` | Modified | Version table + current version updated |

## Next Steps

- [ ] Manually install v1.3.11 on VM (v1.3.9 is current)
- [ ] Push v1.3.12 and test update end-to-end

## Notes

- Continues from `2026-02-28-008-fix-kill-sidecar-hanging-v1.3.9.md`
- Key rule added: never delete/recreate tags — always increment the version number
