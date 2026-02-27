# Session Log: Tauri Internals Fix + CI Release Workflow

**Date:** 2026-02-28
**Session:** 001

## Objective

Fix the Tauri v2 `__TAURI__` detection check (should be `__TAURI_INTERNALS__`) so the App Info card shows in Settings. Add GitHub Actions release workflow for automated builds.

## Summary

Fixed `window.__TAURI__` → `window.__TAURI_INTERNALS__` in both `updater.ts` and `Settings.tsx` so the update UI actually appears in the desktop app. Created `.github/workflows/release.yml` that automatically builds the Tauri installer, signs it, generates `latest.json`, and creates a GitHub Release when a `v*` tag is pushed. Uploaded backend data files to S3 for CI access.

## Work Completed

### 1. Fix Tauri v2 Detection
- In Tauri v2, the global is `__TAURI_INTERNALS__`, not `__TAURI__`
- Fixed check in `updater.ts` and `Settings.tsx`
- This was causing the App Info card to be hidden in the desktop app

### 2. GitHub Actions Release Workflow
- Created `.github/workflows/release.yml`
- Triggers on `v*` tag pushes
- Downloads backend data files (quran.db, qpc-v2.db, qpc-v2-15-lines.db) from S3
- Writes `.env` from `BACKEND_ENV` GitHub secret
- Builds Python sidecar (PyInstaller), then Tauri app (with signing)
- Auto-generates `latest.json` from the signature
- Creates GitHub Release with installer + sig + latest.json

### 3. S3 Data Files for CI
- Uploaded `quran.db`, `qpc-v2.db`, `qpc-v2-15-lines.db` to `s3://qurantrack.hamzas.world/ci-data/`
- These are gitignored but needed by PyInstaller to bundle the sidecar

### 4. Landing Page Update
- Updated download link to v1.3.1

## Issues Encountered

- **`__TAURI__` vs `__TAURI_INTERNALS__`**: Tauri v2 changed the global variable name, causing the App Info card to never render
- **CI PyInstaller failure**: First workflow run failed because `quran.db` and other data files are gitignored. Solved by uploading to S3 and downloading in CI.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/src/lib/updater.ts` | Modified | Fixed `__TAURI__` → `__TAURI_INTERNALS__` |
| `quran_frontend/src/pages/Settings.tsx` | Modified | Fixed `__TAURI__` → `__TAURI_INTERNALS__`, bumped version to v1.3.1 |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | Bumped version to 1.3.1 |
| `quran_frontend/package.json` | Modified | Bumped version to 1.3.1 |
| `.github/workflows/release.yml` | Modified | Added S3 download + .env from secret |
| `website/index.html` | Modified | Updated download link to v1.3.1 |
| `CLAUDE.md` | Modified | Added v1.3.1 to version history, added release workflow instructions |

## GitHub Secrets Required

| Secret | Purpose |
|--------|---------|
| `TAURI_SIGNING_PRIVATE_KEY` | Tauri update signing key |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | `Hamza_quran2026` |
| `BACKEND_ENV` | Backend .env file contents (Supabase credentials) |
| `AWS_ACCESS_KEY_ID` | Already existed (website deployment) |
| `AWS_SECRET_ACCESS_KEY` | Already existed (website deployment) |

## S3 Data Files

| S3 Path | Size | Purpose |
|---------|------|---------|
| `s3://qurantrack.hamzas.world/ci-data/quran.db` | 1.7 MB | Quran text data |
| `s3://qurantrack.hamzas.world/ci-data/qpc-v2.db` | 4.1 MB | QPC v2 word data |
| `s3://qurantrack.hamzas.world/ci-data/qpc-v2-15-lines.db` | 236 KB | QPC v2 15-line layout |

## Next Steps

- [ ] Verify v1.3.1 workflow completes successfully
- [ ] Test auto-update on VM (install v1.3.0, verify it detects v1.3.1)

## Notes

- Signing key password: `Hamza_quran2026` (also saved in `2026-02-27-002` log)
- The v1.3.0 release was created manually; v1.3.1 is the first automated release
