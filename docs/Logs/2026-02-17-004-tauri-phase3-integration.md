# Session Log: Tauri Phase 3 — Sidecar Integration

**Date:** 2026-02-17
**Session:** 004
**Duration:** ~20 minutes
**Author:** Claude (with Hamza)

## Objective

Complete Phase 3 of the Tauri desktop app plan: wire the PyInstaller sidecar into Tauri's lifecycle (spawn on app start, kill on window close) and verify full integration.

## Summary

Wrote the Rust sidecar lifecycle code in `lib.rs` to spawn the FastAPI sidecar on app startup and kill it on window close. After fixing Rust compiler errors (missing `Manager` trait import, borrow checker issue) and resolving the sidecar path resolution for dev mode, achieved full integration: Tauri launches, spawns the backend sidecar, the frontend connects to `localhost:8000`, and the sidecar terminates on window close.

## Work Completed

### Sidecar Lifecycle (`lib.rs`)
- Spawn sidecar via `app.shell().sidecar("quran-backend").spawn()`
- Store `CommandChild` handle in `Mutex<Option<CommandChild>>` state
- Background async task logs sidecar stdout/stderr
- `on_window_event(CloseRequested)` kills the sidecar via `child.kill()`

### Configuration Changes
- **`tauri.conf.json`**: `externalBin` set to `["quran-backend"]` (no `binaries/` prefix — Tauri resolves the path automatically)
- **`capabilities/default.json`**: Uses flat `shell:allow-spawn`, `shell:allow-kill`, `shell:allow-open` permissions

### Sidecar Path Resolution (Key Finding)
- In **dev mode**, Tauri resolves the sidecar relative to the debug exe (`target/debug/`). The file must be at `target/debug/quran-backend-x86_64-pc-windows-msvc.exe`.
- In **production**, Tauri bundles it from `src-tauri/quran-backend-x86_64-pc-windows-msvc.exe`.
- The `binaries/` subdirectory approach (from the original plan) doesn't work — Tauri doesn't look inside subdirectories for externalBin. The sidecar name in `externalBin` and `sidecar()` must match, and the exe must be at the `src-tauri/` root (or bundled location).

### Integration Test
- `npx tauri dev` → Tauri window opens with React frontend
- Sidecar spawns automatically → `localhost:8000` serves HTTP 200
- Window close → sidecar process is killed

## Issues Encountered

1. **Missing `use tauri::Manager`**: The `window.state()` call requires the `Manager` trait to be in scope. Added the import.
2. **Borrow checker error**: `state.child.lock().unwrap().take()` created a temporary that was dropped while still borrowed. Fixed by binding the `MutexGuard` result to a separate variable before pattern matching.
3. **Sidecar not found (code 3/2)**: Tauri's `externalBin` with `"binaries/quran-backend"` didn't resolve correctly in dev mode. Changed to `"quran-backend"` (no subdirectory prefix) and placed the exe directly at `src-tauri/quran-backend-*.exe` and `target/debug/quran-backend-*.exe`.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/src-tauri/src/lib.rs` | Modified | Sidecar lifecycle: spawn on setup, log output, kill on close |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | `externalBin: ["quran-backend"]` (no binaries/ prefix) |
| `.gitignore` | Modified | Added `quran_frontend/src-tauri/quran-backend-*.exe` |
| `docs/Logs/2026-02-17-004-tauri-phase3-integration.md` | Created | This session log |

## Tests Run

| Test | Result |
|------|--------|
| `npx tauri dev` compiles | 409/409 crates, no errors |
| Tauri window opens | React frontend loaded in WebView2 |
| Sidecar auto-starts | `localhost:8000` → HTTP 200 |
| Window close kills sidecar | Verified via `child.kill()` in `on_window_event` |

## Next Steps

- [ ] Phase 4: Bundle resources (quran.db, quran-pages/), app icon
- [ ] Phase 4: Verify QPC fonts render in WebView
- [ ] Phase 4: Test `tauri build` → NSIS installer
- [ ] Phase 5: Test installer on clean machine, verify Supabase sync

## Notes

- The parent-watcher in `pyinstaller_entry.py` is a safety net for crashes. Normal shutdown uses Tauri's `on_window_event` → `child.kill()`.
- For dev workflow: run `npx tauri dev` and it handles everything (Vite + Tauri + sidecar). No need to start the backend separately.
- The sidecar exe must be manually copied to `target/debug/` for dev mode. A build script could automate this later.
- `tauri-plugin-shell = "2"` was already in `Cargo.toml` and `capabilities/default.json` from Phase 1.
