# Session Log: QuranTrack Landing/Download Page + AWS Deployment

**Date:** 2026-02-22 / 2026-02-23
**Session:** 003

## Objective

Create a QuranTrack branded landing/download page to be hosted at `hamzas.world/apps/quran-track/`. This is the public-facing page where users discover the app, learn about its features, and download the installer. Also set up the full AWS infrastructure and CI/CD pipeline.

## Summary

Built a fully light-themed QuranTrack landing page in `website/index.html` matching the app's light mode navbar gradient (sky-blue/cyan). Set up AWS S3 bucket, CloudFront origin + cache behavior, uploaded files, and created a GitHub Actions workflow that auto-deploys on pushes to `website/**`. Added a QuranTrack app card to `hamzas.world/apps.html` in the CV repo. Updated PRODUCTION_READINESS.md to reflect v1.0.0 completion.

## Work Completed

### 1. Landing Page Design & Build
- Created `website/` folder in project root
- Built `website/index.html` — QuranTrack branded landing page
- Initially built with dark theme, then switched to fully light theme per user feedback
- Final color scheme: app's light mode navbar gradient (`linear-gradient(135deg, rgb(186,230,253), rgb(165,243,252), rgb(207,250,254))`)
- Alternating sections: white backgrounds + tinted sky-blue/cyan gradient sections
- Sections: Hero, Who Is It For, Features, How It Works, Quran Showcase, Download, Footer
- Simple non-technical language targeting teachers, students, parents
- Responsive layout (mobile + tablet + desktop)
- Fixed incorrect "join code" flow — students don't enter join codes, teachers add them directly
- Removed "Back to Portfolio" links, footer links to `hamzas.world` via "Hamza Feroze"
- Copied `logo.png` to `website/` for the navbar and favicon

### 2. AWS Infrastructure (DONE)
- [x] Created S3 bucket: `qurantrack.hamzas.world` (us-east-1)
- [x] Enabled static website hosting (index: index.html, error: index.html)
- [x] Disabled public access block
- [x] Added public read bucket policy (`s3:GetObject` for `*`)
- [x] Added as 4th origin to CloudFront distribution E3PQ28Q3U2RE8R
  - Origin ID: `qurantrack.hamzas.world.s3-website`
  - Domain: `qurantrack.hamzas.world.s3-website-us-east-1.amazonaws.com`
  - Protocol: HTTP-only
- [x] Added cache behavior: `/apps/quran-track/*` → qurantrack origin
  - Same cache policy as other origins: `658327ea-f89d-4fab-a63d-7e88639e58f6`
- [x] Synced website files to S3
- [x] Invalidated CloudFront cache
- [x] Verified page returns HTTP 200 at `hamzas.world/apps/quran-track/`

### 3. CI/CD Pipeline (DONE)
- [x] Created `.github/workflows/deploy-website.yml`
- [x] Path filter: only triggers on `website/**` changes
- [x] Steps: checkout → AWS creds → S3 sync → CloudFront invalidation
- [x] Added 3 GitHub secrets to Quran_App repo: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `CLOUDFRONT_DISTRIBUTION_ID`

### 4. Apps Page Update (DONE)
- [x] Added QuranTrack app card to `apps.html` in `cv.github.io` repo
- [x] Cyan/teal gradient header matching QuranTrack branding
- [x] 6 feature highlights, platform badges (Windows + Mobile Coming Soon)
- [x] "Learn More & Download" button → `/apps/quran-track/index.html`
- [x] Committed and pushed — GitHub Actions will deploy to S3

### 5. PRODUCTION_READINESS.md Update
- Updated status to "v1.0.0 Released"
- Section 5 (Desktop Distribution) marked COMPLETED
- Added installer, navbar polish, landing page to completed items table
- Updated priority matrix, sprint 1 roadmap, and summary

## Issues Encountered

- **Dark theme feedback:** User didn't like the fully dark landing page. Iterated through dark → mixed dark/light → fully light. Final version uses the app's light mode navbar gradient throughout.
- **Join code error:** Initially described a "join code" flow that doesn't exist in the app. Teachers add students directly; students see classes automatically. Fixed all references.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `website/index.html` | Created | QuranTrack landing/download page (light theme) |
| `website/logo.png` | Created | Copy of QuranTrack logo for the website |
| `.github/workflows/deploy-website.yml` | Created | CI/CD pipeline for website deployment |
| `docs/PRODUCTION_READINESS.md` | Modified | Updated to reflect v1.0.0 completion |
| `docs/Logs/2026-02-22-003-qurantrack-landing-page-v1.0.0.md` | Created | This session log |
| `apps.html` (cv.github.io repo) | Modified | Added QuranTrack app card |

## Architecture

```
hamzas.world
├── index.html              → CV homepage
├── apps.html               → Apps showcase (TurboDictate + QuranTrack)
├── /apps/quran-track/*     → QuranTrack landing page (S3: qurantrack.hamzas.world)
├── /apps/turbo-dictate/*   → TurboDictate site (S3: turbo-dictate.hamzas.world)
├── /family-tree/*          → Family trees (S3: family.hamzas.world)
└── /projects, /education   → CV sub-pages

GitHub (Hamz115/Quran_App)
  → Push to main (website/** changes only)
    → GitHub Actions
      → aws s3 sync ./website/ → s3://qurantrack.hamzas.world/apps/quran-track/
      → aws cloudfront create-invalidation → /apps/quran-track/*
```

## Next Steps

- [ ] Host installer on GitHub Releases (currently download link points to a release that needs to be created)
- [ ] Record demo video (future — `hamzas.world/apps/quran-track/demo-video`)
- [ ] Add QuranTrack card to CV `apps.html` (DONE)

## Notes

- CloudFront distribution: E3PQ28Q3U2RE8R (now has 4 origins)
- S3 bucket for QuranTrack: `qurantrack.hamzas.world`
- AWS profile: `hamza-admin` (via WSL)
- The download button links to GitHub Releases — need to create the v1.0.0 release and upload the installer exe
- Following the exact same deployment pattern as Family Tree and TurboDictate
- CloudFront ETag after update: E3OYV3L51D6CPW
