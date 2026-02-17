# Session Log: Tauri Phase 1 — Scaffold & First Launch

**Date:** 2026-02-17
**Session:** 002
**Duration:** ~30 minutes
**Author:** Claude (with Hamza)

## Objective

Complete Phase 1 of the Tauri desktop app plan: install prerequisites, scaffold Tauri inside `quran_frontend/`, configure all settings, and verify the React frontend opens in a native desktop window.

## Summary

Successfully scaffolded Tauri v2 inside the existing `quran_frontend/` Vite project. After installing Rust (MSVC toolchain), Visual Studio Build Tools (C++ workload), and the Tauri npm packages, ran `npx tauri init` to create the `src-tauri/` directory. Configured `tauri.conf.json` (window size, CSP for localhost:8000 + Supabase), capabilities (shell permissions for future sidecar), and `Cargo.toml` (shell plugin). First `tauri dev` compiled 409 Rust crates and successfully launched the QuranTrack React app in a native Windows window.

## Prerequisites Installed

| Dependency | Version | Notes |
|---|---|---|
| Visual Studio Build Tools 2026 | 18.3.0 | "Desktop development with C++" workload |
| Rust (MSVC toolchain) | 1.93.1 | Target: x86_64-pc-windows-msvc |
| @tauri-apps/cli | ^2.10.0 | devDependency |
| @tauri-apps/api | ^2.10.1 | dependency |
| @tauri-apps/plugin-shell | ^2.3.5 | dependency (for future sidecar) |

## Work Completed

### Tauri Scaffold
- Ran `npx tauri init` with: app name "QuranTrack", window title "QuranTrack", dev URL `http://localhost:5173`, frontend dist `../dist`
- Created `src-tauri/` directory with all standard files (tauri.conf.json, Cargo.toml, build.rs, src/main.rs, src/lib.rs, capabilities/, icons/)

### Configuration
- **tauri.conf.json**: identifier `com.qurantrack.app`, window 1280x800 (min 900x600), centered, CSP allowing `localhost:8000` (backend) and `*.supabase.co` (cloud sync), font-src for QPC fonts
- **capabilities/default.json**: `core:default`, `shell:allow-spawn`, `shell:allow-kill`, `shell:allow-open`
- **Cargo.toml**: Added `tauri-plugin-shell = "2"` dependency, renamed package to `quran-track`
- **lib.rs**: Simplified to just initialize the shell plugin (sidecar lifecycle code comes in Phase 3)
- **package.json**: Added `tauri:dev`, `tauri:build`, `build:sidecar` scripts

### .gitignore
- Added `quran_frontend/src-tauri/target/`, `quran_frontend/src-tauri/binaries/*.exe`, `quran_frontend/src-tauri/gen/`

### First Launch
- `npx tauri dev` compiled 409 Rust crates (~3 minutes first build)
- Native window opened with the React frontend loaded inside WebView2
- Hot reload works (Vite dev server at localhost:5173)

## Issues Encountered

1. **`opener:default` permission not found**: The plan referenced `opener:default` in capabilities, but this permission doesn't exist in Tauri v2.10. Removed it and used flat shell permissions (`shell:allow-spawn`, `shell:allow-kill`, `shell:allow-open`) instead.
2. **Sidecar exe not found**: `externalBin` in tauri.conf.json requires the actual `.exe` to exist at build time. Temporarily removed `externalBin` and `resources` from config for Phase 1 testing — will be re-added in Phase 2 when the PyInstaller sidecar is built.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/package.json` | Modified | Added @tauri-apps/cli, api, plugin-shell; added tauri scripts |
| `quran_frontend/src-tauri/` | Created | Entire Tauri directory (tauri init scaffold) |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | Window config, CSP, identifier |
| `quran_frontend/src-tauri/Cargo.toml` | Modified | Added tauri-plugin-shell, renamed to quran-track |
| `quran_frontend/src-tauri/src/lib.rs` | Modified | Simplified with shell plugin init |
| `quran_frontend/src-tauri/capabilities/default.json` | Modified | Shell permissions for sidecar |
| `quran_frontend/src-tauri/binaries/.gitkeep` | Created | Placeholder for future sidecar exe |
| `quran_frontend/src-tauri/resources/.gitkeep` | Created | Placeholder for future bundled resources |
| `.gitignore` | Modified | Added Tauri build artifacts |
| `docs/Logs/2026-02-17-002-tauri-phase1-scaffold.md` | Created | This session log |

## Tests Run

| Test | Result |
|------|--------|
| `rustc --version` | 1.93.1 (x86_64-pc-windows-msvc) |
| `npx tauri dev` (first build) | 409/409 crates compiled, window launched |
| React frontend in native window | Loaded successfully via WebView2 |

## Next Steps

- [ ] Phase 2: Create PyInstaller entrypoint + spec file, build sidecar exe
- [ ] Phase 2: Modify `quran_backend/main.py` path resolution for frozen mode
- [ ] Phase 2: Test standalone sidecar exe
- [ ] Phase 3: Add sidecar lifecycle to lib.rs (spawn on start, kill on close)
- [ ] Phase 3: Re-add externalBin + resources to tauri.conf.json
- [ ] Phase 4: Bundle quran.db, quran-pages/, app icon
- [ ] Phase 5: Full distribution build + NSIS installer test

## Notes

- First Rust compilation took ~3 minutes. Subsequent builds are incremental and take <30 seconds.
- The `externalBin` config validates at build time — the sidecar `.exe` must physically exist. This means Phase 2 (PyInstaller build) must complete before we can re-enable it.
- Daily dev workflow stays identical: run `python main.py` in one terminal, `npm run tauri:dev` in another. The native window wraps the same Vite dev server.
- CSP includes `https://*.supabase.co` since the frontend calls Supabase directly for auth and real-time sync.
