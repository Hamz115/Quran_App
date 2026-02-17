# Session Log: Tauri Desktop App Planning

**Date:** 2026-02-17
**Session:** 001
**Duration:** ~1 hour
**Author:** Claude (with Hamza)

## Objective

Plan the conversion of QuranTrack's web frontend into a native desktop application using Tauri v2, with the FastAPI backend bundled as a PyInstaller sidecar.

## Summary

Researched and documented a complete implementation plan for wrapping QuranTrack in a Tauri v2 shell. The FastAPI backend will be compiled into a standalone `.exe` via PyInstaller and bundled as a Tauri sidecar. The React frontend remains completely unchanged. A comprehensive planning document was created at `docs/Technical Implementation Journey/Tauri_Desktop_App_Plan.md`.

## Work Completed

### Decision Making
- Evaluated Tauri vs Electron — chose Tauri for smaller bundle size and better Vite integration
- Decided on PyInstaller sidecar over rewriting backend in Rust — zero backend code rewrites
- Confirmed Supabase stays as the always-on background sync layer (not optional)
- User chose: Windows-only target, project inside `quran_frontend/`, full backend sidecar, all QPC fonts bundled

### Research
- Tauri v2 sidecar configuration (externalBin, shell plugin, capabilities/permissions system)
- Tauri v2 prerequisites for Windows 11 (Rust MSVC toolchain, VS Build Tools, WebView2)
- Tauri v2 project initialization for existing Vite+React projects
- PyInstaller spec file creation for FastAPI + uvicorn + all QuranTrack dependencies
- PyInstaller gotchas: `--noconsole` stdout crash, `--onefile` dual-process orphan issue, Windows Defender false positives
- Sidecar lifecycle management (spawn on app start, kill on close)
- CSP configuration for localhost API connections in Tauri WebView
- Resource bundling for `quran.db` and `quran-pages/` JSON files
- Compared PyInstaller vs Nuitka vs cx_Freeze — PyInstaller recommended for this use case

### Planning Document
- Created `Tauri_Desktop_App_Plan.md` with 10 sections covering:
  - Architecture diagram
  - Prerequisites
  - Project structure
  - Step-by-step Tauri setup
  - PyInstaller sidecar configuration (entrypoint, spec file, path resolution)
  - Development workflow
  - Known gotchas and mitigations
  - 5-phase implementation roadmap
  - Files that need changes (and files that don't)
  - Open questions for later

## Issues Encountered

- **PyInstaller `--onefile` orphan process:** When Tauri kills the sidecar, only the bootloader parent dies; the actual Python process survives. Documented two solutions: parent-watcher thread or `--onedir` mode.
- **Uvicorn `--noconsole` crash:** `sys.stdout` is `None` in noconsole mode, causing uvicorn logger to throw `AttributeError`. Solution: redirect stdout/stderr before importing uvicorn.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `docs/Technical Implementation Journey/Tauri_Desktop_App_Plan.md` | Created | Full implementation plan (architecture, config, phases, gotchas) |
| `docs/Logs/2026-02-17-001-tauri-desktop-app-planning.md` | Created | This session log |

## Tests Run

| Test | Result |
|------|--------|
| N/A (planning session) | N/A |

## Next Steps

- [ ] Install prerequisites (Rust, VS Build Tools)
- [ ] Phase 1: Initialize Tauri in `quran_frontend/` and verify `tauri dev` works
- [ ] Phase 2: Create PyInstaller entrypoint + spec file, build sidecar exe
- [ ] Phase 3: Integrate sidecar with Tauri (spawn/kill lifecycle)
- [ ] Phase 4: Bundle resources (quran.db, quran-pages, fonts), polish
- [ ] Phase 5: Test full build + NSIS installer on clean machine

## Notes

- The 604 QPC font files (~92 MB) dominate the bundle size — no way around this for offline use
- The frontend React code requires ZERO changes — all API calls (`fetch` to `localhost:8000`) work identically inside Tauri's WebView
- Daily development stays the same: run backend in one terminal, `tauri dev` in another. Only distribution builds need PyInstaller
- Tauri's first build takes 2-5 minutes (Rust crate compilation). Subsequent builds are incremental
- Consider moving `app.db` to `%APPDATA%/QuranTrack/` later for proper Windows app data management
