# Session Log: Flutter OTA Signing Key Fix + Tauri Auto-Update E2E Test

**Date:** 2026-03-02
**Session:** 006

## Objective

1. Fix Flutter OTA update error "App not installed as package conflicts with an existing package" — caused by signing key mismatch between CI-built APKs
2. v1.3.18 also serves as the Tauri auto-update end-to-end test (v1.3.17 → v1.3.18 on VM, testing the split download/install + NSIS hook fix)

## Summary

The Flutter OTA flow was fully working (Android takes over, shows install prompt), but the actual installation failed because GitHub Actions generates a fresh debug keystore on every build, giving each APK a different signing certificate. Fixed by generating a persistent release keystore, configuring `build.gradle.kts` to use it, and updating the CI workflow to decode the keystore from GitHub secrets.

## Root Cause

Android refuses to install an APK update if the signing certificate differs from the currently installed app. Since `build.gradle.kts` used `signingConfigs.getByName("debug")` and GitHub Actions runs on fresh VMs, each CI build generated a **new debug keystore** with a **different signing key**. This made OTA updates impossible — v1.3.16 and v1.3.17 had different certificates.

## Work Completed

### Fix: Persistent Release Keystore

1. **Generated release keystore** (`upload-keystore.jks`)
   - RSA 2048-bit, 10,000 day validity, alias `upload`
   - Stored locally at `quran_mobile/android/app/upload-keystore.jks` (gitignored by `**/*.jks`)

2. **Created `key.properties`** (for local builds)
   - At `quran_mobile/android/key.properties` (gitignored)
   - Contains store/key passwords and keystore path

3. **Updated `build.gradle.kts`** with release signing config
   - Reads `key.properties` if it exists
   - Creates a `release` signing config with keystore credentials
   - Falls back to debug signing if `key.properties` not found (dev machines without keystore)

4. **Updated CI workflow** (`release.yml`)
   - Added `Decode release keystore` step: decodes `ANDROID_KEYSTORE_BASE64` secret → `upload-keystore.jks`
   - Added `Write key.properties` step: creates `key.properties` from `ANDROID_KEYSTORE_PASSWORD` and `ANDROID_KEY_PASSWORD` secrets

5. **Base64-encoded keystore** for GitHub secret
   - Saved to `quran_mobile/android/app/upload-keystore.b64` (temporary, for copying to GitHub)

### GitHub Secrets Required

| Secret | Value |
|--------|-------|
| `ANDROID_KEYSTORE_BASE64` | Contents of `upload-keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | `QuranTrack2026Release` |
| `ANDROID_KEY_PASSWORD` | `QuranTrack2026Release` |

### Version Bump to v1.3.18

All 6 files bumped: tauri.conf.json, package.json, Settings.tsx, website/index.html, pubspec.yaml, CLAUDE.md

## Testing This Release

### Tauri auto-update end-to-end test (VM) — THIS VERSION
- v1.3.17 installed on VM (has the split download/install + NSIS hook fix)
- Should detect v1.3.18 → download → kill sidecar → NSIS install
- **This is THE test** for the sidecar fix from v1.3.17
- If it works: Tauri auto-update pipeline is DONE

### Flutter (Phone) — setup for v1.3.19 test
- **IMPORTANT**: User must UNINSTALL v1.3.16/v1.3.17 first (old debug-signed APK conflicts with new release-signed APK)
- Install v1.3.18 fresh from website (first APK with release keystore)
- v1.3.18 is NOT the OTA test — it's the baseline install
- **v1.3.19 will be the Flutter OTA end-to-end test** (v1.3.18 → v1.3.19, both release-signed)

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_mobile/android/app/upload-keystore.jks` | Created | Release keystore (gitignored) |
| `quran_mobile/android/app/upload-keystore.b64` | Created | Base64 keystore for GitHub secret (temporary) |
| `quran_mobile/android/key.properties` | Created | Local signing config (gitignored) |
| `quran_mobile/android/app/build.gradle.kts` | Modified | Added release signing config |
| `.github/workflows/release.yml` | Modified | Added keystore decode + key.properties steps |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | Version → 1.3.18 |
| `quran_frontend/package.json` | Modified | Version → 1.3.18 |
| `quran_frontend/src/pages/Settings.tsx` | Modified | Version → v1.3.18 |
| `quran_mobile/pubspec.yaml` | Modified | Version → 1.3.18+1 |
| `website/index.html` | Modified | Version → 1.3.18 |
| `CLAUDE.md` | Modified | Version table + current version |
| `docs/Logs/2026-03-02-006-flutter-ota-signing-fix-v1.3.18.md` | Created | Session log |

## Next Steps

- [ ] User adds 3 GitHub secrets (ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_PASSWORD)
- [ ] Commit, push, tag v1.3.18
- [ ] Test Tauri auto-update on VM (v1.3.17 → v1.3.18) — validates sidecar fix
- [ ] User uninstalls old Flutter app, installs v1.3.18 fresh from website (baseline for OTA)
- [ ] v1.3.19: Flutter OTA end-to-end test (v1.3.18 → v1.3.19)

## Notes

- The one-time uninstall is unavoidable — you can't go from debug-signed to release-signed without reinstalling
- After v1.3.18, all future APKs will share the same keystore, so OTA updates will work permanently
- The keystore has 10,000 day (~27 year) validity
- The `build.gradle.kts` gracefully falls back to debug signing if `key.properties` doesn't exist (for dev machines)
