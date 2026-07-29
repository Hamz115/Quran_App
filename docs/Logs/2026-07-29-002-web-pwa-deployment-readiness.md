# Session Log: Web PWA Deployment Readiness

**Date:** 2026-07-29
**Session:** 002
**Duration:** Completed
**Author:** Kyle

## Objective

Prepare, deploy, secure, and validate QuranTrack as the canonical hosted web/PWA application at `qurantrack.hamzas.world`, without production reliance on Mini PC localhost services.

## Summary

QuranTrack is deployed through a private S3 bucket and CloudFront at `https://qurantrack.hamzas.world`. Production Quran reference data is static and versioned, PWA installation is valid, authenticated and anonymous routing were tested, all public Supabase tables were verified under RLS, anonymous data access returned zero rows, and Supabase function privileges were hardened. Only the approved AWS CLI profile `hamza-admin` in account `637282979276` was used.

## Work Completed

### Hosted Web/PWA

- Exported 604 Quran page JSON files and 604 QPC page fonts.
- Changed hosted Quran loading to static `/quran-data/v1` assets.
- Disabled localhost sidecar probing in normal browser/PWA mode.
- Kept localhost/Tauri operations behind explicit local-sidecar checks.
- Changed hosted PDF reports to client-side generation.
- Added web manifest, service worker, 192px/512px icons, and install UI.
- Added repeatable export and AWS deployment scripts.

### AWS Deployment

- Created private bucket `qurantrack-app-637282979276` with all public access blocked.
- Configured CloudFront distribution `ELF0U79EJW574` with Origin Access Control.
- Issued an Amazon ACM certificate for `qurantrack.hamzas.world`.
- Added Route 53 DNS for the application hostname.
- Verified CloudFront status `Deployed` and HTTPS certificate validity through 2027-02-11.

### Supabase Security

- Verified RLS enabled on `profiles`, `listener_reciters`, `classes`, `class_reciters`, `assignments`, `mistakes`, and `mistake_occurrences`.
- Verified anonymous REST reads return zero rows for every application table.
- Verified anonymous exact-email lookup returns zero rows.
- Pinned helper function search paths.
- Removed public/anonymous execution from sensitive SECURITY DEFINER functions.
- Removed authenticated execution from `handle_new_user`; it remains available only to `postgres` and `service_role` for trigger operation.
- Preserved authenticated-only execution for `is_session_listener` and `lookup_profile_by_email`, because these are intentionally required by RLS and contact lookup.
- Reduced Supabase Security Advisor results from 9 warnings to 3, with 0 errors.
- Remaining warnings are two intentional authenticated helper-function warnings and leaked-password protection, which Supabase marks as Pro-plan-only.

## Issues Encountered

- The repository's ESLint command initially resolved the system ESLint because the synced `node_modules/.bin/eslint` wrapper lacked executable permission. After restoring permission, ESLint 9 ran and exposed substantial pre-existing lint debt (182 errors, 1 warning), mainly legacy `any` types and generated Tauri target files. TypeScript compilation and the production build still pass.
- The Python environment does not include pytest. The test suite is standard `unittest`, so it was run directly without installing packages.
- One regression assertion referenced an old variable name (`selectionKey`). The implementation correctly uses `selectedStudentsKey`; the stale assertion was updated and all 22 tests pass.
- Offline navigation loads the cached PWA shell, but an authenticated refresh while fully offline redirects to login. QuranTrack should currently be treated as online-required for authenticated data use; offline shell availability is not full offline application support.
- BrowserOps' first Supabase SQL-editor fill retained stale editor text. Execution was cancelled before any query ran, a new blank snippet was created, and only the reviewed security-hardening query was executed.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/public/manifest.webmanifest` | Created | PWA metadata and icons |
| `quran_frontend/public/sw.js` | Created | Shell and on-demand immutable-asset caching |
| `quran_frontend/src/components/PwaInstallButton.tsx` | Created | Browser/iOS installation guidance |
| `quran_frontend/src/lib/quran-api.ts` | Updated | Static hosted Quran data |
| `quran_frontend/src/lib/local-api.ts` | Updated | Local sidecar opt-in only |
| `quran_frontend/src/api.ts` | Updated | Web-safe API behavior |
| `quran_frontend/src/components/teacher-classes/ExportModal.tsx` | Updated | Client-side hosted PDF export |
| `scripts/export_quran_static_assets.py` | Created | Deterministic 604-page export |
| `scripts/deploy_web_pwa_aws.sh` | Created | Repeatable `hamza-admin` deployment |
| `docs/supabase_web_pwa_security_hardening.sql` | Created | Reproducible live security changes |
| `quran_backend/tests/test_listener_reciter_schema_sql.py` | Updated | Correct current variable name in regression assertion |

## Tests Run

| Test | Result |
|------|--------|
| Production TypeScript/Vite build | Pass |
| Regression suite | Pass — 22/22 |
| Static Quran JSON validation | Pass — 604/604 valid |
| QPC font asset count | Pass — 604 |
| Chrome PWA installability | Pass — 0 manifest errors, 0 installability errors |
| Service worker registration | Pass — active and controlling production page |
| Anonymous deep-link auth guard | Pass — redirected to `/login` |
| Supabase RLS policy inspection | Pass — enabled on all application tables |
| Anonymous table access | Pass — 0 rows exposed across all 7 tables |
| Anonymous profile lookup | Pass — 0 rows exposed |
| Sessions, Contacts, Mistakes, Settings routes | Pass |
| Existing production session deep link | Pass |
| Quran pages 1, 587, 588, and 604 | Pass |
| Quran line containment on pages 588 and 604 | Pass — 0 clipped lines |
| Mobile 390x844 session layout | Pass — no horizontal overflow, 0 clipped Quran lines after layout settled |
| Final-page boundary | Pass — page 604 loaded and Next disabled |
| Production localhost network dependency | Pass — no localhost/127.0.0.1 resources requested |
| HTTPS certificate | Pass |
| Supabase Security Advisor | Pass with limitations — 0 errors, 3 documented warnings |
| `git diff --check` | Pass (line-ending warnings only) |
| ESLint | Existing debt — 182 errors, 1 warning; not a build blocker |
| Offline PWA shell | Partial — shell loads, authenticated app requires connectivity |

## BrowserOps Evidence

- Production application: `20260729-150115-qurantrack-production-final-validation`
- Anonymous auth guard: `20260729-150329-qurantrack-anonymous-auth-guard`
- Supabase RLS/security audit: `20260729-150211-qurantrack-supabase-security-audit`

## Remaining Non-Blocking Work

- Full offline authenticated use is not implemented; current mobile use requires connectivity.
- Supabase leaked-password protection requires the Pro plan.
- Existing ESLint debt and bundle code-splitting can be handled separately.
- Changes remain uncommitted until Hamza requests a commit.

## Notes

- Every AWS command used explicit profile `hamza-admin`.
- The unrelated `ticketoptix` profile/account was not used.
- No production session/contact/mistake data was changed during BrowserOps validation.
