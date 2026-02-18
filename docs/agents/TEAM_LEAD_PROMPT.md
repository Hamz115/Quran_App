# Team Lead Prompt — Flutter Local Quran + Classes Revamp

You are the **Team Lead** orchestrating 4 agents to implement the Flutter Local Quran + Classes Revamp. Your job is to spawn ALL agents in parallel, set up task dependencies so blocked agents wait automatically, monitor progress, ensure they communicate, and resolve blockers.

## Step 1: Read These Files (In This Order)

1. **Team overview:** `docs/agents/TEAM_OVERVIEW.md` — roster, execution graph, dependency map, file ownership
2. **Implementation plan:** `docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md` — full technical plan
3. **Agent 1 tasks:** `docs/agents/AGENT_1_QPC_FONTS.md` — Phase A (offline fonts)
4. **Agent 2 tasks:** `docs/agents/AGENT_2_FOUNDATION.md` — Phases B+C (models/providers), then Phase G (char-level rendering)
5. **Agent 3 tasks:** `docs/agents/AGENT_3_UI_WIDGETS.md` — Phases D+E (report widgets + classes screen rewrite)
6. **Agent 4 tasks:** `docs/agents/AGENT_4_DOCS.md` — continuous doc updates
7. **Session log:** `docs/Logs/2026-02-18-003-flutter-local-quran-and-classes-revamp.md` — current state

## Step 2: Create Tasks with Dependencies

Create ALL tasks upfront with proper `blockedBy` relationships. The task system handles the waiting automatically — blocked agents idle until their dependencies complete.

### Task Dependency Graph

```
A1-A7 (Agent 1)         → no blockers, start immediately
B1-B4 (Agent 2)         → no blockers, start immediately
C1-C2 (Agent 2)         → blockedBy: B1-B4
D1-D6 (Agent 3)         → blockedBy: C1-C2 (all of Agent 2's B+C must finish)
E1-E4 (Agent 3)         → blockedBy: D1-D6
G1-G5 (Agent 2)         → blockedBy: E1-E4 (all of Agent 3's D+E must finish)
D-A, D-B (Agent 4)      → blockedBy: A1-A7 (Agent 1 done)
D-C, D-D (Agent 4)      → blockedBy: C1-C2 (Agent 2 B+C done)
D-E, D-F (Agent 4)      → blockedBy: E1-E4 (Agent 3 D+E done)
D-G0, D-G0b (Agent 4)   → blockedBy: G1-G5 (Agent 2 Phase G done)
D-G through D-J (Agent 4) → blockedBy: G1-G5 (ALL agents done)
```

## Step 3: Spawn ALL 4 Agents in Parallel

Launch all agents at the same time. Each agent reads its task file, claims unblocked tasks, and automatically waits when hitting a blocked task.

**Agent 1 (QPC Fonts):**
```
You are Agent 1 — QPC Fonts. Read your task file at docs/agents/AGENT_1_QPC_FONTS.md and the implementation plan at docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md (Part 1 section).

Complete all Phase A tasks (A1-A7). Copy 604 QPC TTF fonts from quran_backend/fonts/qpc/ to quran_mobile/assets/fonts/qpc/, update pubspec.yaml, rewrite QpcFontService to use rootBundle instead of HTTP, simplify related files.

When you finish each task, mark it complete in the task system. When all Phase A tasks are done, message Agent 4 with the exact list of files created/modified and any issues encountered. Communicate with other agents if you hit any problems.
```

**Agent 2 (Foundation):**
```
You are Agent 2 — Foundation. Read your task file at docs/agents/AGENT_2_FOUNDATION.md and the implementation plan at docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md (New Dart Models, Supabase Queries, Phase B, Phase C sections). Also read the web source files you're porting from: quran_frontend/src/lib/report-types.ts, quran_frontend/src/components/teacher-classes/report-helpers.ts, and quran_frontend/src/lib/supabase-api.ts (the getStudentReport function starting at line 835).

You have TWO passes:
- **First pass (B+C):** Create Dart models, helper functions, Riverpod providers, fix teacherStudentsProvider. These tasks are unblocked — start immediately.
- **Second pass (G):** Character-level mistake rendering. These tasks are BLOCKED until Agent 3 finishes Phases D+E. The task system will auto-unblock them — just wait.

When you finish B+C, message Agent 3: "Foundation ready — models and providers are available." Message Agent 4 with files created. Then wait for Phase G tasks to unblock.

When Phase G unblocks, read the Phase G section of your task file. Read: quran_frontend/src/pages/Classroom.tsx (lines 457-522), quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart, quran_mobile/lib/presentation/screens/classroom/word_popup.dart, quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart. Complete G1-G5.

When all done, message Agent 4 with files modified.
```

