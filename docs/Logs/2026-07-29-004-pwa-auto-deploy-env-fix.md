# Session Log: PWA Automatic Deployment Environment Fix

**Date:** 2026-07-29
**Session:** 004
**Author:** Kyle

## Objective

Repair the QuranTrack production outage introduced by the first GitHub Actions PWA deployment and make future automatic deployments fail safely when required Supabase build configuration is absent.

## Root Cause

The new `.github/workflows/deploy-pwa.yml` ran `npm run build` on GitHub without the local ignored `quran_frontend/.env.local`. Vite therefore compiled an application bundle with empty `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values. The build itself succeeded, uploaded the invalid bundle to S3, and CloudFront served it. At runtime, `src/lib/supabase.ts` correctly stopped startup with `Missing Supabase environment variables`.

The `inject.bundle.js` and `chrome-extension://invalid/` console messages were browser-extension noise and were not the QuranTrack failure.

## Changes

- Added repository Actions secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the existing approved local production configuration.
- Mapped both secrets into the deployment job environment so Vite receives them during compilation.
- Added a pre-build validation step that exits before build/deployment when either required value is empty.
- Kept `.env.local` ignored and did not commit configuration values to Git.

## Validation

- Local production TypeScript/Vite build: pass.
- `git diff --check`: pass apart from line-ending notices.
- Corrective deployment commit: `88896788240ceac112d8aabd19c4ccadd9ef95cd`.
- GitHub Actions run `30467557753`: success; all environment validation, build, AWS account guard, upload, and CloudFront invalidation steps passed.
- Live production Login renders successfully with the approved photograph, branding, form controls, and Supabase initialization; the startup exception is gone.

## BrowserOps Evidence

- Broken-state task: `20260729-184552-qurantrack-missing-supabase-env`
  - `002-broken-production-state.png`
- Fixed-state task: `20260729-184858-qurantrack-missing-supabase-env-fixed`
  - `002-fixed-production-login.png`

## Files Changed

- `.github/workflows/deploy-pwa.yml`
- `docs/Logs/2026-07-29-004-pwa-auto-deploy-env-fix.md`
