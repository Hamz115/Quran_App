# QuranTrack Cross-Platform Visual Redesign Direction

**Date:** 2026-07-26
**Status:** Design direction prepared; Flutter-first implementation pending active Windows tutorial work

## Why Another Redesign Is Justified

The current interfaces are functional and thoroughly validated, but the real Android and packaged-Windows screenshots still read as a generic cyan administration dashboard rather than a distinctive Quran-focused product.

Observed weaknesses:

- the Windows top-tab navigation has weak hierarchy and does not use desktop width effectively;
- the Windows dashboard is dominated by large, sparse statistic cards and excess empty space;
- the Android dashboard places four oversized statistic cards before the user's practical work;
- both products give secondary metrics similar visual priority to primary actions;
- cyan gradients, rounded white cards, and generic line icons create a competent but template-like appearance;
- the information architecture does not make the next likely action immediately obvious;
- Quran reading, active sessions, contacts, and review insights do not feel like one coherent workflow;
- desktop and mobile share colors but not a strong cross-platform product identity.

## Product Design Direction

QuranTrack should feel calm, focused, premium, and recognizably Quran-oriented without relying on decorative Islamic motifs everywhere.

### Visual identity

- Deep ink/navy foundations instead of bright cyan as the dominant surface.
- Emerald as the primary action and progress color.
- Restrained warm gold for Quran, streak, milestone, and important highlight states.
- Warm parchment/off-white reading and light-theme surfaces rather than cold blue-white.
- Softer borders, fewer gradients, less glassmorphism, and purposeful depth.
- Stronger typography hierarchy and denser information presentation.
- Quran text and recitation work remain visually central.

### Interaction principles

1. One obvious primary action per screen.
2. Practical work appears before broad statistics.
3. Navigation reflects platform conventions instead of forcing one structure everywhere.
4. Existing functionality, synchronization, databases, tutorial targets, and validated workflows remain intact.
5. Redesign components rather than merely recoloring current cards.
6. Every major screen must work in light and dark themes.
7. Accessibility, touch targets, resize behavior, and text scaling remain first-class requirements.

## Flutter / Android Structure

A desktop sidebar should **not** be copied onto the phone. Mobile should retain a compact bottom navigation pattern because it is faster and more familiar on a phone, but the current oversized floating treatment should be refined.

### Proposed mobile shell

- compact top app bar with page identity, sync state, and account access;
- four destinations: Home, Sessions, Mushaf, Settings;
- slimmer bottom navigation with a clear active indicator;
- context-specific primary action above the bottom navigation only where needed;
- consistent page margins and section spacing;
- fewer full-width ornamental headers.

### Proposed mobile dashboard order

1. Personal greeting and current status.
2. Primary `Start Session` action.
3. Continue/recent session card when available.
4. Compact weekly summary strip rather than four large cards.
5. Contacts requiring attention or recent contacts.
6. Recitation insights and common mistakes.
7. Secondary reports and historical information.

### Mobile component changes

- replace the four 2x2 oversized stat cards with a compact metric rail/summary panel;
- redesign contact rows with useful status and last-session context;
- make session cards the strongest repeated component;
- simplify backgrounds and reduce decorative polygons;
- use meaningful empty states with one action;
- unify sheets, dialogs, segmented controls, and portion selectors;
- preserve the existing Quran page renderer and validated reader interactions while redesigning only its surrounding chrome and controls.

## Windows / Tauri Structure

A sidebar is the correct direction for the desktop product.

### Proposed desktop shell

- persistent left sidebar around 232-248 px at normal desktop widths;
- compact/collapsed rail at constrained widths;
- product mark and workspace identity at the top;
- primary navigation: Overview, Sessions, Quran Reader, Reports;
- secondary navigation near the bottom: Tutorial, Settings, Account;
- restrained active state using emerald tint and a narrow indicator;
- slim top command bar for page title, synchronization status, contextual actions, and profile;
- responsive fallback to a compact navigation pattern below the desktop breakpoint.

### Proposed desktop dashboard

- compact welcome/header row with `New Session` as the primary action;
- one meaningful progress/weekly overview area rather than four equal oversized cards;
- recent and active sessions in the primary content column;
- contacts and attention items in a secondary column;
- latest mistakes/recitation insights as actionable content, not decoration;
- denser cards and tables that use desktop width intelligently;
- reduced empty space and clearer section relationships.

## Protected Functional Contracts

The redesign must preserve:

- all Flutter and React routes;
- Supabase live-v3 behavior and RLS;
- local SQLite mirroring and synchronization;
- all 604 Quran/QPC page mappings;
- page 590 / `84:25` rendering;
- session creation and post-creation portion editing;
- mistakes, notes, performance, reports, and exports;
- listener/reciter terminology;
- current authentication and logout behavior;
- tutorial target keys/selectors or intentionally migrated equivalents;
- updater and packaged sidecar behavior;
- Android status-bar and reader fixes;
- existing automated regression coverage.

## Safe Execution Order

1. Allow the active Codex Windows tutorial/persistence task to finish.
2. Preserve and review its changes before touching shared React/Tauri files.
3. Implement the Flutter design system and application shell first in isolated Flutter UI files.
4. Redesign the Flutter dashboard, sessions/classes, classroom, reader chrome, reports, settings, and authentication screens.
5. Run Flutter formatter, analyzer, tests, build, and emulator walkthrough.
6. Implement the React/Tauri sidebar shell after the Codex changes are integrated.
7. Redesign desktop pages without changing backend contracts.
8. Rebuild the packaged application and run targeted desktop visual/tutorial regression.
9. Publish as a later release only after both redesigns pass validation; keep published v2.0.0 as the stable baseline meanwhile.

## Current Coordination State

Codex is actively working in the packaged Windows tutorial flow and has created `docs/Logs/2026-07-26-006-windows-tutorial-persistence-alignment.md`. React/Tauri files must not be redesigned concurrently until that work completes and is reviewed. Flutter presentation work can proceed separately, but synchronization temporary files must not be committed.
