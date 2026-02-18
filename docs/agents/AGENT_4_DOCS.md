# Agent 4: Docs — Documentation Updates (Runs Alongside All Agents)

**Phases:** Continuous (runs throughout)
**Depends on:** Monitors Agents 1, 2, and 3. Updates docs as each completes phases.
**Blocks:** Nothing — this is the final documentation pass

## Inter-Agent Communication

**This agent MUST actively communicate with other agents:**
- Proactively ASK each agent when they complete a phase: "What files did you create/modify? Any issues or deviations from the plan?"
- When Agent 1 messages completion → ask for specifics, then update docs
- When Agent 2 messages B+C completion → ask for specifics, then update docs
- When Agent 3 messages D+E completion → ask for specifics, then update docs
- When Agent 2 messages G completion → ask for specifics, then do final doc pass
- If any agent reports an issue or deviation → record it in the session log immediately
- If you notice a conflict between what two agents report → flag it to both agents

## Objective

Keep all project documentation in sync as the other 3 agents implement changes. This agent runs alongside the others and updates docs incrementally as each agent reports completion. Updates: session log, PROJECT_CHANGELOG, CLAUDE.md/AGENTS.md codebase map, and the implementation plan checkboxes.

## Reference

- **Implementation plan:** `docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md`
- **Session log:** `docs/Logs/2026-02-18-003-flutter-local-quran-and-classes-revamp.md`
- **Changelog:** `docs/PROJECT_CHANGELOG.md`
- **Codebase instructions:** `CLAUDE.md` and `AGENTS.md` (identical files)

## Tasks

### On Agent 1 (QPC Fonts) Completion

- [x] **D-A.** Update implementation plan — check off Phase A tasks (A1-A7)
  - File: `docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md`
  - Change `- [x]` to `- [x]` for each completed task in Phase A

- [x] **D-B.** Update session log with Agent 1 results
  - File: `docs/Logs/2026-02-18-003-flutter-local-quran-and-classes-revamp.md`
  - Add to "Files Changed" section: list of files Agent 1 created/modified
  - Add any issues encountered or decisions made

### On Agent 2 (Foundation) Completion

- [x] **D-C.** Update implementation plan — check off Phase B + C tasks (B1-B4, C1-C2)
  - File: `docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md`

- [x] **D-D.** Update session log with Agent 2 results
  - File: `docs/Logs/2026-02-18-003-flutter-local-quran-and-classes-revamp.md`
  - Add new files created: models, helpers, providers
  - Note any deviations from the plan

### On Agent 3 (UI Widgets) Completion

- [x] **D-E.** Update implementation plan — check off Phase D + E tasks (D1-D6, E1-E4)
  - File: `docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md`

- [x] **D-F.** Update session log with Agent 3 results
  - File: `docs/Logs/2026-02-18-003-flutter-local-quran-and-classes-revamp.md`
  - Add new widget files created
  - Add classes_screen.dart rewrite summary

### On Agent 2 Phase G (Character-Level Rendering) Completion

- [x] **D-G0.** Update implementation plan — check off Phase G tasks (G1-G5)
  - File: `docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md`
  - Phase G may not be in the original plan doc — add it if missing

- [x] **D-G0b.** Update session log with Agent 2 Phase G results
  - File: `docs/Logs/2026-02-18-003-flutter-local-quran-and-classes-revamp.md`
  - Add character-level rendering files modified
  - Note the `arabic_text_utils.dart` extraction

### When ALL Agents Complete (including Agent 2 Phase G)

- [x] **D-G.** Update `docs/PROJECT_CHANGELOG.md`
  - Add a new phase entry (Phase 18 or next available number)
  - Title: "Flutter Offline QPC Fonts + Classes Tab Revamp"
  - Summary of what changed:
    - QPC fonts bundled locally (604 TTFs, 92MB) — fully offline Quran reader
    - Classes screen rewritten with student pills + report dashboard
    - 6 new report widgets matching web Phase 16.2
    - teacherStudentsProvider fixed for mobile
    - Character-level mistake rendering on Mushaf page (per-character highlighting)
    - Shared Arabic text parser extracted (`arabic_text_utils.dart`)
  - List key files created and modified

- [x] **D-H.** Update `CLAUDE.md` codebase map
  - Add new files to the Flutter section of the codebase tree:
    - `assets/fonts/qpc/` under quran_mobile
    - `data/models/student_report.dart`
    - `data/models/report_filters.dart`
    - `core/services/report_helpers.dart`
    - `presentation/providers/report_provider.dart`
    - `presentation/screens/classes/report/` (6 widgets)
  - Update the description of `classes_screen.dart` (no longer "Current flat classes table")

- [x] **D-I.** Update `AGENTS.md` to match `CLAUDE.md`
  - These two files must stay identical
  - Copy the updated CLAUDE.md content to AGENTS.md

- [x] **D-J.** Final session log polish
  - File: `docs/Logs/2026-02-18-003-flutter-local-quran-and-classes-revamp.md`
  - Ensure "Files Changed" table is complete with ALL files from all 3 agents
  - Update the "Deliverable" section to reflect what was actually built (not just planned)
  - Change status from planning to implementation-complete
  - Add final "Notes" with any learnings or issues

## Files Modified

| File | Change |
|---|---|
| `docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md` | Check off completed tasks |
| `docs/Logs/2026-02-18-003-flutter-local-quran-and-classes-revamp.md` | Full session log with results |
| `docs/PROJECT_CHANGELOG.md` | New phase entry |
| `CLAUDE.md` | Updated codebase map with new files |
| `AGENTS.md` | Mirror of CLAUDE.md |

## Key Constraints

- **Do NOT modify any Dart/Flutter code** — this agent only touches documentation files
- **Wait for agent completion signals** before updating — don't guess what was implemented
- Ask each agent (via task system messages) what files they created/modified and any issues encountered
- Keep the session log factual — record what actually happened, not what was planned
- The implementation plan checkboxes should reflect actual completion (only check off tasks that were truly done)
- CLAUDE.md and AGENTS.md must stay identical — always update both

## Coordination Protocol

1. Start immediately — can set up the changelog structure while waiting
2. When Agent 1 finishes → update plan checkboxes + session log for Phase A
3. When Agent 2 finishes → update plan checkboxes + session log for Phases B+C
4. When Agent 3 finishes → update plan checkboxes + session log for Phases D+E
5. After all 3 → update PROJECT_CHANGELOG, CLAUDE.md, AGENTS.md, final session log polish
