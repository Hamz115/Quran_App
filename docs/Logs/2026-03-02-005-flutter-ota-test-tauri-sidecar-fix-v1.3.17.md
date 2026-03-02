# Session Log: Tauri Sidecar Fix + Flutter OTA End-to-End Test

**Date:** 2026-03-02
**Session:** 005

## Objective

1. Fix the Tauri auto-update sidecar issue once and for all — quran-backend.exe blocks NSIS installer
2. Push v1.3.17 as end-to-end test for both Flutter OTA and Tauri auto-update

## Summary

The root cause was that `downloadAndInstall()` is a single atomic call — it downloads AND runs the NSIS installer with no way to insert code between the two phases. Replaced with separate `download()` → kill sidecar → `install()` calls. Also added an NSIS `installerHooks` safety net that runs `taskkill` on the sidecar before file copy.

## Root Cause (Tauri Sidecar Issue)

The Tauri v2 updater's `downloadAndInstall()` method:
1. Downloads the update package
2. **Immediately** launches the NSIS installer (no pause between)

Our `kill_sidecar` call was placed AFTER `downloadAndInstall()` returned — but by then the NSIS installer had already tried (and failed) to overwrite `quran-backend.exe`.

**Previous attempts and why they failed:**
- v1.3.3–v1.3.5: Kill before `downloadAndInstall()` → sidecar dies too early, app bricked if download fails
- v1.3.14: Kill after `downloadAndInstall()` → too late, NSIS already failed
- **The actual fix**: The Tauri v2 updater has SEPARATE `download()` and `install()` methods! We just weren't using them.

## Work Completed

### Fix 1: Split download and install (updater.ts)
- Replaced `update.downloadAndInstall()` with `update.download()` + `update.install()`
- Kill sidecar inserted BETWEEN the two calls
- Flow: download → kill sidecar → wait 3s for file handle release → install → relaunch

### Fix 2: NSIS installer hook (safety net)
- Created `src-tauri/nsis/hooks.nsh` with `NSIS_HOOK_PREINSTALL` macro
- Runs `taskkill /F /IM "quran-backend.exe"` + 2s sleep before NSIS copies files
- Added `"installerHooks": "./nsis/hooks.nsh"` to tauri.conf.json
- This is a belt-and-suspenders approach — even if JS-side kill fails, NSIS will do it

### Double protection:
1. **JS side** (updater.ts): `download()` → `kill_sidecar` → `install()`
2. **NSIS side** (hooks.nsh): `NSIS_HOOK_PREINSTALL` → `taskkill` → file copy

## Testing This Release

### Tauri auto-update (VM)
- v1.3.16 installed on VM
- Open app → should detect v1.3.17 → click "Update Now"
- Download should complete, then sidecar killed, then NSIS runs
- **This is the real test** — if it works, the sidecar issue is finally fixed

### Flutter OTA end-to-end (Phone)
- v1.3.16 installed on phone (from website, has FileProvider fix)
- v1.3.17 should trigger in-app update → download → Android install prompt
- If install prompt appears and user can tap "Install", Flutter OTA is fully working

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/src/lib/updater.ts` | Modified | Split downloadAndInstall into download() + install() |
| `quran_frontend/src-tauri/nsis/hooks.nsh` | Created | NSIS pre-install hook to kill sidecar |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | Added installerHooks + version → 1.3.17 |
| `quran_frontend/package.json` | Modified | Version → 1.3.17 |
| `quran_frontend/src/pages/Settings.tsx` | Modified | Version → v1.3.17 |
| `quran_mobile/pubspec.yaml` | Modified | Version → 1.3.17+1 |
| `website/index.html` | Modified | Version → 1.3.17 |
| `CLAUDE.md` | Modified | Version table + current version |
| `docs/Logs/2026-03-02-005-flutter-ota-test-tauri-sidecar-fix-v1.3.17.md` | Created | Session log |

## Next Steps

- [ ] Confirm Tauri auto-update works on VM (sidecar killed properly, NSIS succeeds)
- [ ] Confirm Flutter OTA works end-to-end (v1.3.16 → v1.3.17 install prompt)
- [ ] If both pass: auto-update pipeline is DONE for both platforms
- [ ] Move on to Flutter app issues and feature work

## Notes

- Key discovery: Tauri v2 updater has `download()` and `install()` as separate methods — the docs show `downloadAndInstall()` as the main example but the split API exists
- NSIS hooks were added in Tauri v2 via PR #9731 (May 2024) — `NSIS_HOOK_PREINSTALL` runs before file copy
- `nsExec::ExecToLog` runs taskkill without showing a command prompt window
- The sidecar issue has been attempted 8+ times (v1.3.3 through v1.3.16) — this is the most architecturally sound fix
