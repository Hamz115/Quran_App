# Session Log: Fix Keystore Path + Remove Update Delays

**Date:** 2026-03-02
**Session:** 007

## Objective

1. Fix Flutter CI build failure (double `app/` keystore path)
2. Remove unnecessary delays from Tauri auto-update flow (5s total: 3s JS + 2s NSIS)
3. v1.3.19 serves as: Tauri e2e test (v1.3.18 → v1.3.19, tests faster update) + Flutter fresh install from website (first release-signed APK)
4. v1.3.20 will be the Flutter OTA e2e test

## Summary

Fixed the CI keystore path bug (`storeFile=app/upload-keystore.jks` resolved to `app/app/` since Gradle's `file()` already resolves relative to the app module). Removed the 3-second JS delay and 2-second NSIS Sleep from the Tauri update flow to make installs faster.

## Work Completed

### Fix 1: Keystore path (CI build failure)
- `storeFile=app/upload-keystore.jks` → `storeFile=upload-keystore.jks`
- Changed in both `quran_mobile/android/key.properties` (local) and `.github/workflows/release.yml` (CI)
- Root cause: `file()` in `build.gradle.kts` signing config resolves relative to `android/app/`, so `app/upload-keystore.jks` became `app/app/upload-keystore.jks`

### Fix 2: Remove update delays
- **updater.ts**: Removed `await new Promise(resolve => setTimeout(resolve, 3000))` after `kill_sidecar`
- **hooks.nsh**: Removed `Sleep 2000` after `taskkill`
- Total delay removed: 5 seconds
- Flow is now: download → kill sidecar → immediately install

### Version Bump to v1.3.19
All 6 files bumped: tauri.conf.json, package.json, Settings.tsx, website/index.html, pubspec.yaml, CLAUDE.md

## Testing This Release

### Tauri auto-update (VM) — tests faster update
- v1.3.18 → v1.3.19: should be noticeably faster without the 5s delays
- Validates that removing delays doesn't break the sidecar kill

### Flutter (Phone) — first release-signed APK
- v1.3.18 Flutter build FAILED (keystore path bug), so v1.3.19 is the first working release-signed APK
- User uninstalls old app, installs v1.3.19 fresh from website
- This is the baseline for the v1.3.20 OTA test

### v1.3.20 — Flutter OTA e2e test
- v1.3.19 → v1.3.20 on phone
- Both APKs release-signed with same keystore
- Should install cleanly via OTA

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_mobile/android/key.properties` | Modified | `storeFile=upload-keystore.jks` (removed `app/` prefix) |
| `.github/workflows/release.yml` | Modified | Same keystore path fix in CI |
| `quran_frontend/src/lib/updater.ts` | Modified | Removed 3s delay after kill_sidecar |
| `quran_frontend/src-tauri/nsis/hooks.nsh` | Modified | Removed 2s Sleep after taskkill |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | Version → 1.3.19 |
| `quran_frontend/package.json` | Modified | Version → 1.3.19 |
| `quran_frontend/src/pages/Settings.tsx` | Modified | Version → v1.3.19 |
| `quran_mobile/pubspec.yaml` | Modified | Version → 1.3.19+1 |
| `website/index.html` | Modified | Version → 1.3.19 |
| `CLAUDE.md` | Modified | Version table + current version |
| `docs/Logs/2026-03-02-006-...` | Modified | Added issues encountered |
| `docs/Logs/2026-03-02-007-...` | Created | This session log |

## Next Steps

- [ ] Test Tauri auto-update on VM (v1.3.18 → v1.3.19) — validates faster update
- [ ] User uninstalls old Flutter app, installs v1.3.19 fresh from website
- [ ] v1.3.20: Flutter OTA end-to-end test (v1.3.19 → v1.3.20) — hopefully the last one
