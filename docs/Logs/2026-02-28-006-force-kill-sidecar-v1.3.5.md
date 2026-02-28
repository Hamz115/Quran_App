# Session Log: Force-Kill Sidecar with taskkill

**Date:** 2026-02-28
**Session:** 006

## Objective

Fix sidecar still not being killed during auto-update. The v1.3.3 `child.kill()` approach was not working on Windows — the installer still hit "Error opening file for writing: quran-backend.exe".

## Summary

Replaced the single `child.kill()` call with a 3-step approach: (1) `child.kill()` via Tauri handle, (2) `taskkill /F /IM quran-backend.exe` to force-kill by process name, (3) 2-second sleep to let Windows fully release file handles. Applied same approach to the window close handler.

## Work Completed

### Root Cause
- `child.kill()` from Tauri's shell plugin was not reliably terminating the sidecar on Windows
- Possible causes: PyInstaller --onefile spawns a child process that `child.kill()` doesn't reach, or Windows file handles aren't released fast enough before the installer starts

### Fix: 3-Step Kill
1. `child.kill()` — try the Tauri child handle first (may work for the wrapper process)
2. `taskkill /F /IM quran-backend.exe` — force-kill by process name as backup (catches any child processes)
3. `std::thread::sleep(2 seconds)` — wait for Windows to fully release file handles before returning

Applied to both:
- `kill_sidecar` Tauri command (called before update relaunch)
- `on_window_event(CloseRequested)` handler (called on normal window close, minus the sleep)

## Issues Encountered

- **v1.3.3 `child.kill()` didn't work**: The installer still got the file lock error, meaning the process wasn't actually terminated. The `taskkill /F` approach is the nuclear option that should work regardless.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/src-tauri/src/lib.rs` | Modified | 3-step kill: child.kill() + taskkill /F + 2s sleep |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | Version bump to 1.3.5 |
| `quran_frontend/package.json` | Modified | Version bump to 1.3.5 |
| `quran_frontend/src/pages/Settings.tsx` | Modified | Version display to v1.3.5 |
| `website/index.html` | Modified | Download link updated to v1.3.5 |
| `CLAUDE.md` | Modified | Version table updated |

## Next Steps

- [ ] Test v1.3.4 → v1.3.5 update on VM (this time both sidecar kill AND overlay should work since v1.3.4 has both)
- [ ] Confirm no "Error opening file for writing" dialog

## Notes

- Continues from `2026-02-28-005-fullscreen-update-overlay-v1.3.4.md`
- v1.3.4 on the VM has both the overlay AND the old `child.kill()` approach. When it updates to v1.3.5, the overlay will show but the sidecar kill may still fail (since v1.3.4's Rust binary has the old kill code). The NEW taskkill approach only takes effect from v1.3.5 onward.
- To test properly: manually install v1.3.5 on VM, then trigger v1.3.6+ update to see it work end-to-end.
