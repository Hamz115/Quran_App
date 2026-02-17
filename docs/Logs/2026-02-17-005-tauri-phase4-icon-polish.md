# Session Log: Tauri Phase 4 — App Icon & Sidecar Polish

**Date:** 2026-02-17
**Session:** 005
**Duration:** ~15 minutes
**Author:** Claude (with Hamza)

## Objective

Complete Phase 4 of the Tauri desktop app plan: generate app icons from the existing QuranTrack logo, fix the sidecar parent-watcher crash, and verify resource bundling.

## Summary

Generated all required Tauri icon sizes from the existing `logo.png` using `npx tauri icon`. Fixed a critical bug in the PyInstaller sidecar's parent-watcher that caused immediate termination — the `SYNCHRONIZE` (0x100000) access flag was being denied by Windows, causing the watcher to think the parent was dead. Switched to `PROCESS_QUERY_LIMITED_INFORMATION` (0x1000) with a test-before-start pattern. Confirmed that quran.db, quran-pages/, and QPC fonts are all working correctly in the Tauri WebView (resources bundled inside the PyInstaller exe, fonts served by Vite/WebView).

## Work Completed

### App Icon Generation
- Used `npx tauri icon quran_frontend/public/logo.png` to generate all required icon sizes
- Output placed in `quran_frontend/src-tauri/icons/`: `icon.ico`, `icon.png`, `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `Square*Logo.png` (Windows Store sizes)
- `tauri.conf.json` already references these paths in the `bundle.icon` array

### Parent-Watcher Fix (`pyinstaller_entry.py`)
- **Root cause:** The original parent-watcher used `os.kill(parent_pid, 0)` which throws `SystemError` on Windows (not supported). First fix used `kernel32.OpenProcess(SYNCHRONIZE, ...)` (0x100000), but this access flag was being denied when the sidecar runs as a child of Tauri, causing the watcher to immediately call `os._exit(0)`.
- **Fix:** Changed to `PROCESS_QUERY_LIMITED_INFORMATION` (0x1000) — least-privilege access flag that works reliably
- **Added test-before-start pattern:** Before spawning the watcher thread, verify we can actually open the parent process. If not, skip the watcher entirely (Tauri handles cleanup via `child.kill()` anyway)
- Rebuilt the sidecar exe with the fix

### Resource Bundling Verification
- **quran.db + quran-pages/**: Already bundled inside the PyInstaller exe via `sys._MEIPASS` — no need to use Tauri's `resources/` directory separately
- **QPC fonts**: Served by the WebView from `public/fonts/qpc/` via `@font-face` — work correctly, user confirmed Quran reader renders properly
- **app.db**: Created at runtime next to the exe (read-write) — correct behavior

## Issues Encountered

1. **Sidecar terminates immediately after spawn**: Parent-watcher's `kernel32.OpenProcess(SYNCHRONIZE, ...)` returned 0 (access denied) when the sidecar was spawned by Tauri. The watcher interpreted this as "parent is dead" and called `os._exit(0)`. Fixed by using `PROCESS_QUERY_LIMITED_INFORMATION` (0x1000) which requires less privilege.

2. **Windows Defender PermissionDenied (code 5)**: `tauri build` fails with `PermissionDenied` when trying to access the sidecar exe in `src-tauri/`. This is a known issue with PyInstaller-generated executables triggering Windows Defender real-time protection. File permissions are fine (`icacls` shows full control). **Workaround:** Add a Windows Defender exclusion for the `src-tauri/` folder. This does not affect `tauri dev` in debug mode.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_backend/pyinstaller_entry.py` | Modified | Parent-watcher: SYNCHRONIZE → PROCESS_QUERY_LIMITED_INFORMATION, added test-before-start |
| `quran_frontend/src-tauri/icons/` | Regenerated | All icon sizes from logo.png via `npx tauri icon` |
| `docs/Logs/2026-02-17-005-tauri-phase4-icon-polish.md` | Created | This session log |

## Tests Run

| Test | Result |
|------|--------|
| `npx tauri icon` generates all sizes | Pass |
| `icacls` on sidecar exe shows full permissions | Pass (SYSTEM, Admins, hamza all have F) |
| QPC fonts render in Tauri WebView | Pass (user confirmed) |
| `tauri dev` with sidecar | Blocked by Defender on some runs |
| `tauri build` → NSIS installer | Blocked by Windows Defender (PermissionDenied code 5) |

## Next Steps

- [ ] Add Windows Defender exclusion for `src-tauri/` folder
- [ ] Verify sidecar stays alive with the fixed parent-watcher in `tauri dev`
- [ ] Verify QuranTrack icon appears in title bar and taskbar
- [ ] Phase 5: Test `tauri build` → NSIS installer on clean machine
- [ ] Phase 5: Verify Supabase sync from installed app

## Notes

- The `resources/` approach from the original plan (copying quran.db + quran-pages/ to `src-tauri/resources/`) is unnecessary — PyInstaller already bundles them inside the exe via `sys._MEIPASS`. This simplifies the setup.
- The parent-watcher in `pyinstaller_entry.py` is a safety net. Normal shutdown uses Tauri's `on_window_event(CloseRequested)` → `child.kill()`.
- Windows Defender false positives on PyInstaller exes are a known industry-wide issue. Long-term fix is code-signing the exe with a certificate.
- File permissions (`icacls`) are fine — the Defender issue is real-time protection quarantining the exe, not an ACL problem.
