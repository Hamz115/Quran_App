# Agent 4: Docs — Documentation Updates (Runs Alongside All Agents)

**Phases:** Continuous (runs throughout)
**Depends on:** Monitors Agents 1, 2, and 3. Updates docs as each completes.
**Blocks:** Nothing — this is the final documentation pass

## Inter-Agent Communication

**This agent MUST actively communicate with other agents:**
- Proactively ASK each agent when they complete: "What files did you create/modify? Any issues or deviations from the plan?"
- When Agent 1 messages completion → ask for specifics, update docs
- When Agent 2 messages completion → ask for specifics, update docs
- When Agent 3 messages Feature 7 completion → ask for specifics, update docs
- When Agent 3 messages Feature 9 completion → ask for specifics, do final doc pass
- If any agent reports an issue or deviation → record it in the session log immediately
- If you notice a conflict between what two agents report → flag it to both agents

## Objective

Keep all project documentation in sync as the other 3 agents implement the 9 features. Update the session log, PROJECT_CHANGELOG, CLAUDE.md/AGENTS.md, and the implementation plan checkboxes.

## Reference

- **Session log (created earlier today):** `docs/Logs/2026-02-19-001-implementation-plans.md` — update this or create a new implementation session log
- **Implementation plan docs:**
  - `docs/Technical Implementation Journey/Web_Portion_Management_Plan.md`
  - `docs/Technical Implementation Journey/Flutter_Portion_Management_Plan.md`
  - `docs/Technical Implementation Journey/Flutter_CharLevel_Mistakes_Alignment.md`
- **Changelog:** `docs/PROJECT_CHANGELOG.md`
- **Codebase instructions:** `CLAUDE.md` and `AGENTS.md` (must stay identical)

## Tasks

### On Agent 1 (Web Portions) Completion

- [x] **D-A.** Update session log with Agent 1 results
  - File: `docs/Logs/2026-02-19-002-feature-implementation.md` (create if it doesn't exist)
  - Add to "Work Completed" section: Web portion management details
  - Add to "Files Changed" table: all web files Agent 1 created/modified
  - Note any issues encountered or deviations from the plan

### On Agent 2 (Flutter Portions) Completion

- [x] **D-B.** Update session log with Agent 2 results
  - File: `docs/Logs/2026-02-19-002-feature-implementation.md`
  - Add Flutter portion management details
  - Add to "Files Changed" table: all Flutter files Agent 2 modified
  - Note any issues

### On Agent 3 Feature 7 (Char-Level Polish) Completion

- [x] **D-C.** Update session log with Agent 3 Feature 7 results
  - File: `docs/Logs/2026-02-19-002-feature-implementation.md`
  - Add character-level mistake polish details
  - Add `arabic_text_utils.dart` and `mushaf_page_widget.dart` to "Files Changed"

### On Agent 3 Feature 9 (Smart Suggestions) Completion

- [x] **D-D.** Update session log with Agent 3 Feature 9 results
  - File: `docs/Logs/2026-02-19-002-feature-implementation.md`
  - Add smart suggestions implementation details
  - Add new model file + modified files to "Files Changed"

### When ALL Agents Complete

- [x] **D-E.** Update `docs/PROJECT_CHANGELOG.md`
  - Add a new phase entry (next available phase number)
  - Title: "Portion Management, Char-Level Polish & Smart Suggestions"
  - Summary of all 9 features:
    - Web: Edit/delete portions migrated to Supabase, "By Juz" selection mode
    - Flutter: Edit/delete portions, "By Juz" selection, tab overflow fix
    - Flutter: Character-level mistake highlighting polish (harakat codes, shadda combo, glow)
    - Flutter: Smart suggestions in class creation (ported from web)
  - List key files created and modified across both platforms

- [x] **D-F.** Update `CLAUDE.md` and `AGENTS.md` codebase map
  - These two files must stay identical
  - Add new files to the codebase tree:
    - `quran_mobile/lib/data/models/suggested_portions.dart`
    - `quran_mobile/lib/data/quran_data.dart` — note `JuzBoundary` addition
  - Update descriptions if any existing entries changed:
    - `classroom_screen.dart` — now has edit/delete portion buttons
    - `create_class_screen.dart` — now has "By Juz" toggle + Smart Suggestions panel
    - `arabic_text_utils.dart` — note shadda combo logic
  - Copy updated `CLAUDE.md` to `AGENTS.md` verbatim

- [x] **D-G.** Final session log polish
  - Ensure `docs/Logs/2026-02-19-002-feature-implementation.md` has:
    - Complete "Files Changed" table with ALL files from all 3 agents
    - Accurate "Summary" section reflecting what was actually built
    - "Next Steps" listing any remaining items (testing, RLS policies, etc.)
    - "Notes" with any learnings, agent coordination observations, or deviations

## Files Modified

| File | Change |
|---|---|
| `docs/Logs/2026-02-19-002-feature-implementation.md` | CREATE — implementation session log |
| `docs/PROJECT_CHANGELOG.md` | MODIFY — new phase entry |
| `CLAUDE.md` | MODIFY — updated codebase map |
| `AGENTS.md` | MODIFY — mirror of CLAUDE.md |

## Key Constraints

- **Do NOT modify any TypeScript, Dart, or Flutter code** — this agent only touches documentation files
- **Wait for agent completion signals** before updating — don't guess what was implemented
- Ask each agent for specifics: files created/modified, issues, deviations from plan
- Keep the session log factual — record what actually happened, not what was planned
- CLAUDE.md and AGENTS.md must stay identical — always update both
- The session log naming convention: `2026-02-19-002-feature-implementation.md` (002 because 001 is the planning session from earlier today)

## Session Log Template

```markdown
# Session Log: Feature Implementation — Portions, Char-Level, Suggestions

**Date:** 2026-02-19
**Session:** 002

## Objective

Implement 9 features across web and Flutter: edit/delete portions, "By Juz" selection, char-level mistake polish, tab overflow fix, and smart suggestions.

## Summary

[Fill in when all agents complete]

## Work Completed

### Web Portion Management (Agent 1)
- [Details from Agent 1]

### Flutter Portion Management (Agent 2)
- [Details from Agent 2]

### Character-Level Mistake Polish (Agent 3 — Feature 7)
- [Details from Agent 3]

### Smart Suggestions (Agent 3 — Feature 9)
- [Details from Agent 3]

## Issues Encountered

- [Collect from all agents]

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| [Collect from all agents] | | |

## Next Steps

- [ ] [Remaining items]

## Notes

- Multi-agent team: 4 agents (Web Portions, Flutter Portions, Flutter Polish, Docs)
- [Any coordination notes]
```

## Coordination Protocol

1. Start immediately — create the session log skeleton while waiting for agents
2. When Agent 1 finishes → update session log (D-A)
3. When Agent 2 finishes → update session log (D-B)
4. When Agent 3 finishes Feature 7 → update session log (D-C)
5. When Agent 3 finishes Feature 9 → update session log (D-D)
6. When ALL done → update PROJECT_CHANGELOG + CLAUDE.md/AGENTS.md + final polish (D-E, D-F, D-G)
