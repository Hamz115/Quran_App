# Session Log: Tauri Installer Build — Plan & Execution

**Date:** 2026-02-22
**Session:** 002

## Objective

Investigate the current state of the Tauri desktop app setup, create a detailed step-by-step plan, and build the production NSIS installer.

## Summary

Thoroughly investigated all Tauri-related files, toolchain versions, sidecar setup, and previous session logs. Phases 1-4 were complete. Executed Phase 5: disabled Supabase email confirmation, rebuilt PyInstaller sidecar, fixed a TS build error, removed dead Cargo dependencies, and successfully built the first production NSIS installer (`QuranTrack_0.1.0_x64-setup.exe`, 85 MB). Tested on VMware VM — app launches and works. Two issues identified: installer uses default icon instead of QuranTrack logo, and navbar needs visual polish in the desktop context.

---

## Current State Assessment

### What's DONE (Phases 1-4)

| Component | Status | Details |
|-----------|--------|---------|
| Tauri scaffold (`src-tauri/`) | DONE | All files in place, `tauri dev` works |
| Rust sidecar lifecycle (`lib.rs`) | DONE | Spawn on startup, kill on close, stdout/stderr logging |
| `tauri.conf.json` | DONE | CSP configured for localhost:8000 + Supabase + Google Fonts |
| PyInstaller spec | DONE | Hidden imports, data files (quran.db, quran-pages/, .env), excludes playwright |
| PyInstaller entrypoint | DONE | freeze_support, stdout redirect, parent-watcher (kernel32) |
| Backend frozen-mode paths | DONE | `main.py`, `auth/routes.py`, `sync_service.py` all handle `sys._MEIPASS` |
| Sidecar exe | DONE | 31 MB, placed at `src-tauri/quran-backend-x86_64-pc-windows-msvc.exe` |
| App icons | DONE | All sizes generated (ico, png, icns) |
| Tauri dev mode | DONE | `tauri dev` launches native window + sidecar |

### What's NOT Done

| Item | Status |
|------|--------|
| `npm run tauri:build` (release build) | NEVER RUN |
| `target/release/` directory | DOES NOT EXIST |
| NSIS installer (.exe) | NOT BUILT |
| Clean machine test | NOT DONE |
| PyInstaller globally installed | NOT INSTALLED (was in a venv) |
| Sidecar exe rebuild | May need rebuild (Feb 18 build, code may have changed since) |

### Toolchain Versions

| Tool | Version |
|------|---------|
| rustc | 1.93.1 (2026-02-11) |
| cargo | 1.93.1 |
| Tauri CLI | 2.10.0 |
| Node.js | Installed (Vite project works) |
| Python | 3.11 |
| PyInstaller | NOT currently installed |

### Known Issues to Handle

1. **Windows Defender** — blocks PyInstaller exe. Need to add `src-tauri/` as Defender exclusion
2. **Port 8000 orphans** — if build/dev crashes, sidecar may hold the port
3. **Sidecar exe may be stale** — built Feb 18, backend code changed since (scripts moved, etc.)
4. **`tauri-plugin-log`** — dead dependency in Cargo.toml (not initialized in lib.rs)
5. **`.env` bundled in exe** — contains Supabase keys, bundled via PyInstaller (acceptable for now)
6. **No code signing** — unsigned installer will trigger SmartScreen warning

---

## Step-by-Step Installer Build Plan

### Pre-Build Preparation

#### Step 1: Add Windows Defender Exclusion
**Why:** Windows Defender real-time protection locks PyInstaller exes, causing `PermissionDenied` errors when Tauri tries to copy/overwrite them during build.

**Action:**
```powershell
# Run PowerShell as Administrator
Add-MpPreference -ExclusionPath "C:\Users\hamza\Documents\Quran_App\quran_frontend\src-tauri"
Add-MpPreference -ExclusionPath "C:\Users\hamza\Documents\Quran_App\quran_backend\dist"
```

**Verify:**
```powershell
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
```

#### Step 2: Kill Any Orphan Sidecar Processes
**Why:** A previous `tauri dev` session may have left a sidecar holding port 8000.

