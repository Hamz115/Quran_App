# Session Log: Kill Sidecar Before downloadAndInstall

**Date:** 2026-02-28
**Session:** 007

## Objective

Fix sidecar still not being killed during auto-update despite taskkill approach in v1.3.5. The kill was happening AFTER the install, not before.

## Summary

Moved the `kill_sidecar` call from after `downloadAndInstall()` to before it. The Tauri updater's `downloadAndInstall()` function downloads the update AND runs the NSIS installer — by the time it returns, the installer has already tried (and failed) to overwrite the locked `quran-backend.exe`. The sidecar must be dead before that function is called.

## Work Completed

### Root Cause
- `downloadAndInstall()` is not just a download — it downloads AND installs (runs the NSIS installer)
- The `kill_sidecar` call was placed AFTER `downloadAndInstall()`, meaning the installer had already hit the locked file and failed before we even tried to kill the sidecar
- The taskkill + 2s delay from v1.3.5 was correct, it was just called too late

### Fix
- Moved `invoke('kill_sidecar')` to BEFORE `update.downloadAndInstall()`
- The sidecar is now killed (with taskkill + 2s delay) before the NSIS installer runs
- The overlay still shows "Downloading update... 0%" during the kill phase, which is fine since the 2-second delay is brief

## Issues Encountered

- **v1.3.5 and v1.3.6 still had the error**: Both had the kill call AFTER `downloadAndInstall()`. The function name was misleading — it's not just "download", it's "download AND install".

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/src/lib/updater.ts` | Modified | Moved kill_sidecar call to before downloadAndInstall() |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | Version bump to 1.3.7 |
| `quran_frontend/package.json` | Modified | Version bump to 1.3.7 |
| `quran_frontend/src/pages/Settings.tsx` | Modified | Version display to v1.3.7 |
| `website/index.html` | Modified | Download link updated to v1.3.7 |
| `CLAUDE.md` | Modified | Version table updated |

## Next Steps

- [ ] Manually install v1.3.7 on VM (same chicken-and-egg: v1.3.6 has old updater code)
- [ ] Push v1.3.8 test release and verify update works end-to-end from v1.3.7

## Notes

- Continues from `2026-02-28-006-force-kill-sidecar-v1.3.5.md`
- Same chicken-and-egg: the VM running v1.3.6 has the old updater code (kill after install). Must manually install v1.3.7, then test a v1.3.8 update.
