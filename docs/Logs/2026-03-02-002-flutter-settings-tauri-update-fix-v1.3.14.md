# Session Log: Flutter Settings Cleanup + Tauri Update Fix

**Date:** 2026-03-02
**Session:** 002

## Objective

1. Clean up Flutter Settings page: remove Sync, Server, Danger Zone sections; add Change Password
2. Fix Tauri auto-update system: indeterminate progress bar, don't kill sidecar before download, add cancel button and timeout
3. Fix Flutter CI/CD pipeline (S3 database download)

## Summary

Removed unnecessary sections from Flutter Settings (Sync, Server, Danger Zone). Added collapsible Change Password form to Account section mirroring web design. Fixed Tauri update overlay with indeterminate progress, cancel button, and moved sidecar kill to after download completes. Fixed Flutter CI by adding S3 database download step.

## Work Completed

### Flutter Settings Cleanup
- Removed SYNC section (connection status + sync now button)
- Removed SERVER section (server URL editor)
- Removed DANGER ZONE section (delete all mistakes)
- Added collapsible "Change Password" form to ACCOUNT section
- Remaining sections: Appearance, About, Account (with change password + sign out)

### Tauri Update System Fix
- Moved `kill_sidecar` from BEFORE download to AFTER download completes (before install)
- Changed progress bar to indeterminate animation when contentLength is unknown
- Added "Cancel" button to update overlay
- Added 90-second timeout for download
- Show downloaded bytes instead of stuck 0%

### Flutter CI/CD Fix
- Added AWS credentials step to build-flutter job
- Added S3 download step for database files (quran.db, qpc-v2.db, qpc-v2-15-lines.db)

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_mobile/lib/presentation/screens/settings/settings_screen.dart` | Modified | Remove Sync/Server/Danger Zone, add Change Password |
| `quran_frontend/src/lib/updater.ts` | Modified | Move sidecar kill after download, add timeout |
| `quran_frontend/src/App.tsx` | Modified | Indeterminate progress, cancel button, timeout UI |
| `.github/workflows/release.yml` | Modified | Add S3 database download for Flutter CI |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | Version → 1.3.14 |
| `quran_frontend/package.json` | Modified | Version → 1.3.14 |
| `quran_frontend/src/pages/Settings.tsx` | Modified | Version → v1.3.14 |
| `quran_mobile/pubspec.yaml` | Modified | Version → 1.3.14+1 |
| `website/index.html` | Modified | Version → 1.3.14, Android download link |
| `CLAUDE.md` | Modified | Version table + current version |
| `docs/Logs/2026-03-02-002-flutter-settings-tauri-update-fix-v1.3.14.md` | Created | Session log |

## Next Steps

- [ ] Test Tauri auto-update on VM (verify sidecar kill timing, cancel button, progress bar)
- [ ] Test Flutter CI/CD pipeline (verify S3 download + APK build)
- [ ] Fix Flutter Quran reader type cast error
- [ ] Configure Flutter release signing

## Notes

- v1.3.13 was tagged but Flutter CI failed due to missing assets/databases/ directory
- The S3 database files are the same ones used by the Tauri build — same bucket, same secrets
- Sidecar is now only killed at the last moment before install, keeping the app functional during download
- Cancel button dispatches a custom event that the updater listens for to abort
