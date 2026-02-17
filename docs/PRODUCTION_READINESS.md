# QuranTrack - Production Readiness Analysis

**Generated:** 3 February 2026
**Last Updated:** 18 February 2026
**Status:** In Development — Desktop App (Tauri) nearing MVP

---

## What's Been Done Well

### Core Functionality (Strong)
- **QPC Font Rendering** - Pixel-perfect Madani Mushaf display on web AND Flutter mobile (Phase 13.4)
- **Character-Level Mistake Tracking** - Whole word, letter, harakat precision
- **Smart Portion Suggestions** - Auto-continues Hifz/Sabqi/Manzil based on history
- **Role-Based Access Control** - Teacher/Student with different permissions
- **Supabase Authentication** - Secure auth with JWT, RLS policies on all 7 tables
- **Local-First Architecture** - app.db primary, Supabase sync in background
- **Triple Platform Support** - React web + Flutter mobile + Tauri desktop (Phase 17)
- **Theme Support** - Light/dark mode in both web and mobile
- **Database Seeding** - Realistic test data generator (~57 weeks of data)
- **Student Reports** - Tab-based dashboard with filters, charts, streaks, per-class mistake breakdowns (Phase 16/16.1)
- **PDF/CSV/Word Export** - Backend Playwright PDF (vector quality, selectable text) + CSV + Word (Phase 16.2)
- **Classes Revamp** - Inline report dashboard replaces standalone report page (Phase 16.2)
- **Responsive Web Layout** - 3-tier responsive design: phone, tablet, desktop (Phase 14)
- **Tauri Desktop App** - Native Windows app wrapping React frontend with PyInstaller FastAPI sidecar (Phase 17)

### Architecture (Solid)
- Clean separation - FastAPI backend, React frontend, Flutter mobile, Tauri desktop shell
- Type safety - TypeScript + Dart + Rust
- State management - Context API (React), Riverpod (Flutter)
- Responsive design (3-tier: phone/tablet/desktop)
- Comprehensive documentation (PROJECT_CHANGELOG, session logs, technical docs)
- Sidecar pattern - Backend bundled as PyInstaller exe, managed by Tauri lifecycle

---

## Remaining Gaps

### 1. **Student Management Improvements** (MEDIUM PRIORITY)
**Status:** Core functionality works, polish needed
**What works:** Teachers can add students by email, remove students, view student list on dashboard
**Impact:** Usable as-is for small halaqahs (5-10 students)

**Missing:**
- Search/filter students (useful when teacher has 15+ students)
- Student join requests (student requests to join, teacher approves)
- Invite via email (see note below)

**Note on Invite System:** For a desktop app, formal email invites are complex — the student would need to download the app first, then sign up, then be connected. The current "teacher adds student by email" flow is simpler and works well for the target audience (teachers who communicate directly with students). A formal invite system is deferred — not needed for MVP.

**Estimate:** 1-2 days for search/filter, invite system deferred

---

### 2. **Flutter Mobile Data Sync** (LOW PRIORITY — desktop is primary)
**Status:** Auth works, some Supabase queries on web build, but native mobile sync incomplete
**Impact:** Mobile app is functional but not fully synced with cloud

**Missing:**
- Sync classes to/from Supabase on native mobile
- Sync mistakes to/from Supabase on native mobile
- Conflict resolution
- Offline queue
- Background sync service

**Note:** With the desktop app (Tauri) now the primary distribution target, Flutter mobile sync drops in priority. The desktop app uses the FastAPI backend directly with Supabase sync built in. Mobile sync can be revisited when mobile distribution is prioritized.

**Estimate:** 5-7 days (when prioritized)

---

### 3. **Security Hardening** (HIGH PRIORITY)
**Status:** Supabase RLS secures all cloud data; CSP configured in Tauri
**Impact:** Needed before exposing to real users

**Done:**
- Supabase RLS policies on all 7 tables
- CSP headers in Tauri (connect-src, font-src, img-src)
- JWT-based auth with Supabase

**Missing:**
- Rate limiting on auth endpoints (prevent brute force)
- Account lockout after N failed login attempts
- Input validation/sanitization on FastAPI endpoints
- HTTPS enforcement (Supabase already uses HTTPS; local sidecar is localhost only)

**Not needed for desktop app:**
- CSRF protection (not applicable — desktop app, no cross-site requests)
- Secret management services (desktop app bundles .env in sidecar, acceptable for v1)

**Estimate:** 1-2 days

---

### 4. **Error Handling & Monitoring** (MEDIUM PRIORITY)
**Status:** Console.log only, no tracking
**Impact:** Can't diagnose issues when users hit problems

