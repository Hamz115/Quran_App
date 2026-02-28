# Session Log: Fix Sidecar Not Killed Before Update Install

**Date:** 2026-02-28
**Session:** 004

## Objective

Fix the NSIS installer error "Error opening file for writing: quran-backend.exe" that occurs when the auto-updater tries to install a new version while the backend sidecar process is still running.

## Summary

Added a `kill_sidecar` Tauri command in Rust and called it from the TypeScript updater before `relaunch()`. The root cause was that `relaunch()` bypasses the `CloseRequested` window event, so the existing sidecar cleanup code in `on_window_event` never ran during updates. The fix explicitly kills the sidecar before the app restarts for the installer.

## Work Completed

### Root Cause Analysis
- When the user clicks "Update Now", the updater calls `downloadAndInstall()` then `relaunch()`
- `relaunch()` exits the app process directly — it does NOT trigger the `CloseRequested` window event
- The sidecar kill logic was only in `on_window_event(CloseRequested)`, so it never ran during updates
- The NSIS installer then fails because `quran-backend.exe` is still locked by the running sidecar process

### Fix Implementation
- **Rust (`lib.rs`)**: Added `#[tauri::command] fn kill_sidecar()` that grabs the stored `CommandChild` handle from `SidecarState` and calls `.kill()` on it
- Registered the command with `.invoke_handler(tauri::generate_handler![kill_sidecar])`
- **TypeScript (`updater.ts`)**: Before calling `relaunch()`, added `invoke('kill_sidecar')` call wrapped in try/catch (non-blocking — if it fails, the parent watcher in the sidecar will still eventually kill it)

### Update flow after fix
1. Download update → 2. Kill sidecar → 3. Relaunch → 4. Installer overwrites `quran-backend.exe` without conflict

## Issues Encountered

- **v1.3.2 → v1.3.3 update still showed the error**: Expected — the v1.3.2 app running on the VM had the OLD updater code without the fix. The fix only takes effect for updates FROM v1.3.3 onward. Had to manually kill the sidecar via Task Manager and reinstall.
- **Local Rust toolchain**: `cargo check` failed locally due to `tracing-core` dependency errors — pre-existing toolchain issue, CI builds fine.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/src-tauri/src/lib.rs` | Modified | Added `kill_sidecar` Tauri command + registered with invoke_handler |
| `quran_frontend/src/lib/updater.ts` | Modified | Call `invoke('kill_sidecar')` before `relaunch()` |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | Version bump to 1.3.3 |
| `quran_frontend/package.json` | Modified | Version bump to 1.3.3 |
| `quran_frontend/src/pages/Settings.tsx` | Modified | Version display to v1.3.3 |
| `website/index.html` | Modified | Download link updated to v1.3.3 |
| `CLAUDE.md` | Modified | Version table updated |

## Next Steps

- [x] Verify v1.3.3 installs correctly on VM (confirmed — had to manually install this one, but future updates will work)
- [ ] Test that v1.3.3 → v1.3.4 update kills sidecar automatically

## Notes

- The sidecar also has a parent-watcher thread (`pyinstaller_entry.py`) that checks every 3 seconds if the Tauri parent process is still alive and exits if not. This is a backup mechanism, but the 3-second polling creates a race condition with the installer — the explicit `kill_sidecar` call is the reliable fix.
- Continues from session `2026-02-28-003-settings-page-redesign-v1.3.2.md`
