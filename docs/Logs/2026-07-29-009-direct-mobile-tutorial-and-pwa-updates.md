# Session Log: Direct Mobile Tutorial and PWA Update Behavior

**Date:** 2026-07-29
**Session:** 009
**Author:** Kyle

## Summary

Corrected the sidebar Tutorial control so it starts the guided tour immediately instead of navigating to Settings, and hardened the tour popover for phone-sized screens.

## PWA Update Behavior

QuranTrack's installed PWA does not need to be uninstalled after normal frontend deployments.

The service worker uses network-first navigation. On a normal launch with internet access, the installed PWA fetches the current `index.html`, which points to the latest content-hashed CSS and JavaScript assets deployed through CloudFront. Closing the installed app completely and opening it again is normally enough. A page refresh can also load the current release. Reinstallation is only a last-resort recovery step if a device/browser installation is genuinely corrupted or remains stale after a full close, reopen, and refresh.

## Sidebar Tutorial Bug

### Cause

The sidebar entry was implemented as a normal link to:

`/settings?section=tutorial`

The Settings page did not interpret that query as an instruction to start the tour. Therefore, the link only opened Settings and required a second click on **Show Tutorial**.

### Fix

Updated `quran_frontend/src/components/Layout.tsx`:

- Replaced the Settings link with a real Tutorial action button.
- Connected it directly to `TourContext.startTour()`.
- Closes the mobile drawer before launching.
- Works from Dashboard, Sessions, Reader, Contacts, Mistakes, or Settings.
- `startTour()` routes to the Overview and immediately displays step 1.

## Phone Tour Responsiveness

Updated `quran_frontend/src/contexts/TourContext.tsx` for screens up to 640px:

- Popover width is constrained to `100vw - 20px`.
- Popover height is constrained to `100dvh - 20px`.
- Vertical overflow becomes scrollable if a step has unusually long content.
- Reduced internal padding, progress-header spacing, title size, and description size.
- Preserved 40px minimum navigation-button height for touch use.

## BrowserOps Validation

Task:

`20260729-211203-qurantrack-mobile-responsive-local-e2e`

Evidence:

- `019-mobile-drawer-direct-tutorial-control.png` — Tutorial shown as a direct sidebar button.
- `021-mobile-tutorial-started-directly.png` — clicking Tutorial from `/sessions` closes the drawer, routes to `/`, and displays step 1 immediately at 390×844.

The phone screenshot confirms the entire first-step panel, progress header, Next button, and Exit guide control fit inside the viewport without horizontal overflow.

## Validation

- Frontend production build: passed.
- Targeted ESLint for `Layout.tsx` and `TourContext.tsx`: passed.
- Regression suite: **24/24 passed**.
- `git diff --check`: passed (line-ending warnings only).

## Files Changed

- `quran_frontend/src/components/Layout.tsx`
- `quran_frontend/src/contexts/TourContext.tsx`
- `quran_backend/tests/test_listener_reciter_schema_sql.py`
- `docs/Logs/2026-07-29-009-direct-mobile-tutorial-and-pwa-updates.md`