**Action:**
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000
# If a PID is found:
taskkill /PID <pid> /F
```

#### Step 3: Clean Up Dead Dependency
**Why:** `tauri-plugin-log` is in Cargo.toml but never used — adds unnecessary compile time.

**Action:** Remove `tauri-plugin-log = "2"` from `src-tauri/Cargo.toml`.

---

### Sidecar Rebuild

#### Step 4: Install PyInstaller
**Why:** PyInstaller is not currently installed (was in a temporary venv that's gone).

**Action:**
```bash
cd quran_backend
pip install pyinstaller
```

#### Step 5: Rebuild the Sidecar Exe
**Why:** The existing sidecar exe was built Feb 18. Backend code has changed since then (scripts moved, possible path changes). We need a fresh build to ensure everything is up to date.

**Action:**
```bash
cd quran_backend
pyinstaller QuranTrackBackend.spec
```

**Expected output:** `dist/QuranTrackBackend.exe` (~31 MB)

**Verify the exe works standalone:**
```bash
cd dist
./QuranTrackBackend.exe
# In another terminal:
curl http://localhost:8000/docs
# Should return HTTP 200 (Swagger UI)
# Then kill the process (Ctrl+C or taskkill)
```

#### Step 6: Copy Sidecar to src-tauri/
**Why:** Tauri's `externalBin` looks for the exe at `src-tauri/quran-backend-{target-triple}.exe`.

**Action:**
```bash
cp quran_backend/dist/QuranTrackBackend.exe \
   quran_frontend/src-tauri/quran-backend-x86_64-pc-windows-msvc.exe
