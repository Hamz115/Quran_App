# Session Log: CI Workflow Sidecar Debug

**Date:** 2026-02-28
**Session:** 002
**Continues:** `2026-02-28-001-tauri-internals-fix-ci-workflow-v1.3.1.md`

## Objective

Debug and fix the GitHub Actions CI release workflow which fails with `resource path 'quran-backend-x86_64-pc-windows-msvc.exe' doesn't exist` during the Tauri build step, despite the sidecar binary being copied to the correct location.

## Summary

Found the root cause of the CI failure after 7+ failed runs. The `externalBin` config in `tauri.conf.json` is `["quran-backend"]` (no `binaries/` prefix), so Tauri's `build.rs` looks for the sidecar at `src-tauri/quran-backend-x86_64-pc-windows-msvc.exe` — directly in the `src-tauri/` directory. The CI workflow was copying it to `src-tauri/binaries/` (wrong path). Fixed the copy destination and verify step to use the correct path.

## Work Completed

### 1. Root Cause Analysis
- Researched Tauri v2 `externalBin` path resolution via official docs
- Key finding: `externalBin` paths are relative to `tauri.conf.json` (which is in `src-tauri/`)
- Config has `"quran-backend"` → Tauri looks at `src-tauri/quran-backend-{triple}.exe`
- Config would need `"binaries/quran-backend"` to look in `src-tauri/binaries/`
- The CI was copying to `src-tauri/binaries/` — the WRONG location
- Locally it worked because the binary existed at the correct path (`src-tauri/quran-backend-x86_64-pc-windows-msvc.exe`)

### 2. Workflow Fix — Sidecar Path
- Changed copy destination from `src-tauri/binaries/quran-backend-x86_64-pc-windows-msvc.exe` to `src-tauri/quran-backend-x86_64-pc-windows-msvc.exe`
- Updated verify step to check the correct path
- Cleaned up debug output (removed unnecessary directory creation logic)

### 3. Workflow Fix — Missing Frontend Env Vars
- v1.3.1 CI build produced a blank app (dark background, no React content)
- Root cause: `supabase.ts` throws `Missing Supabase environment variables` if `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are not set at Vite build time
- The frontend `.env.local` is gitignored, so CI had no Supabase config during `npm run build`
- Fix: Added a "Write frontend .env" step to the workflow that writes the Supabase URL and anon key before the build
- These are public values (anon key is RLS-secured) — same values already committed in `quran_mobile/.env`

## Issues Encountered

- **Wrong sidecar path in CI (ROOT CAUSE #1)**: The `externalBin: ["quran-backend"]` config means Tauri looks for the binary at `src-tauri/quran-backend-{triple}.exe`, NOT in `src-tauri/binaries/`. All 7+ CI failures were caused by copying the binary to the wrong directory.
- **Misleading local setup**: The binary existed at both `src-tauri/quran-backend-*.exe` and `src-tauri/binaries/quran-backend-*.exe` locally, which masked the path issue.
- **Missing Supabase env vars in CI (ROOT CAUSE #2)**: The frontend `.env.local` is gitignored, so CI builds had no `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY`. This caused `supabase.ts` to throw on startup, resulting in a blank app.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/release.yml` | Modified | Fixed sidecar copy destination to `src-tauri/` (not `src-tauri/binaries/`) |
| `docs/Logs/2026-02-28-002-ci-workflow-sidecar-debug-v1.3.1.md` | Created | This session log |

## Next Steps

- [x] Commit and push the fix
- [x] Delete and recreate v1.3.1 tag
- [x] Verify CI run passes — **v1.3.1 release created successfully!**
- [ ] Test auto-update on VM (install v1.3.0, verify it detects v1.3.1)

## Notes

- Tauri v2 `externalBin` path resolution: paths are relative to `tauri.conf.json` (in `src-tauri/`)
- `"quran-backend"` → looks at `src-tauri/quran-backend-{triple}.exe`
- `"binaries/quran-backend"` → would look at `src-tauri/binaries/quran-backend-{triple}.exe`
- Signing key password: `Hamza_quran2026`
- References: [Tauri v2 Sidecar Docs](https://v2.tauri.app/develop/sidecar/)