**Agent 3 (UI Widgets):**
```
You are Agent 3 — UI Widgets. Read your task file at docs/agents/AGENT_3_UI_WIDGETS.md and the implementation plan at docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md (New Widgets & Files, Phase D, Phase E sections). Also read the web components you're mirroring — all files in quran_frontend/src/components/teacher-classes/ (ReportPanel.tsx, ReportFilterBar.tsx, ReportSummaryStrip.tsx, ReportClassesTab.tsx, ReportMistakesTab.tsx, ReportPerformanceTab.tsx, report-helpers.ts). And read the student pills section in quran_frontend/src/pages/TeacherClasses.tsx (lines 653-684).

Your Phase D+E tasks are BLOCKED until Agent 2 finishes Phases B+C. The task system will auto-unblock them — just wait for it.

Once unblocked, Agent 2 has created the models, helpers, and providers you depend on — use them. Complete all D1-D6 and E1-E4 tasks. Build the 6 report widgets and rewrite classes_screen.dart.

When done, message Agent 2: "UI widgets complete — Phase G is unblocked." Message Agent 4 with files created/modified. If you find any issue with Agent 2's models or providers, message Agent 2 immediately so they can fix it.
```

**Agent 4 (Docs):**
```
You are Agent 4 — Docs. Read your task file at docs/agents/AGENT_4_DOCS.md. Your job is to keep documentation in sync as other agents complete their work.

Your tasks have dependencies — they auto-unblock as other agents finish:
- Tasks D-A, D-B unblock when Agent 1 finishes Phase A
- Tasks D-C, D-D unblock when Agent 2 finishes B+C
- Tasks D-E, D-F unblock when Agent 3 finishes D+E
- Tasks D-G0, D-G0b unblock when Agent 2 finishes Phase G
- Tasks D-G through D-J unblock when ALL agents are done (final pass)

As each set unblocks, ask the completing agent for specifics (files created/modified, issues), then update: (1) the implementation plan checkboxes at docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md, (2) the session log at docs/Logs/2026-02-18-003-flutter-local-quran-and-classes-revamp.md.

For the final pass (D-G through D-J): update docs/PROJECT_CHANGELOG.md with a new phase entry, update CLAUDE.md and AGENTS.md codebase maps with all new files.

Only touch documentation files — never modify Dart/Flutter code.
```

## Step 4: Monitor & Coordinate

### Your Ongoing Responsibilities

1. **Relay messages between agents** — If Agent 3 reports a problem with Agent 2's models, tell Agent 2. If Agent 2 needs Agent 3 to wait, relay that.
2. **Track progress** — Monitor the task system. All agents mark tasks complete as they go.

```
Phase A  (Agent 1): [ ] A1 [ ] A2 [ ] A3 [ ] A4 [ ] A5 [ ] A6 [ ] A7
Phase B  (Agent 2): [ ] B1 [ ] B2 [ ] B3 [ ] B4
Phase C  (Agent 2): [ ] C1 [ ] C2
Phase D  (Agent 3): [ ] D1 [ ] D2 [ ] D3 [ ] D4 [ ] D5 [ ] D6
Phase E  (Agent 3): [ ] E1 [ ] E2 [ ] E3 [ ] E4
Phase G  (Agent 2): [ ] G1 [ ] G2 [ ] G3 [ ] G4 [ ] G5
Docs     (Agent 4): [ ] D-A [ ] D-B [ ] D-C [ ] D-D [ ] D-E [ ] D-F
                     [ ] D-G0 [ ] D-G0b [ ] D-G [ ] D-H [ ] D-I [ ] D-J
```

3. **Resolve conflicts** — If two agents accidentally touch the same file, check the file ownership table in TEAM_OVERVIEW.md
4. **Nudge stalled agents** — If an agent seems stuck or forgets to mark a task complete (which keeps others blocked), nudge them

### Expected Flow

```
START ──> Agent 1 starts A1-A7
      ──> Agent 2 starts B1-B4
      ──> Agent 3 waits (blocked on C2)
      ──> Agent 4 waits (blocked on various)

Agent 2 finishes B1-B4 ──> C1-C2 unblock ──> Agent 2 does C1-C2
Agent 1 finishes A1-A7 ──> Agent 4 tasks D-A, D-B unblock

Agent 2 finishes C1-C2 ──> Agent 3 tasks D1-D6 unblock ──> Agent 3 starts building widgets
                        ──> Agent 4 tasks D-C, D-D unblock
                        ──> Agent 2 waits (Phase G blocked on E4)

Agent 3 finishes D1-D6 ──> E1-E4 unblock ──> Agent 3 rewrites classes screen
Agent 3 finishes E1-E4 ──> Agent 2 tasks G1-G5 unblock ──> Agent 2 starts char-level rendering
                        ──> Agent 4 tasks D-E, D-F unblock

Agent 2 finishes G1-G5 ──> Agent 4 tasks D-G0, D-G0b, D-G through D-J unblock
                        ──> Agent 4 does final doc pass

Agent 4 finishes final pass ──> DONE
```

## Step 5: Final Report to User

When everything is done, provide a summary:

1. **Phase A results** — QPC fonts bundled, files changed
2. **Phases B+C results** — Models, helpers, providers created
3. **Phases D+E results** — Report widgets built, classes screen rewritten
4. **Phase G results** — Character-level rendering added
5. **Docs updated** — Changelog, session log, CLAUDE.md
6. **Any issues or deviations** from the original plan
7. **Next steps** — Phase F (polish) items that weren't covered: dark mode verification, responsive testing, pull-to-refresh, loading skeletons, error handling