**Missing:**
- Error tracking service (Sentry or similar)
- User-friendly error messages (some raw errors still surface)
- Crash reporting for the sidecar (backend.log exists but isn't uploaded)
- Retry mechanisms for Supabase sync failures

**Estimate:** 2-3 days

---

### 5. **Desktop Distribution** (HIGH PRIORITY — Phase 17.5)
**Status:** Tauri Phases 1-4 complete, Phase 5 (installer) pending
**Impact:** Can't distribute the app to users yet

**Done:**
- Tauri v2 shell wrapping React frontend
- PyInstaller sidecar (31MB) with FastAPI backend
- Sidecar lifecycle (auto-start, auto-kill on close)
- App icon generated from logo
- Windows Defender exclusion documented

**Missing:**
- Test `tauri build` → NSIS installer (.exe setup file)
- Test installer on a clean Windows machine
- Verify Supabase sync works from installed app
- Code-signing certificate (removes SmartScreen "Windows protected your PC" warning)
- Auto-update mechanism (Tauri has built-in updater plugin)

**Estimate:** 1-2 days for basic installer, code-signing is ongoing cost (~$200-300/year)

---

### 6. **Onboarding Flow** (MEDIUM PRIORITY)
**Status:** Users dropped into app with no guidance
**Impact:** New users may not understand how to add students or start a class

**Missing:**
- First-launch welcome screen
- Quick tutorial (3-5 steps: add student → start class → mark mistakes → view report)
- Role-specific guidance (teacher vs student)
- Demo mode / sample data option

**Estimate:** 2 days

---

### 7. **Data Backup & Recovery** (LOW PRIORITY)
**Status:** Supabase auto-backups cover cloud data; local app.db has no user-facing backup
**Impact:** Low risk — Supabase is the source of truth, local data can be re-synced

**Missing:**
- User-facing "Export my data" (JSON/CSV)
- Import from backup
- Manual local backup trigger

**Estimate:** 2 days

---

## Completed Items (Previously Listed as Gaps)

These were marked as critical/high priority gaps on 3 Feb but have since been completed:

| Item | Completed | Phase |
|------|-----------|-------|
| **Flutter Quran Reader** — QPC page-based rendering | 8 Feb | Phase 13.4 |
| **Flutter Classroom** — QPC rendering in class sessions | 11 Feb | Phase 13.5 |
| **Student Progress Analytics** — Reports with charts, trends, streaks | 15 Feb | Phase 16/16.1 |
| **PDF Reports** — Backend Playwright vector PDF + CSV + Word | 16 Feb | Phase 16.2 |
| **Multiple Teachers per Student** — `teacher_students` is many-to-many | Since Phase 12 | Already supported |
| **Web Responsive Overhaul** — 3-tier layout (phone/tablet/desktop) | 11 Feb | Phase 14 |
| **Light Mode Overhaul** — Proper contrast and styling | 11 Feb | Phase 15 |
| **Desktop App** — Tauri v2 with PyInstaller sidecar | 17 Feb | Phase 17 |
| **App Icons** — All sizes generated for desktop | 17 Feb | Phase 17 (Phase 4) |

---

## High-Impact Features (Should Add)

### 8. **Notifications & Reminders**
**Why:** Engagement and retention

- Class reminder (push notification or system tray)
- Missed class follow-up
- Progress milestones
- Weekly progress summary (email or in-app)

**Estimate:** 2-3 days

---

### 9. **Parent Portal**
**Why:** Parents want to monitor child progress

- View child's classes/progress (read-only)
- Read teacher notes
- Parent linked to student account

**Estimate:** 4-5 days

---

### 10. **Bulk Operations**
**Why:** Teachers with 20+ students need efficiency

- Bulk class creation (e.g., create 4 weeks of classes at once)
- Class templates (save a class structure, reuse it)
- CSV student import
- Bulk portion assignment

**Estimate:** 3 days

---

### 11. **Voice Recording** (GAME CHANGER)
**Why:** Verify recitation remotely — NO COMPETITOR HAS THIS

- Student records portion at home
- Upload to cloud (Supabase Storage)
- Teacher reviews async
- Mark mistakes on audio timeline
- Voice/text feedback
- Playback speed control

**Estimate:** 5-7 days
**Note:** Premium feature

---

### 12. **Calendar & Scheduling**
**Why:** Organization and visibility

- Class calendar (month/week view)
- Recurring class setup
- Attendance tracking
- Sync to Google Calendar

**Estimate:** 4-5 days

---

## Nice-to-Have Features (Future)

### 13. **Tajweed Rules Display**
- Color coding (ghunnah, qalqalah, idghaam, etc.)
- Tooltips explaining rules
- Toggle on/off

**Estimate:** 3-4 days

---

### 14. **Audio Playback**
- Play ayah recitation (Quran.com API)
- Multiple reciters
- Speed control
- Repeat mode

**Estimate:** 2-3 days

---

### 15. **Multi-Language Support**
- Arabic (RTL)
- Urdu
- French
- Malay/Indonesian

**Estimate:** 4-5 days

---

### 16. **Gamification**
- Badges (completed Juz, streak milestones)
- Levels (beginner to advanced)
- Points system
- Streak counter with fire animation

**Estimate:** 3-4 days

---

## Technical Improvements

### 17. **Performance Optimization**
- Code splitting, lazy loading (React)
- Virtualized lists (for large class histories)
- Database indexing on app.db
- Lazy-load export module (html2pdf.js is ~1MB)

**Estimate:** 2-3 days

---

### 18. **Automated Testing**
- Unit tests (pure functions in report-helpers, quran-utils)
- Integration tests (FastAPI endpoints)
- E2E tests (Playwright for critical user flows)
- CI/CD pipeline (GitHub Actions)

**Estimate:** 5-7 days

---

### 19. **Accessibility**
- Screen reader support
- Keyboard navigation
- High contrast mode
- Font size controls
- WCAG 2.1 AA compliance

**Estimate:** 3-4 days

---

## Priority Matrix

| Priority | Feature | Impact | Effort | Status |
|----------|---------|--------|--------|--------|
| **P0** | Desktop Distribution (installer) | Critical | Low | Phase 5 pending |
| **P0** | Security Hardening | Critical | Low-Medium | Not Started |
| **P1** | Onboarding Flow | High | Low | Not Started |
| **P1** | Error Monitoring | High | Medium | Not Started |
| **P1** | Student Search/Filter | Medium | Low | Not Started |
| **P2** | Notifications | Medium | Medium | Not Started |
| **P2** | Bulk Operations | Medium | Medium | Not Started |
| **P2** | Flutter Mobile Sync | Medium | High | Deferred |
| **P3** | Voice Recording | High (Premium) | High | Future |
| **P3** | Parent Portal | Medium | Medium | Future |
| **P3** | Calendar | Medium | Medium | Future |
| **P3** | Mobile App Stores | Medium | Medium | Future |

---

## Recommended Roadmap

### **Sprint 1: Ship Desktop MVP (1-2 weeks)**
**Goal:** Distribute to first 10-20 users (teachers + their students)

- Security hardening (rate limiting, input validation)
- Onboarding / first-launch experience
- Test `tauri build` installer on clean machine
- Fix any remaining sidecar/sync issues
- Distribute installer to beta testers

---

### **Sprint 2: Polish & Engagement (2-3 weeks)**
**Goal:** Make the app sticky

- Error monitoring (Sentry)
- Student search/filter
- Notifications / reminders
- Bulk class creation
- Performance optimization

---

### **Sprint 3: Premium Features (4-6 weeks)**
**Goal:** Differentiation + monetization

- Voice recording (premium)
- Parent portal
- Calendar/scheduling
- Auto-update mechanism

---

### **Sprint 4: Mobile Distribution (when ready)**
**Goal:** Expand to mobile users

- Flutter data sync (full implementation)
- App store prep (icons, screenshots, descriptions)
- iOS TestFlight + Google Play submission
- Privacy policy + Terms of Service pages

---

## Monetization Strategy

### **Freemium Model**

**Free Tier:**
- Up to 5 students per teacher
- Basic mistake tracking
- 10 classes/month
- Standard support

**Premium Tier ($9.99/month or $99/year):**
- Unlimited students
- Voice recording & async review
- Advanced analytics & reports
- Priority support
- Parent portal access
- PDF export
- Calendar integration

**Enterprise Tier ($299/year per institution):**
- Multiple teachers
- Admin dashboard
- Custom branding
- Bulk student import
- Dedicated support

---

## Competitive Advantage

### **Existing Solutions:**
1. Pen & Paper - Free, no cloud sync
2. Google Sheets - Manual, not specialized
3. Quran Apps (Memorize, Ayah) - Reading only, no teacher tools
4. Custom School Solutions - Expensive, not portable

### **QuranTrack Advantages:**
- Character-level precision (letter/harakat mistakes)
- Smart portion suggestions (auto-continues based on history)
- Cross-platform (desktop + web + mobile)
- Native desktop app (fast, offline-capable)
- Comprehensive reports (PDF, CSV, Word with charts and trends)
- **Voice recording** (NO COMPETITOR HAS THIS) — future premium feature
- Affordable freemium model
- Modern, clean UX with dark/light mode

---

## Legal & Compliance

### Required Before Launch
- Privacy Policy (for Supabase, app stores)
- Terms of Service
- GDPR compliance (if EU users)
- COPPA compliance (if under 13 users)
- Data retention policy
- User data deletion workflow ("delete my account")

---

## Success Metrics

### Launch Metrics (First 3 Months)
- 20+ active teachers
- 100+ active students
- 2,000+ classes recorded
- 10,000+ mistakes tracked
- <10% churn rate

### Engagement Metrics
- Daily active users (DAU)
- Weekly active users (WAU)
- Average classes per teacher/week
- Average student login frequency
- Report exports per teacher/month

---

## Summary

**QuranTrack is ~85% complete** for a desktop MVP launch.

**What's done:** QPC rendering (web + mobile), mistake tracking, student reports with export, classes dashboard, Supabase auth + sync, Tauri desktop app with sidecar, responsive design, light/dark mode.

**Must-fix before launch:** Security hardening (1-2 days), desktop installer test (1 day), basic onboarding (2 days).

**Should-add soon:** Error monitoring, student search/filter, notifications.

**Game-changer:** Voice recording (premium feature, future sprint).

**Recommended next step:**
Security Hardening → Onboarding → Build Installer → Beta Distribution
