# Team Lead Prompt — Portion Management, Char-Level Polish & Smart Suggestions

You are the **Team Lead** orchestrating 4 agents to implement 9 features across the web and Flutter apps. Your job is to spawn ALL agents in parallel, set up task dependencies so blocked agents wait automatically, monitor progress, ensure they communicate, and resolve blockers.

## Team Lead Log

You MUST maintain a live progress log at **`docs/Logs/2026-02-19-002-team-lead-log.md`**. Create it immediately after reading the reference files. Use this structure:

```markdown
# Team Lead Log: Portion Management, Char-Level & Suggestions

**Date:** 2026-02-19
**Session:** 002 (Team Lead)
**Team:** 4 agents, 34 tasks, 9 features

## Task Tracker

Web     (Agent 1): [ ] W1 [ ] W2 [ ] W3 [ ] W4 [ ] W5 [ ] W6 [ ] W7 [ ] W8 [ ] W9
Flutter (Agent 2): [ ] F1 [ ] F2 [ ] F3 [ ] F4 [ ] F5 [ ] F6 [ ] F7 [ ] F8 [ ] F9
Polish  (Agent 3): [ ] P1 [ ] P2 [ ] P3 [ ] P4 [ ] P5 | [ ] S1 [ ] S2 [ ] S3 [ ] S4
Docs    (Agent 4): [ ] D-A [ ] D-B [ ] D-C [ ] D-D [ ] D-E [ ] D-F [ ] D-G

## Agent Status

| Agent | Status | Current Task | Notes |
|-------|--------|-------------|-------|
| 1 — Web Portions | Spawned | — | |
| 2 — Flutter Portions | Spawned | — | |
| 3 — Flutter Polish | Spawned | — | |
| 4 — Docs | Spawned | — | |

## Communication Log

[Timestamp each message between agents here]

## Milestones

- [ ] Agent 1 completes W1-W9
- [ ] Agent 2 completes F1-F9
- [ ] Agent 3 completes P1-P5 (Feature 7)
- [ ] Agent 3 completes S1-S4 (Feature 9)
- [ ] Agent 4 completes final pass (D-E, D-F, D-G)

## Issues & Deviations

[Record any problems, conflicts, or plan deviations here]

## Final Scoreboard

[Fill in when all agents complete]
```

Update this log **continuously** as agents report progress. Check off tasks in the tracker, update agent status, log all inter-agent messages.

## Step 1: Read These Files (In This Order)

1. **Team overview:** `docs/agents/TEAM_OVERVIEW.md` — roster, execution graph, dependency map, file ownership
2. **Implementation plans (3 docs):**
   - `docs/Technical Implementation Journey/Web_Portion_Management_Plan.md` — Web features 1-3
   - `docs/Technical Implementation Journey/Flutter_Portion_Management_Plan.md` — Flutter features 4-6, 8, 9
   - `docs/Technical Implementation Journey/Flutter_CharLevel_Mistakes_Alignment.md` — Flutter feature 7
3. **Agent 1 tasks:** `docs/agents/AGENT_1_WEB_PORTIONS.md` — Web edit/delete/juz (W1-W9)
4. **Agent 2 tasks:** `docs/agents/AGENT_2_FLUTTER_PORTIONS.md` — Flutter edit/delete/juz/tab fix (F1-F9)
5. **Agent 3 tasks:** `docs/agents/AGENT_3_FLUTTER_POLISH.md` — Char-level polish (P1-P5), then Smart Suggestions (S1-S4)
6. **Agent 4 tasks:** `docs/agents/AGENT_4_DOCS.md` — Continuous doc updates (D-A through D-G)
7. **Earlier session log:** `docs/Logs/2026-02-19-001-implementation-plans.md` — today's planning session

## Step 2: Create Tasks with Dependencies

Create ALL tasks upfront with proper `blockedBy` relationships. The task system handles the waiting automatically — blocked agents idle until their dependencies complete.

### Task Dependency Graph

```
W1-W9 (Agent 1)         → no blockers, start immediately
F1-F9 (Agent 2)         → no blockers, start immediately
P1-P5 (Agent 3)         → no blockers, start immediately (Feature 7)
S1-S4 (Agent 3)         → blockedBy: F1-F9 (Agent 2 must finish ALL flutter portions first)
D-A   (Agent 4)         → blockedBy: W1-W9 (Agent 1 done)
D-B   (Agent 4)         → blockedBy: F1-F9 (Agent 2 done)
D-C   (Agent 4)         → blockedBy: P1-P5 (Agent 3 Feature 7 done)
D-D   (Agent 4)         → blockedBy: S1-S4 (Agent 3 Feature 9 done)
D-E, D-F, D-G (Agent 4) → blockedBy: ALL other tasks (final pass)
```

