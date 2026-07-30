# Session Log: QuranTrack Information Site PWA-Only Access

**Date:** 2026-07-30  
**Session:** 013  
**Author:** Kyle

## Request

Update the public QuranTrack information website to promote the hosted QuranTrack web/PWA experience and temporarily remove the desktop and separate mobile-build download options and wording.

## Changes

- Replaced the navigation **Download** link with **Open App**.
- Changed the hero call to action from a platform download to **Open QuranTrack**.
- Linked both primary calls to `https://qurantrack.hamzas.world`.
- Replaced the two platform download cards with one **QuranTrack Web App** card.
- Removed platform installer links, version labels, and installer-warning guidance.
- Added browser/PWA guidance for **Add to Home Screen** or **Install App**.
- Confirmed the public website source contains no platform-specific desktop/mobile-build wording.

## Validation

- HTML parser validation: passed.
- `git diff --check`: passed; only the repository line-ending notice was emitted.
- Existing production site was inspected before the change through BrowserOps task `20260730-141020-qurantrack-info-site-pwa-conversion`.

## File

- `website/index.html`
