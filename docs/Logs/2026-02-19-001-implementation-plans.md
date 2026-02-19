# Session Log: Implementation Plans for Remaining Features

**Date:** 2026-02-19
**Session:** 001

## Objective

Research and create detailed implementation plan documents for the 9 remaining features across web and Flutter apps. Each plan references exact file paths, line numbers, existing code patterns, and step-by-step implementation approaches.

## Summary

Investigated the full codebase (web + Flutter) to understand the current state of each feature. Created 3 comprehensive implementation plan documents covering: (1) Web portion management (edit/delete/juz), (2) Flutter portion management + smart suggestions + tab fix, and (3) Flutter character-level mistake highlighting polish. All plans reference exact code locations and provide copy-paste-ready patterns.

## Work Completed

### Agent Team Configuration
- Created 4-agent team for implementing all 9 features
- Agent 1 (Web Portions): Features 1-3, tasks W1-W9
- Agent 2 (Flutter Portions): Features 4-6 + 8, tasks F1-F9
- Agent 3 (Flutter Polish): Feature 7 (P1-P5, immediate) then Feature 9 (S1-S4, blocked on Agent 2)
- Agent 4 (Docs): Continuous documentation, tasks D-A through D-G
- File ownership mapped to prevent conflicts; dependency graph ensures safe handoff of shared files (`providers.dart`, `create_class_screen.dart`)
- Total: 34 tasks across 4 agents

### Research: Web Portion Management (Features 1-3)
- Confirmed `api.ts:106-135` has legacy FastAPI calls for `updateAssignment` and `addClassAssignments`
- Confirmed `supabase-api.ts:414-428` has the insert pattern for assignments
- Confirmed `JUZ_BOUNDARIES` in `quran-utils.ts:40-71` has full ayah-level precision
- Confirmed `TeacherClasses.tsx:16-25` — `SinglePortion.mode` only has `'page' | 'surah'`
- Confirmed `Classroom.tsx:949-966` — edit pencil button pattern (no delete button)
- Confirmed `Classroom.tsx:1347-1454` — Add/Edit Portion modals (surah-only, no juz)

### Research: Flutter Portion Management (Features 4-6, 8-9)
- Confirmed `class_repository.dart:168-174` — `updateAssignment()` exists but is unused
- Confirmed `assignment.dart:63-89` — `copyWith` method exists on `Assignment`
- Confirmed `providers.dart:262+` — `ClassesNotifier` has no update/delete methods
- Confirmed `classroom_screen.dart:283-333` — portion selector has no edit/delete buttons
- Confirmed `report_helpers.dart:24-62` — `_JuzBoundary` is private and missing ayah precision
- Confirmed `report_panel.dart:148-177` — Row with 3 `_TabButton` children (no Expanded, no scroll)
- Confirmed web smart suggestions: `supabase-api.ts:716-831` + `TeacherClasses.tsx:844-939`
- Confirmed Flutter has no smart suggestions anywhere

### Research: Flutter Character-Level Mistakes (Feature 7)
- Confirmed `arabic_text_utils.dart:21-37` — `harakatCodes` list is missing 6 codes (0x0659-0x065E)
- Confirmed web `Classroom.tsx:96-100` includes all 21 harakat codes
- Confirmed `Classroom.tsx:104-130` — `splitArabicWord` has shadda combination logic
- Confirmed `arabic_text_utils.dart:46-60` — `parseArabicWord` does NOT combine shadda
- Confirmed `mushaf_page_widget.dart:215-231` — haraka mistakes use plain `TextStyle(color:)` with no glow

### Document Creation
- Created `docs/Technical Implementation Journey/Web_Portion_Management_Plan.md`
- Created `docs/Technical Implementation Journey/Flutter_Portion_Management_Plan.md`
- Created `docs/Technical Implementation Journey/Flutter_CharLevel_Mistakes_Alignment.md`

## Issues Encountered

- None — this was a research and documentation session

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `docs/Logs/2026-02-19-001-implementation-plans.md` | Created | This session log |
| `docs/Technical Implementation Journey/Web_Portion_Management_Plan.md` | Created | Web: edit/delete/juz portion implementation plan |
| `docs/Technical Implementation Journey/Flutter_Portion_Management_Plan.md` | Created | Flutter: edit/delete/juz/suggestions/tab fix plan |
| `docs/Technical Implementation Journey/Flutter_CharLevel_Mistakes_Alignment.md` | Created | Flutter: char-level mistake highlighting polish plan |
| `docs/agents/TEAM_OVERVIEW.md` | Updated | 4-agent team roster, execution graph, dependency map |
| `docs/agents/AGENT_1_WEB_PORTIONS.md` | Created | Agent 1: 9 tasks for web edit/delete/juz |
| `docs/agents/AGENT_2_FLUTTER_PORTIONS.md` | Created | Agent 2: 9 tasks for Flutter edit/delete/juz/tab fix |
| `docs/agents/AGENT_3_FLUTTER_POLISH.md` | Created | Agent 3: 9 tasks for char-level polish + smart suggestions |
| `docs/agents/AGENT_4_DOCS.md` | Updated | Agent 4: 7 tasks for continuous documentation |
| `docs/agents/TEAM_LEAD_PROMPT.md` | Updated | Team lead orchestration prompt with spawn instructions |

## Next Steps

- [ ] Implement Feature 1: Edit Portion — Supabase Migration (Web)
- [ ] Implement Feature 2: Delete Portion (Web)
- [ ] Implement Feature 3: "By Juz" Portion Selection (Web)
- [ ] Implement Feature 4: Edit Portion (Flutter)
- [ ] Implement Feature 5: Delete Portion (Flutter)
- [ ] Implement Feature 6: "By Juz" Portion Selection (Flutter)
- [ ] Implement Feature 7: Character-Level Mistake Highlighting Polish (Flutter)
- [ ] Implement Feature 8: ReportPanel Tab Row Overflow Fix (Flutter)
- [ ] Implement Feature 9: Smart Suggestions in Class Creation (Flutter)

## Notes

- All 3 documents are designed to be standalone — each can be handed to a developer or AI agent
- Features are ordered by dependency: web features first (they establish patterns), then Flutter mirrors
- Feature 7 (char-level mistakes) is the smallest scope — mostly done, just 3 gaps to close
- Feature 8 (tab overflow) is a one-line fix — wrap in `Expanded`
- Feature 9 (smart suggestions) is the largest Flutter feature — requires new model, provider, and UI
