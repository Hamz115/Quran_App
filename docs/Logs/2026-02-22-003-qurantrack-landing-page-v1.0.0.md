# Session Log: QuranTrack Landing/Download Page

**Date:** 2026-02-22
**Session:** 003

## Objective

Create a QuranTrack branded landing/download page to be hosted at `hamzas.world/apps/quran-track/`. This is the public-facing page where users discover the app, learn about its features, and download the installer.

## Summary

Building a landing page in the `website/` folder within the Quran_App repo. The page matches QuranTrack's Cyan→Teal color palette and is written in simple, non-technical language for teachers, students, and parents. Will also set up AWS S3 bucket, CloudFront origin, cache behavior, and GitHub Actions CI/CD pipeline.

## Work Completed

### 1. Landing Page Design & Build
- Created `website/` folder in project root
- Built `website/index.html` — QuranTrack branded landing page
- Color scheme matches the app (Cyan #06B6D4 → Teal #14B8A6 gradient, Slate backgrounds)
- Sections: Hero, Features, How It Works, Download, Footer
- Simple non-technical language targeting teachers, students, parents
- Responsive layout (mobile + desktop)
- Dark theme (matching app default)

### 2. AWS Infrastructure (Pending)
- [ ] Create S3 bucket: `qurantrack.hamzas.world`
- [ ] Add as origin to CloudFront distribution E3PQ28Q3U2RE8R
- [ ] Add cache behavior: `/apps/quran-track/*`

### 3. CI/CD Pipeline (Pending)
- [ ] Create `.github/workflows/deploy-website.yml`
- [ ] Path filter: only triggers on `website/**` changes
- [ ] Syncs `website/` to S3

### 4. Apps Page Update (Pending)
- [ ] Add QuranTrack card to `apps.html` in cv.github.io repo

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `website/index.html` | Created | QuranTrack landing/download page |
| `docs/Logs/2026-02-22-003-qurantrack-landing-page-v1.0.0.md` | Created | This session log |

## Next Steps

- [ ] Set up AWS S3 + CloudFront routing
- [ ] Set up GitHub Actions CI/CD
- [ ] Add QuranTrack card to hamzas.world/apps.html
- [ ] Host installer on GitHub Releases
- [ ] Record demo video (future)

## Notes

- Following the same AWS pattern as Family Tree and TurboDictate deployments
- CloudFront distribution: E3PQ28Q3U2RE8R
- AWS profile: hamza-admin (via WSL)
- Installer will be linked from GitHub Releases, not hosted on S3 (85 MB is too large for S3 static hosting costs)