## Step 3: Spawn ALL 4 Agents in Parallel

Launch all agents at the same time. Each agent reads its task file, claims unblocked tasks, and automatically waits when hitting a blocked task.

**Agent 1 (Web Portions):**
```
You are Agent 1 — Web Portions. Read your task file at docs/agents/AGENT_1_WEB_PORTIONS.md and the plan at docs/Technical Implementation Journey/Web_Portion_Management_Plan.md.

Complete all tasks W1-W9. You're implementing 3 web features:
1. Edit Portion — migrate from FastAPI to Supabase (add updateAssignment + addClassAssignments to supabase-api.ts, update api.ts exports)
2. Delete Portion — new feature (add deleteAssignment to supabase-api.ts, add trash button + handler in Classroom.tsx)
3. "By Juz" Selection — add juz mode to TeacherClasses.tsx + quick-fill in Classroom.tsx modals

Read these source files first:
- quran_frontend/src/lib/supabase-api.ts (existing patterns, especially deleteClass at ~line 437)
- quran_frontend/src/api.ts (legacy functions at lines 106-135 to replace)
- quran_frontend/src/pages/Classroom.tsx (portion selector at lines 932-972, modals at lines 1347-1454)
- quran_frontend/src/pages/TeacherClasses.tsx (SinglePortion interface at lines 16-25, mode toggle at lines 478-501)
- quran_frontend/src/lib/quran-utils.ts (JUZ_BOUNDARIES at lines 40-71)

When done, mark all tasks complete and message Agent 4 with the list of files modified.
```

**Agent 2 (Flutter Portions):**
```
You are Agent 2 — Flutter Portions. Read your task file at docs/agents/AGENT_2_FLUTTER_PORTIONS.md and the plan at docs/Technical Implementation Journey/Flutter_Portion_Management_Plan.md.

Complete all tasks F1-F9. You're implementing 4 Flutter features:
4. Edit Portion — add updateAssignment() to ClassesNotifier, add edit button + bottom sheet in classroom_screen.dart
5. Delete Portion — add deleteAssignment() to class_repository.dart + ClassesNotifier, add trash button + confirmation dialog
6. "By Juz" Selection — add JuzBoundary class to quran_data.dart, update report_helpers.dart, add juz toggle to create_class_screen.dart
8. Tab Overflow Fix — wrap _TabButton in Expanded in report_panel.dart

Read these source files first:
- quran_mobile/lib/data/repositories/class_repository.dart (existing updateAssignment at line 168)
- quran_mobile/lib/data/models/assignment.dart (copyWith at line 63)
- quran_mobile/lib/presentation/providers/providers.dart (ClassesNotifier at line 262)
- quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart (_buildPortionSelector at line 283)
- quran_mobile/lib/presentation/screens/classes/create_class_screen.dart (portion builder)
- quran_mobile/lib/core/services/report_helpers.dart (private _JuzBoundary at line 24)
- quran_mobile/lib/data/quran_data.dart (add JuzBoundary here)
- quran_mobile/lib/presentation/screens/classes/report/report_panel.dart (tab Row at line 148)

IMPORTANT: When you finish ALL tasks, message Agent 3 that providers.dart and create_class_screen.dart are available for Feature 9. Agent 3 is waiting on you.

When done, mark all tasks complete and message Agent 4 with the list of files modified.
```

**Agent 3 (Flutter Polish):**
```
You are Agent 3 — Flutter Polish. Read your task file at docs/agents/AGENT_3_FLUTTER_POLISH.md and the plans at:
- docs/Technical Implementation Journey/Flutter_CharLevel_Mistakes_Alignment.md (Feature 7)
- docs/Technical Implementation Journey/Flutter_Portion_Management_Plan.md → Section E (Feature 9)

You have TWO passes:
- **First pass (P1-P5, Feature 7):** Character-level mistake highlighting polish. These tasks are UNBLOCKED — start immediately. Modify arabic_text_utils.dart (add 6 harakat codes + shadda combo logic) and mushaf_page_widget.dart (add glow effect for haraka mistakes).
- **Second pass (S1-S4, Feature 9):** Smart Suggestions. These tasks are BLOCKED until Agent 2 finishes F1-F9. Wait for Agent 2's message.

Read these source files first:
- quran_mobile/lib/core/services/arabic_text_utils.dart (harakat codes lines 21-37, parseArabicWord lines 46-60, groupArabicCharacters lines 79-102)
- quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart (_buildCharLevelWord lines 197-289, haraka TextSpan at lines 223-226)
- quran_frontend/src/pages/Classroom.tsx (web harakat at lines 96-100, splitArabicWord at lines 104-130 — the reference implementation)
- quran_frontend/src/lib/supabase-api.ts (getSuggestedPortions at lines 716-831, SuggestedPortions interface at lines 695-714)
- quran_frontend/src/pages/TeacherClasses.tsx (Smart Suggestions UI at lines 844-939)

After Feature 7: message Agent 4 with files modified.
After Feature 9: message Agent 4 with files created/modified. Read providers.dart and create_class_screen.dart FIRST (Agent 2 modified them).
```

