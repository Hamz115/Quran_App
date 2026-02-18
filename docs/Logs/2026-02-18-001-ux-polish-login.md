# Session Log: UX Polish — Login Error Messages, Arabic Font, CSP Fix

**Date:** 2026-02-18
**Session:** 001
**Author:** Claude (with Hamza)

## Objective

Improve the login/signup page UX: replace technical Supabase error messages with user-friendly text, fix the Arabic ayah font rendering (was using system fallback instead of Amiri), and fix the Tauri CSP blocking Google Fonts.

## Summary

Three fixes applied to improve the login/signup experience:
1. Replaced raw Supabase error "Invalid login credentials" with "Incorrect email or password. Please try again."
2. Wired up the `font-arabic` Tailwind class to use Amiri (matching Flutter app), with Scheherazade New and Amiri Quran as fallbacks
3. Fixed Tauri CSP to allow Google Fonts — `font-src`, `style-src`, and `connect-src` were missing `fonts.googleapis.com` and `fonts.gstatic.com`, causing the Arabic font to silently fall back to the system default (blocky)

## Work Completed

### Login Error Messages
- **Login.tsx**: Replaced `err.message` passthrough with user-friendly messages:
  - "Invalid login credentials" / "invalid_credentials" → "Incorrect email or password. Please try again."
  - Timeout errors → "Login is taking too long. Please check your internet and try again."
  - All other errors → "Something went wrong. Please try again."

### Arabic Font (Amiri)
- **tailwind.config.js**: Defined `font-arabic` font family — `Amiri, "Scheherazade New", "Amiri Quran", serif`
- Fonts were already loaded in `index.html` via Google Fonts CDN but never connected to a Tailwind class
- Matches Flutter app which uses `GoogleFonts.amiri(fontSize: 20, height: 1.8)`
- Updated `leading-relaxed` → `leading-loose` on both Login.tsx and Signup.tsx for better harakat spacing

### Tauri CSP Fix
- **tauri.conf.json**: Added Google Fonts domains to CSP:
  - `font-src`: added `https://fonts.gstatic.com`
  - `style-src`: added `https://fonts.googleapis.com`
  - `connect-src`: added `https://fonts.googleapis.com https://fonts.gstatic.com`
- Without this, the Tauri WebView blocked all Google Font requests and silently fell back to the system Arabic font

## Issues Encountered

1. **`font-arabic` class was undefined**: The class was used in JSX but never defined in Tailwind config. Tailwind silently ignored it, so the Arabic text used the browser's default Arabic font (blocky system font).

2. **CSP blocked Google Fonts in Tauri**: The `font-src` directive only allowed `'self'` and `asset:`. Google Fonts loads font files from `fonts.gstatic.com` and CSS from `fonts.googleapis.com` — both were blocked. This was the root cause of the "blocky font" issue in the Tauri desktop app.

3. **Amiri Quran vs Amiri**: Initially set `Amiri Quran` as primary, but Flutter uses plain `Amiri`. Swapped priority to match Flutter exactly.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/src/pages/Login.tsx` | Modified | User-friendly error messages, `leading-loose` for Arabic |
| `quran_frontend/src/pages/Signup.tsx` | Modified | `leading-loose` for Arabic |
| `quran_frontend/tailwind.config.js` | Modified | Added `font-arabic` family (Amiri + fallbacks) |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | CSP: allow Google Fonts domains |

## Tests Run

| Test | Result |
|------|--------|
| Arabic ayah renders in Amiri font (Tauri) | Pass (user confirmed) |
| Wrong password shows friendly error | Pass |
| `tauri dev` with CSP change | Pass |
