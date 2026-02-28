# Session Log: Fix kill_sidecar Hanging

**Date:** 2026-02-28
**Session:** 008

## Objective

Fix the `kill_sidecar` Tauri command hanging indefinitely, causing the update overlay to freeze at "Downloading update... 0%".

## Summary

The `taskkill` call used `.output()` which blocks until the command finishes and captures stdout/stderr. Combined with a 2-second `thread::sleep`, this was blocking the Tauri command handler and never returning to JavaScript. Fixed by using `.spawn()` (fire-and-forget) for taskkill and moving the delay to a non-blocking JS `setTimeout`.

## Work Completed

### Root Cause
- `std::process::Command::new("taskkill").args(...).output()` blocks the thread waiting for taskkill to complete
- `std::thread::sleep(Duration::from_secs(2))` further blocked the handler
- The Tauri `invoke('kill_sidecar')` never resolved, so `downloadAndInstall()` never ran
- Result: overlay stuck at "Downloading update... 0%" forever

### Fix
- **Rust (`lib.rs`)**: Changed `.output()` to `.spawn()` — dispatches taskkill and returns immediately
- **Rust (`lib.rs`)**: Removed the `thread::sleep(2s)` from the command handler
- **TypeScript (`updater.ts`)**: Added `await new Promise(resolve => setTimeout(resolve, 3000))` after the invoke — gives Windows 3 seconds to fully terminate the process and release file handles, without blocking the UI

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/src-tauri/src/lib.rs` | Modified | Use .spawn() instead of .output(), remove thread::sleep |
| `quran_frontend/src/lib/updater.ts` | Modified | Add 3s JS delay after kill_sidecar invoke |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | Version bump to 1.3.9 |
| `quran_frontend/package.json` | Modified | Version bump to 1.3.9 |
| `quran_frontend/src/pages/Settings.tsx` | Modified | Version display to v1.3.9 |
| `website/index.html` | Modified | Download link updated to v1.3.9 |
| `CLAUDE.md` | Modified | Version table updated |

## Next Steps

- [ ] Manually install v1.3.9 on VM (v1.3.7 has old Rust binary with blocking .output())
- [ ] Push v1.3.10 test release and verify full flow: overlay + sidecar kill + clean install

## Notes

- Continues from `2026-02-28-007-kill-sidecar-before-install-v1.3.7.md`
- Same chicken-and-egg: VM running v1.3.7 has old Rust binary. Must manually install v1.3.9 first.
