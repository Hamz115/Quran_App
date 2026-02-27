# Session Log: Tauri Internals Fix + CI Release Workflow

**Date:** 2026-02-28
**Session:** 001

## Objective

Fix the Tauri v2 `__TAURI__` detection check (should be `__TAURI_INTERNALS__`) so the App Info card shows in Settings. Add GitHub Actions release workflow for automated builds.

## Summary

Fixed `window.__TAURI__` → `window.__TAURI_INTERNALS__` in both `updater.ts` and `Settings.tsx` so the update UI actually appears in the desktop app. Created `.github/workflows/release.yml` that automatically builds the Tauri installer, signs it, generates `latest.json`, and creates a GitHub Release when a `v*` tag is pushed.

## Work Completed

### 1. Fix Tauri v2 Detection
- In Tauri v2, the global is `__TAURI_INTERNALS__`, not `__TAURI__`
- Fixed check in `updater.ts` and `Settings.tsx`
- This was causing the App Info card to be hidden in the desktop app

### 2. GitHub Actions Release Workflow
- Created `.github/workflows/release.yml`
- Triggers on `v*` tag pushes
- Builds Python sidecar (PyInstaller), then Tauri app (with signing)
- Auto-generates `latest.json` from the signature
- Creates GitHub Release with installer + sig + latest.json
- Requires two GitHub secrets: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

## Issues Encountered

- **`__TAURI__` vs `__TAURI_INTERNALS__`**: Tauri v2 changed the global variable name, causing the App Info card to never render

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/src/lib/updater.ts` | Modified | Fixed `__TAURI__` → `__TAURI_INTERNALS__` |
| `quran_frontend/src/pages/Settings.tsx` | Modified | Fixed `__TAURI__` → `__TAURI_INTERNALS__` |
| `.github/workflows/release.yml` | Created | Automated build + release workflow |

## Next Steps

- [ ] Add `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` as GitHub repo secrets
- [ ] Test workflow by pushing a `v1.3.1` tag
- [ ] Verify auto-update works end-to-end on VM

## Notes

- Signing key password: `Hamza_quran2026` (also saved in `2026-02-27-002` log)
- The private key contents need to be added as a GitHub secret (not the file path)
