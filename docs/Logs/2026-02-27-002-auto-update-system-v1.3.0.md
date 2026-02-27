# Session Log: Auto-Update System for Tauri Desktop + Flutter Mobile

**Date:** 2026-02-27
**Session:** 002

## Objective

Implement auto-update functionality for both Tauri desktop (Windows) and Flutter mobile (Android) apps. Tauri uses the built-in updater plugin with GitHub Releases. Flutter uses GitHub Releases API + `ota_update` package for APK self-updates.

## Summary

Implementing seamless auto-update for non-technical users. Tauri desktop gets the built-in updater plugin with signing support. Flutter mobile gets OTA APK updates via GitHub Releases API. Both platforms show version info and update controls in Settings.

## Work Completed

### Part A: Tauri Desktop Auto-Updater
- Added Rust plugin dependencies (updater, dialog, process) to Cargo.toml
- Configured `tauri.conf.json` with updater endpoints, pubkey placeholder, and `createUpdaterArtifacts`
- Registered plugins in `lib.rs` (dialog, process, updater)
- Added permissions to `capabilities/default.json`
- Installed npm packages for updater, dialog, process
- Created `src/lib/updater.ts` with update check/install logic
- Added App Info card to Settings page (Tauri-only)
- Added auto-check on app launch in App.tsx

### Part B: Flutter Mobile Auto-Updater
- Added `ota_update`, `package_info_plus`, `version` dependencies
- Added `REQUEST_INSTALL_PACKAGES` permission to AndroidManifest.xml
- Created `UpdateService` for GitHub Releases API integration
- Created `UpdateDialog` widget for update prompts
- Added App Info section to Flutter Settings screen
- Added auto-check on app launch

## Issues Encountered

- Version bumped from v1.2.5 to v1.3.0 (user decision — this is a significant feature, not a patch)
- Renamed research log from v1.2.5 to v1.3.0 to match
- Settings screen converted from `ConsumerWidget` to `ConsumerStatefulWidget` to hold update state
- Added GitHub domains to Tauri CSP `connect-src` for updater endpoint access

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/src-tauri/Cargo.toml` | Modified | Added updater, dialog, process plugin deps |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | Added updater config, createUpdaterArtifacts, bumped version |
| `quran_frontend/src-tauri/src/lib.rs` | Modified | Registered dialog, process, updater plugins |
| `quran_frontend/src-tauri/capabilities/default.json` | Modified | Added updater, dialog, process permissions |
| `quran_frontend/package.json` | Modified | Added @tauri-apps/plugin-updater, plugin-dialog, plugin-process |
| `quran_frontend/src/lib/updater.ts` | Created | Update check/download/install logic for Tauri |
| `quran_frontend/src/pages/Settings.tsx` | Modified | Added App Info card with version + update button |
| `quran_frontend/src/App.tsx` | Modified | Added auto-check for updates on launch |
| `quran_mobile/pubspec.yaml` | Modified | Added ota_update, package_info_plus, version deps |
| `quran_mobile/android/app/src/main/AndroidManifest.xml` | Modified | Added REQUEST_INSTALL_PACKAGES permission |
| `quran_mobile/lib/core/services/update_service.dart` | Created | GitHub API update check + OTA install service |
| `quran_mobile/lib/presentation/widgets/update_dialog.dart` | Created | Update prompt dialog widget |
| `quran_mobile/lib/presentation/screens/settings/settings_screen.dart` | Modified | Added App Info section with update button |
| `quran_mobile/lib/main.dart` | Modified | Auto-check for updates on app launch |

## Next Steps

- [ ] Generate Tauri signing keys (manual step)
- [ ] Paste public key into tauri.conf.json
- [ ] Set up GitHub Actions release workflow
- [ ] Test end-to-end with a real GitHub Release

## Notes

- Updater only works in bundled Tauri builds, not dev mode
- GitHub draft releases are not visible to the updater

## Tauri Signing Keys

**Generated:** 2026-02-27

| Item | Value |
|------|-------|
| Private key path | `C:\Users\hamza\Documents\Quran_App\quran_frontend\~\.tauri\qurantrack.key` |
| Public key path | `C:\Users\hamza\Documents\Quran_App\quran_frontend\~\.tauri\qurantrack.key.pub` |
| Private key password | `Hamza_quran2026` |
| Public key (in tauri.conf.json) | `dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEQ2MzMyNzkwNDVDN0REOEQKUldTTjNjZEZrQ2N6MWp4cjZWR0gwU04xNlJFM1QyV0dGcnZ3WGQxeVI4RWRFQ29md0NSaVNZeGgK` |

**Environment variables needed at build time:**
- `TAURI_SIGNING_PRIVATE_KEY` = contents of `qurantrack.key` file
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` = `Hamza_quran2026`

**WARNING:** Never commit the private key file. Never push the password to a public repo. Add to GitHub Secrets for CI.