```

---

### Production Build

#### Step 7: Verify Frontend Builds Clean
**Why:** `tauri build` runs `npm run build` (Vite) first. If the frontend has TypeScript errors, the whole build fails.

**Action:**
```bash
cd quran_frontend
npm run build
```

**Expected:** Clean build, output in `dist/` (~92 MB due to QPC fonts).

#### Step 8: Run `tauri build` (THE BIG ONE)
**Why:** This compiles the Rust code in release mode, bundles the frontend + sidecar, and produces the NSIS installer.

**Action:**
```bash
cd quran_frontend
npm run tauri:build
```

**What happens internally:**
1. Vite builds the frontend → `dist/`
2. Cargo compiles `src-tauri/` in release mode → `target/release/quran-track.exe`
3. Tauri bundles everything together:
   - `quran-track.exe` (Tauri shell, ~5-10 MB)
   - `quran-backend-x86_64-pc-windows-msvc.exe` (sidecar, ~31 MB)
   - Frontend `dist/` (HTML/JS/CSS + 604 QPC fonts, ~92 MB)
   - Icons
4. NSIS creates the installer

**Expected output:**
```
src-tauri/target/release/bundle/nsis/QuranTrack_0.1.0_x64-setup.exe
```

**Estimated time:** 3-8 minutes (first release build compiles all Rust crates from scratch).

**Estimated installer size:** ~120-180 MB (compressed).

---

### Testing

#### Step 9: Test the Installer Locally (Quick Sanity Check)
**Why:** Before going to the VM, do a quick local sanity check.

**Action:**
1. Run `QuranTrack_0.1.0_x64-setup.exe`
2. Go through the NSIS install wizard
3. Launch QuranTrack from Start Menu / Desktop shortcut
4. Verify:
   - App window opens
   - Login page loads
   - Can create an account (email confirmation is now off)
   - Quran pages render with QPC fonts
   - Sidecar starts (check `localhost:8000/docs` in browser)
5. Close the app
6. Verify sidecar process is killed (check Task Manager)
7. Uninstall via Windows Settings → Apps

#### Step 10: Test on Clean VM
**Why:** The real test — does it work on a machine without Python, Rust, Node, or any dev tools?

**Action:**
1. Copy the installer to the VMware VM (drag-and-drop or shared folder)
2. Run the installer
3. Launch QuranTrack
4. Test the same checklist as Step 9
5. Check for SmartScreen warnings (expected — no code signing)
6. Verify the app auto-starts the sidecar and connects to Supabase

---

### Potential Issues & Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| Defender blocks exe | `PermissionDenied` during build | Step 1 exclusion |
| Port 8000 in use | Sidecar fails to start | Kill orphan process (Step 2) |
| Missing Python imports | Sidecar crashes on startup | Add to `hiddenimports` in spec, rebuild |
| CSP blocks requests | Network errors in console | Update `connect-src` in `tauri.conf.json` |
| QPC fonts 404 | Blank Quran pages | Check `dist/fonts/qpc/` exists after build |
| WebView2 missing on VM | App won't launch | Install WebView2 Runtime (pre-installed on Win 11) |
| Sidecar not killed on close | Orphan process | parent-watcher should handle this |
| `.env` not found by sidecar | Supabase errors | It's bundled in the exe via PyInstaller |
| SmartScreen warning | "Windows protected your PC" | Click "More info" → "Run anyway" (expected without code signing) |

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `docs/Logs/2026-02-22-002-tauri-installer-plan.md` | Created | This session log / plan |
| `quran_frontend/src-tauri/Cargo.toml` | Modified | Removed unused `tauri-plugin-log` and `log` dependencies |
| `quran_frontend/src-tauri/Cargo.lock` | Modified | Lockfile updated after dependency removal |
| `quran_frontend/src/lib/supabase-api.ts` | Modified | Fixed TS2345 type error in `updateAssignment()` |
| `quran_backend/dist/QuranTrackBackend.exe` | Rebuilt | Fresh sidecar exe (31 MB) |
| `quran_frontend/src-tauri/quran-backend-x86_64-pc-windows-msvc.exe` | Updated | Copied fresh sidecar (gitignored) |

## Build Results

| Artifact | Size | Location |
|----------|------|----------|
| NSIS installer (.exe) | 85 MB | `src-tauri/target/release/bundle/nsis/QuranTrack_0.1.0_x64-setup.exe` |
| MSI installer (.msi) | 86 MB | `src-tauri/target/release/bundle/msi/QuranTrack_0.1.0_x64_en-US.msi` |
| Release binary | ~5 MB | `src-tauri/target/release/quran-track.exe` |

## Execution Log

- [x] Step 1: Added Windows Defender exclusion (user ran PowerShell as admin)
- [x] Step 2: Port 8000 was already free
- [x] Step 3: Removed dead `tauri-plugin-log` + `log` from Cargo.toml
- [x] Step 4: Installed PyInstaller 6.19.0 in venv
- [x] Step 5: Rebuilt sidecar exe (31 MB)
- [x] Step 6: Copied sidecar to src-tauri/
- [x] Step 7: Frontend build — fixed TS2345 error in supabase-api.ts, then clean build
- [x] Step 8: `tauri build` — failed twice (OOM from VMware install), succeeded on 3rd try with 2 jobs (2m 40s)
- [x] Step 9: Tested locally — works
- [x] Step 10: Tested on VMware VM — app launches, Quran renders, login works

## Issues Found During VM Testing

1. **Installer icon** — uses default Tauri icon, needs QuranTrack logo
2. **Navbar** — looks cramped/unpolished in the desktop window context

## Next Steps

- [ ] Fix installer icon to use QuranTrack logo
- [ ] Polish navbar for desktop context
- [ ] Add Tauri auto-updater plugin
- [ ] Code signing (later, for wider distribution)

## Notes

- The sidecar bundles `.env` (Supabase keys) inside the exe via PyInstaller. This is fine for family distribution but should NOT be done for public release — keys should be fetched at runtime.
- The installer will be unsigned, triggering SmartScreen. For family testers, they just click "More info" → "Run anyway". Code signing ($200-400/year certificate) can come later.
- First `tauri build` in release mode was slow (~2m 40s) because it compiles all Rust crates. Subsequent builds are incremental.
- The `bundle.targets` is set to `"all"` which builds NSIS (.exe) + MSI. We only need NSIS for now but building both doesn't hurt.
- Previous Tauri session logs: `2026-02-17-002` through `2026-02-17-005` (Phases 1-4).
- Supabase email confirmation was disabled during this session (was blocking signups with broken localhost:5173 redirect).
- OOM during build was caused by VMware running a Windows install simultaneously — resolved after VM install completed.
