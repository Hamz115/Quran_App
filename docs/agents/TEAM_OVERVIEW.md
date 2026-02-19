# Agent Team: Portion Management, Char-Level Polish & Smart Suggestions

**Date:** 2026-02-19
**Total Agents:** 4
**Plans:**
- `docs/Technical Implementation Journey/Web_Portion_Management_Plan.md`
- `docs/Technical Implementation Journey/Flutter_Portion_Management_Plan.md`
- `docs/Technical Implementation Journey/Flutter_CharLevel_Mistakes_Alignment.md`

## CRITICAL: Inter-Agent Communication

**All agents MUST talk to each other.** This is not optional. Use the task system messaging to:
- Report completion of phases with specific files created/modified
- Flag issues or deviations from the plan immediately
- Coordinate on shared files before making changes
- Ask other agents for status when waiting on a dependency

## Team Roster

| Agent | Name | Features | Task File | Status |
|---|---|---|---|---|
| 1 | Web Portions | 1, 2, 3 (Web) | `docs/agents/AGENT_1_WEB_PORTIONS.md` | Complete ✓ |
| 2 | Flutter Portions | 4, 5, 6, 8 (Flutter) | `docs/agents/AGENT_2_FLUTTER_PORTIONS.md` | Complete ✓ |
| 3 | Flutter Polish | 7, then 9 (Flutter) | `docs/agents/AGENT_3_FLUTTER_POLISH.md` | Complete ✓ |
| 4 | Docs | Continuous | `docs/agents/AGENT_4_DOCS.md` | Complete ✓ |

## Feature → Agent Map

| # | Feature | Platform | Agent |
|---|---------|----------|-------|
| 1 | Edit Portion (Supabase migration) | Web | Agent 1 |
| 2 | Delete Portion | Web | Agent 1 |
| 3 | "By Juz" Portion Selection | Web | Agent 1 |
| 4 | Edit Portion | Flutter | Agent 2 |
| 5 | Delete Portion | Flutter | Agent 2 |
| 6 | "By Juz" Portion Selection | Flutter | Agent 2 |
| 7 | Char-Level Mistake Highlighting Polish | Flutter | Agent 3 |
| 8 | ReportPanel Tab Row Overflow Fix | Flutter | Agent 2 |
| 9 | Smart Suggestions in Class Creation | Flutter | Agent 3 |

## Execution Graph

```
Time ──────────────────────────────────────────────────────────────>

Agent 1 (Web Portions):       ██████████████████████░░░░░░░░░░░░░░░
                               ╰── W1-W9 ────────╯
Agent 2 (Flutter Portions):   ██████████████████████░░░░░░░░░░░░░░░
                               ╰── F1-F9 ────────╯
Agent 3 (Flutter Polish):     ██████████░░░░░░░░░░░░██████████░░░░░
                               ╰── P1-P5 ╯          ╰── S1-S4 ╯
                               (Feature 7)          (Feature 9)
Agent 4 (Docs):               ░░░░░░░░░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒████████

█ = Active work
▒ = Incremental updates as agents finish
░ = Waiting / idle
```

## Dependency Map

```
Agent 1 (Web — W1-W9) ─────────────────────────────> Agent 4 (Docs)
                                                           ▲
Agent 2 (Flutter — F1-F9) ──> Agent 3 (S1-S4) ───────────┘
                                    ▲
Agent 3 (P1-P5) ───────────────────┘ (no dependency — runs in parallel)
```

**Execution order:**
1. **Agents 1 + 2 + 3** all start in parallel (zero file overlap for initial work)
2. **Agent 3** completes Feature 7 (P1-P5) independently
3. **Agent 3** starts Feature 9 (S1-S4) **after Agent 2 finishes** (both touch `providers.dart` and `create_class_screen.dart`)
4. **Agent 4** runs throughout, updates docs as each agent/phase completes, does final pass when all done

## Communication Flow

```
Agent 2 ──"F1-F9 done, providers.dart is yours"──> Agent 3
Agent 1 ──"W1-W9 done"──────────────────────────> Agent 4
Agent 2 ──"F1-F9 done"──────────────────────────> Agent 4
Agent 3 ──"P1-P5 done" (Feature 7)──────────────> Agent 4
Agent 3 ──"S1-S4 done" (Feature 9)──────────────> Agent 4
Any agent ──"issue/conflict found"───────────────> affected agent(s)
```

## File Ownership (No Conflicts)

| Directory / File | Owner | Feature(s) |
|---|---|---|
| **Web Files** | | |
| `quran_frontend/src/lib/supabase-api.ts` | Agent 1 | 1, 2 |
| `quran_frontend/src/api.ts` | Agent 1 | 1, 2 |
| `quran_frontend/src/pages/TeacherClasses.tsx` | Agent 1 | 3 |
| `quran_frontend/src/pages/Classroom.tsx` | Agent 1 | 2, 3 |
| **Flutter Files — Agent 2** | | |
| `quran_mobile/lib/data/repositories/class_repository.dart` | Agent 2 | 5 |
| `quran_mobile/lib/presentation/providers/providers.dart` | Agent 2 → Agent 3* | 4, 5 → 9 |
| `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` | Agent 2 | 4, 5 |
| `quran_mobile/lib/presentation/screens/classes/create_class_screen.dart` | Agent 2 → Agent 3* | 6 → 9 |
| `quran_mobile/lib/data/quran_data.dart` | Agent 2 | 6 |
| `quran_mobile/lib/core/services/report_helpers.dart` | Agent 2 | 6 |
| `quran_mobile/lib/presentation/screens/classes/report/report_panel.dart` | Agent 2 | 8 |
| **Flutter Files — Agent 3** | | |
| `quran_mobile/lib/core/services/arabic_text_utils.dart` | Agent 3 | 7 |
| `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` | Agent 3 | 7 |
| `quran_mobile/lib/data/models/suggested_portions.dart` | Agent 3 | 9 (new file) |
| **Doc Files** | | |
| `docs/Logs/2026-02-19-*` | Agent 4 | — |
| `docs/PROJECT_CHANGELOG.md` | Agent 4 | — |
| `CLAUDE.md` / `AGENTS.md` | Agent 4 | — |

*\* `providers.dart` and `create_class_screen.dart` ownership transfers from Agent 2 → Agent 3 after Agent 2 completes all F-tasks.*

## Task Count Per Agent

| Agent | Tasks | Features |
|---|---|---|
| 1 — Web Portions | 9 tasks (W1-W9) | 1, 2, 3 |
| 2 — Flutter Portions | 9 tasks (F1-F9) | 4, 5, 6, 8 |
| 3 — Flutter Polish | 9 tasks (P1-P5, S1-S4) | 7, then 9 |
| 4 — Docs | 7 tasks (D-A through D-G) | Continuous |

**Total: 34 tasks across 4 agents**
