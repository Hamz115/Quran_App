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
- GitHub Actions deployment and live BrowserOps validation are recorded after the corrective push.

## BrowserOps Evidence

- Task: `20260729-184552-qurantrack-missing-supabase-env`
- Broken production state: `002-broken-production-state.png`

## Files Changed

- `.github/workflows/deploy-pwa.yml`
- `docs/Logs/2026-07-29-004-pwa-auto-deploy-env-fix.md`
