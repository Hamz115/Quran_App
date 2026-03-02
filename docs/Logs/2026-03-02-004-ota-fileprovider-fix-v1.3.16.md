# Session Log: Fix Flutter OTA Update Install (FileProvider)

**Date:** 2026-03-02
**Session:** 004

## Objective

Fix the Flutter OTA update flow — APK downloads to 100% but install never triggers on Android.

## Summary

The `ota_update` package requires a FileProvider and InstallResultReceiver configured in AndroidManifest.xml. These were missing, causing the downloaded APK to fail silently when trying to trigger the Android package installer. Added all required configuration.

## Root Cause

On Android 7+ (API 24+), apps cannot pass `file://` URIs to the system installer — they must use `content://` URIs via a FileProvider. The `ota_update` package provides `OtaUpdateFileProvider` for this, but it needs to be declared in AndroidManifest.xml along with a `filepaths.xml` resource. Neither was configured.

**Symptoms:**
- Download progress goes 0% → 100% successfully
- App crashes/closes instead of showing Android install prompt
- Sometimes shows "app has a bug, clear cache" error
- App reopens with old version still installed

## Work Completed

### Added FileProvider configuration
- Created `android/app/src/main/res/xml/filepaths.xml` — declares OTA APK storage path
- Added `OtaUpdateFileProvider` to AndroidManifest.xml inside `<application>`
- Added `InstallResultReceiver` to AndroidManifest.xml for install completion callbacks

## Testing Plan

### v1.3.16 — This release
- **Tauri (VM):** v1.3.15 is installed on the VM. Opening the app should detect v1.3.16 and auto-update. This tests the update overlay fix from v1.3.14 (sidecar killed after download, indeterminate progress, cancel button).
- **Flutter (Phone):** User will download v1.3.16 fresh from the website (since v1.3.15 OTA didn't work — FileProvider was missing). This installs the FileProvider fix so future OTA updates can work.
- **Windows antivirus:** v1.3.14 was a one-off false positive (v1.3.15 downloaded fine). Confirmed not a persistent issue.

### v1.3.17 — Next release (end-to-end Flutter OTA test)
- Flutter phone will have v1.3.16 installed (with FileProvider)
- v1.3.17 will trigger the in-app update → download → Android install prompt
- If the install prompt appears and user can tap "Install", the full OTA pipeline is working
- Tauri auto-update also continues to be tested (v1.3.16 → v1.3.17)

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_mobile/android/app/src/main/AndroidManifest.xml` | Modified | Added FileProvider + InstallResultReceiver |
| `quran_mobile/android/app/src/main/res/xml/filepaths.xml` | Created | OTA APK file paths for FileProvider |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | Version → 1.3.16 |
| `quran_frontend/package.json` | Modified | Version → 1.3.16 |
| `quran_frontend/src/pages/Settings.tsx` | Modified | Version → v1.3.16 |
| `quran_mobile/pubspec.yaml` | Modified | Version → 1.3.16+1 |
| `website/index.html` | Modified | Version → 1.3.16 |
| `CLAUDE.md` | Modified | Version table + current version |
| `docs/Logs/2026-03-02-004-ota-fileprovider-fix-v1.3.16.md` | Created | Session log |

## Next Steps

- [ ] Confirm Tauri auto-update works on VM (v1.3.15 → v1.3.16)
- [ ] Download v1.3.16 APK from website and install on phone
- [ ] Push v1.3.17 and confirm Flutter OTA works end-to-end (v1.3.16 → v1.3.17)
- [ ] Configure Flutter release signing (proper keystore)

## Notes

- The `ota_update` package docs clearly state FileProvider is required, but this was missed during initial setup
- Samsung S25 Ultra runs Android 15 (One UI 7) which is strict about file sharing between apps
- The FileProvider uses `${applicationId}.ota_update_provider` authority to avoid conflicts with other plugins
- v1.3.14 virus false positive was a one-off — v1.3.15 downloaded fine on Windows
