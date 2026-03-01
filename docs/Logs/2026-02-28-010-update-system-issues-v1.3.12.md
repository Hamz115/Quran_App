# Session Log: Update System Issues & Flutter APK Build

**Date:** 2026-02-28 / 2026-03-01
**Session:** 010

## Objective

Document all auto-update issues encountered during v1.3.2 through v1.3.12, and begin Flutter APK build.

## Summary

The auto-update system went through multiple iterations (v1.3.3 to v1.3.12) trying to fix the sidecar file lock and overlay UX. Several critical issues remain that make the update experience unreliable and potentially crash the VM. Flutter APK was successfully built locally at v1.3.12.

## Update System Issues (Complete History)

### Issue 1: Sidecar file lock (v1.3.3)
- **Problem**: NSIS installer shows "Error opening file for writing: quran-backend.exe" because the sidecar process is still running
- **Root cause**: `relaunch()` doesn't trigger the `CloseRequested` window event, so the existing sidecar kill in `on_window_event` never fires
- **Fix attempted**: Added `kill_sidecar` Tauri command, called before `relaunch()`
- **Status**: Partially fixed — kill was placed AFTER `downloadAndInstall()` (wrong timing)

### Issue 2: Kill placed after install (v1.3.3–v1.3.6)
- **Problem**: `kill_sidecar` was called after `downloadAndInstall()`, but that function runs the NSIS installer internally — by the time kill runs, the installer already hit the locked file
- **Fix**: Moved `kill_sidecar` to BEFORE `downloadAndInstall()` in v1.3.7
- **Status**: Fixed in code, but chicken-and-egg meant each fix required manual reinstall on VM

### Issue 3: kill_sidecar hanging (v1.3.7–v1.3.8)
- **Problem**: The Rust `kill_sidecar` command used `taskkill.output()` which blocks waiting for stdout/stderr, plus `thread::sleep(2s)` — the invoke never returned, freezing the overlay at 0%
- **Fix**: Changed to `.spawn()` (fire-and-forget) and moved delay to JS setTimeout in v1.3.9
- **Status**: Fixed

### Issue 4: Broken release from tag recreation (v1.3.10)
- **Problem**: v1.3.10 tag was deleted and recreated, which corrupted the GitHub Release — download URLs pointed to non-existent or mismatched artifacts
- **Fix**: Pushed clean v1.3.11 with no tag juggling
- **Lesson**: NEVER delete and recreate tags. Always increment version number.
- **Status**: Fixed

### Issue 5: Progress stuck at 0% (v1.3.9–v1.3.12)
- **Problem**: The download overlay shows "Downloading update... 0%" forever. The `contentLength` from the download `Started` event is likely null/undefined, so `totalLength` stays 0 and percentage formula always returns 0
- **Root cause**: GitHub Releases may not send Content-Length header, or the Tauri updater doesn't expose it
- **Status**: UNFIXED — needs handling for unknown file size (indeterminate progress or bytes display)

### Issue 6: App becomes unresponsive / VM crashes (v1.3.12)
- **Problem**: After clicking "Update Now", the entire VM becomes unresponsive. The app shows overlay at 0% and the machine freezes — Windows becomes unusable
- **Root cause (suspected)**:
  1. Sidecar is killed BEFORE download starts — backend is dead, app is in broken state
  2. Overlay blocks all interaction — no cancel button, no way to close
  3. Download may be hanging or extremely slow with no timeout
  4. Frozen Tauri webview + stuck network request consume system resources
  5. No graceful degradation — if download fails, user is trapped
- **Status**: UNFIXED — critical issue

### Issue 7: Chicken-and-egg problem
- **Problem**: Every fix requires the user to manually install the new version because the running app has old code. The fix only takes effect from the NEXT update.
- **Impact**: Testing requires: push new version → manually install → push another version → test update
- **Status**: Inherent to the architecture, cannot be fixed

## Proposed Fixes for Remaining Issues

### Fix for Issue 5 (Progress at 0%)
- Show indeterminate progress animation when `totalLength` is unknown
- Display downloaded bytes (e.g., "12 MB downloaded") instead of percentage
- Show a pulsing/animated progress bar

### Fix for Issue 6 (VM crash / unresponsive)
- **DO NOT kill sidecar before download** — only kill it after download completes, right before install
- Split `downloadAndInstall()` into separate download and install steps if possible
- If not possible, add a timeout (e.g., 60 seconds) — if no progress, abort and show error
- Add a "Cancel" button to the overlay
- Add `app_exit` capability so user can close the app even during update

## Flutter APK Build

### Successfully built
- Updated `pubspec.yaml` version from `1.0.0+1` to `1.3.12+1`
- Fixed build error: `ota_update` package requires core library desugaring
- Added `isCoreLibraryDesugaringEnabled = true` to `android/app/build.gradle.kts`
- Added `coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")` dependency
- APK built: `build/app/outputs/flutter-apk/app-release.apk` (185.6MB)
- Signed with debug keys (release signing not yet configured)

## Flutter CI/CD Pipeline

### Added `build-flutter` job to `release.yml`
- Runs on `ubuntu-latest` in parallel with the Tauri build
- Uses Flutter 3.38.4 (matching local SDK version)
- Steps: checkout → Java 17 → Flutter SDK → write .env → pub get → build APK → rename → upload
- APK is renamed to `QuranTrack_X.Y.Z.apk` and uploaded to the same GitHub Release as the Tauri installer
- The Flutter auto-updater already queries GitHub Releases for APK assets, so this completes the pipeline

### Release body updated
- Now mentions both Windows and Android downloads

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_mobile/pubspec.yaml` | Modified | Version 1.0.0+1 → 1.3.12+1 |
| `quran_mobile/android/app/build.gradle.kts` | Modified | Enable core library desugaring for ota_update |
| `.github/workflows/release.yml` | Modified | Added parallel Flutter APK build job |
| `docs/Logs/2026-02-28-010-update-system-issues-v1.3.12.md` | Created | Session log |

## Next Steps

- [ ] Fix Tauri update overlay: don't kill sidecar before download, add cancel button, handle 0% progress
- [ ] Test Flutter CI/CD pipeline (next tag push)
- [ ] Configure release signing for Flutter (currently debug keys)
- [ ] Update website with Android download link

## Notes

- The Tauri auto-update system needs a significant rework before it's reliable for end users
- Key principle: never put the app in an unrecoverable state during updates
- The sidecar should only be killed at the very last moment before the installer needs the file
- Flutter APK is 185.6MB due to bundled QPC fonts (604 TTF files) — this is expected
- Flutter CI runs on Ubuntu (faster/cheaper than Windows for Android builds)