**Agent 4 (Docs):**
```
You are Agent 4 — Docs. Read your task file at docs/agents/AGENT_4_DOCS.md. Your job is to keep documentation in sync as other agents complete their work.

Your tasks have dependencies — they auto-unblock as other agents finish:
- Task D-A unblocks when Agent 1 finishes W1-W9
- Task D-B unblocks when Agent 2 finishes F1-F9
- Task D-C unblocks when Agent 3 finishes P1-P5 (Feature 7)
- Task D-D unblocks when Agent 3 finishes S1-S4 (Feature 9)
- Tasks D-E, D-F, D-G unblock when ALL agents are done (final pass)

Start by creating the session log skeleton at docs/Logs/2026-02-19-002-feature-implementation.md (use the template in your task file).

As each agent completes, ask them for specifics (files created/modified, issues), then update:
1. The session log with work completed + files changed
2. When ALL done: PROJECT_CHANGELOG.md (new phase entry), CLAUDE.md + AGENTS.md (codebase map update), final session log polish

Only touch documentation files — never modify TypeScript or Dart code.
```

## Step 4: Monitor & Coordinate

### Your Ongoing Responsibilities

1. **Relay messages between agents** — If Agent 3 needs something from Agent 2, facilitate. If Agent 1 finds an RLS issue, tell Agent 2.
2. **Track progress** — Monitor the task system. All agents mark tasks complete as they go.

```
Web     (Agent 1): [ ] W1 [ ] W2 [ ] W3 [ ] W4 [ ] W5 [ ] W6 [ ] W7 [ ] W8 [ ] W9
Flutter (Agent 2): [ ] F1 [ ] F2 [ ] F3 [ ] F4 [ ] F5 [ ] F6 [ ] F7 [ ] F8 [ ] F9
Polish  (Agent 3): [ ] P1 [ ] P2 [ ] P3 [ ] P4 [ ] P5 | [ ] S1 [ ] S2 [ ] S3 [ ] S4
Docs    (Agent 4): [ ] D-A [ ] D-B [ ] D-C [ ] D-D [ ] D-E [ ] D-F [ ] D-G
```

3. **Resolve conflicts** — If two agents accidentally touch the same file, check the file ownership table in TEAM_OVERVIEW.md
4. **Nudge stalled agents** — If an agent seems stuck or forgets to mark a task complete (which keeps others blocked), nudge them

### Expected Flow

```
START ──> Agent 1 starts W1-W9 (Web portions)
      ──> Agent 2 starts F1-F9 (Flutter portions)
      ──> Agent 3 starts P1-P5 (Feature 7: char-level polish)
      ──> Agent 4 creates session log skeleton, waits

Agent 1 finishes W1-W9 ──> Agent 4 task D-A unblocks

Agent 3 finishes P1-P5 ──> Agent 4 task D-C unblocks
                        ──> Agent 3 waits for Agent 2 (Feature 9 blocked)

Agent 2 finishes F1-F9 ──> Agent 3 tasks S1-S4 unblock ──> Agent 3 starts Smart Suggestions
                        ──> Agent 4 task D-B unblocks

Agent 3 finishes S1-S4 ──> Agent 4 task D-D unblocks
                        ──> Agent 4 tasks D-E, D-F, D-G unblock (final pass)

Agent 4 finishes final pass ──> DONE
```

## Step 5: Final Report to User

When everything is done, provide a summary:

1. **Web results** — Edit/delete/juz features, files changed
2. **Flutter portions results** — Edit/delete/juz/tab fix, files changed
3. **Flutter char-level results** — 3 gaps closed, files changed
4. **Flutter suggestions results** — New model, provider, UI, files changed
5. **Docs updated** — Changelog, session log, CLAUDE.md
6. **Any issues or deviations** from the original plans
7. **Next steps** — Remaining items: RLS policy verification, device testing, dark mode verification
