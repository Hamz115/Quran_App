# Session Log: Tauri Phase 2 — PyInstaller Sidecar

**Date:** 2026-02-17
**Session:** 003
**Duration:** ~30 minutes
**Author:** Claude (with Hamza)

## Objective

Complete Phase 2 of the Tauri desktop app plan: create the PyInstaller entrypoint, spec file, modify backend path resolution for frozen mode, build the sidecar exe, and verify it works standalone.

## Summary

Created the PyInstaller entrypoint script with Windows-specific parent-watcher (prevents orphan sidecar), stdout/stderr redirect for `--noconsole` mode, and `freeze_support()`. Modified all backend path references (`main.py`, `auth/routes.py`, `sync_service.py`) to use `sys._MEIPASS` for read-only assets and `sys.executable.parent` for read-write files. Built a 31MB sidecar exe that successfully serves the FastAPI API on `localhost:8000`.

## Work Completed

### PyInstaller Entrypoint (`pyinstaller_entry.py`)
- `multiprocessing.freeze_support()` — prevents infinite child process spawning on Windows
- stdout/stderr redirect to `backend.log` — prevents uvicorn crash in `--noconsole` mode
- Parent-watcher thread using Windows `kernel32.OpenProcess` — kills sidecar if Tauri dies

### Path Resolution for Frozen Mode
Modified 3 files to detect `sys.frozen` and use appropriate paths:

| File | Read-only assets | Read-write files |
|---|---|---|
| `main.py` | `sys._MEIPASS` → quran.db, quran-pages, fonts | `sys.executable.parent` → app.db, Backups/ |
| `auth/routes.py` | — | `sys.executable.parent` → app.db |
| `sync_service.py` | `sys._MEIPASS` → .env | `sys.executable.parent` → app.db |

### PyInstaller Spec File (`QuranTrackBackend.spec`)
- Hidden imports: uvicorn, fastapi, starlette, jose, passlib, supabase, gotrue, postgrest, storage3, realtime, httpx, + individual modules
- Bundled data: `quran.db`, `quran-pages/`, `.env`
- Excluded: tkinter, matplotlib, numpy, scipy, pandas, PIL, cv2, playwright
- Note: `unittest` was initially excluded but `pyparsing` (via storage3 → pyiceberg) requires it — removed from excludes

### Build & Test
- Built with PyInstaller 6.19.0 inside the existing `venv/`
- Output: `dist/QuranTrackBackend.exe` (31 MB)
- Standalone test: HTTP 200 on `GET /docs` — API is fully operational
- Copied to `src-tauri/binaries/quran-backend-x86_64-pc-windows-msvc.exe`

## Issues Encountered

1. **`unittest` excluded but needed:** `pyparsing.testing` (pulled in by `pyiceberg` via `storage3`) imports `unittest`. Removed `unittest` from the excludes list and rebuilt.
2. **`os.kill(pid, 0)` broken on Windows:** The parent-watcher thread used `os.kill(parent_pid, 0)` to check if the parent is alive, but this throws `SystemError` on Windows. Switched to `kernel32.OpenProcess` with `SYNCHRONIZE` access.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_backend/pyinstaller_entry.py` | Created | PyInstaller entrypoint (stdout fix, freeze_support, parent watcher) |
| `quran_backend/QuranTrackBackend.spec` | Created | PyInstaller spec file (hidden imports, data, excludes) |
| `quran_backend/main.py` | Modified | Path resolution: `_BASE_DIR` / `_WRITABLE_DIR` for frozen mode |
| `quran_backend/auth/routes.py` | Modified | APP_DB path resolution for frozen mode |
| `quran_backend/sync_service.py` | Modified | `_WRITABLE_DIR` / `_SRC_DIR` path resolution for frozen mode |
| `quran_frontend/src-tauri/binaries/quran-backend-*.exe` | Created | 31MB sidecar exe (gitignored) |
| `docs/Logs/2026-02-17-003-tauri-phase2-sidecar.md` | Created | This session log |

## Tests Run

| Test | Result |
|------|--------|
| PyInstaller build | 31 MB exe, build complete |
| Standalone exe → `GET /docs` | HTTP 200 |
| API serves on `localhost:8000` | Verified |

## Next Steps

- [ ] Phase 3: Write sidecar lifecycle in `lib.rs` (spawn on start, kill on close)
- [ ] Phase 3: Re-add `externalBin` to `tauri.conf.json`
- [ ] Phase 3: Test full Tauri + sidecar integration
- [ ] Phase 4: Bundle resources, polish, app icon
- [ ] Phase 5: Distribution build + NSIS installer

## Notes

- The sidecar exe is 31 MB (lighter than the 100-125 MB estimate in the plan). Excluding Playwright helped significantly.
- PyInstaller was installed inside the existing `venv/` — not globally.
- The `--noconsole` exe writes logs to `backend.log` next to the exe. Useful for debugging in production.
- `app.db` is NOT bundled in the exe — it's read-write and lives next to the exe at runtime. On first launch, FastAPI's startup handler creates it automatically.
- The parent-watcher thread ensures the sidecar dies if Tauri crashes — prevents orphan processes eating port 8000.
