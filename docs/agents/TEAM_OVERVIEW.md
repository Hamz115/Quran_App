# Agent Team: Flutter Local Quran + Classes Revamp

**Date:** 2026-02-18
**Total Agents:** 4
**Plan:** `docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md`

## CRITICAL: Inter-Agent Communication

**All agents MUST talk to each other.** This is not optional. Use the task system messaging to:
- Report completion of phases with specific files created/modified
- Flag issues or deviations from the plan immediately
- Coordinate on shared files before making changes
- Ask other agents for status when waiting on a dependency

## Team Roster

| Agent | Name | Phases | Task File | Status |
|---|---|---|---|---|
| 1 | QPC Fonts | A | `docs/agents/AGENT_1_QPC_FONTS.md` | Pending |
| 2 | Foundation | B + C, then G | `docs/agents/AGENT_2_FOUNDATION.md` | Pending |
| 3 | UI Widgets | D + E | `docs/agents/AGENT_3_UI_WIDGETS.md` | Pending |
| 4 | Docs | Continuous | `docs/agents/AGENT_4_DOCS.md` | Pending |

## Execution Graph

```
Time ──────────────────────────────────────────────────────────────>

Agent 1 (QPC Fonts):    ██████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░
Agent 2 (Foundation):   ██████████████████░░░░░░░░░░░░██████████░░
                        ╰── B+C ──────╯              ╰── G ────╯
Agent 3 (UI Widgets):   ░░░░░░░░░░░░░░░░░░██████████████░░░░░░░░░
                                          ╰── D+E ──────╯
Agent 4 (Docs):         ░░░░░░░░░░░░░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒████████

█ = Active work
▒ = Incremental updates as agents finish
░ = Waiting / idle
```

## Dependency Map

```
Agent 1 (QPC Fonts — Phase A) ───────────────────────────────> Agent 4 (Docs)
                                                                    ▲
Agent 2 (Foundation — B+C) ──> Agent 3 (UI — D+E) ──> Agent 2 (G) ─┘
                          └────────────────────────────────────────┘
```

**Execution order:**
1. **Agents 1 + 2** start in parallel (zero file overlap)
2. **Agent 3** starts after Agent 2 finishes Phases B+C
3. **Agent 2** starts Phase G after Agent 3 finishes Phases D+E
4. **Agent 4** runs throughout, updates docs as each phase completes, does final pass after Agent 2 Phase G

## Communication Flow

```
Agent 2 ──"B+C done, here are exports"──> Agent 3
Agent 3 ──"D+E done, start Phase G"────> Agent 2
Agent 1 ──"Phase A done"───────────────> Agent 4
Agent 2 ──"B+C done" / "G done"────────> Agent 4
Agent 3 ──"D+E done"──────────────────> Agent 4
Any agent ──"issue/conflict found"─────> affected agent(s)
```

## File Ownership (No Conflicts)

| Directory / File | Owner | Phase |
|---|---|---|
| `quran_mobile/assets/fonts/qpc/` | Agent 1 | A |
| `quran_mobile/pubspec.yaml` | Agent 1 | A |
| `quran_mobile/lib/core/services/qpc_font_service.dart` | Agent 1 | A |
| `quran_mobile/lib/core/services/qpc_font_io_mobile.dart` | Agent 1 | A |
| `quran_mobile/lib/presentation/providers/quran_page_provider.dart` | Agent 1 | A |
| `quran_mobile/lib/data/models/student_report.dart` | Agent 2 | B |
| `quran_mobile/lib/data/models/report_filters.dart` | Agent 2 | B |
| `quran_mobile/lib/core/services/report_helpers.dart` | Agent 2 | B |
| `quran_mobile/lib/presentation/providers/report_provider.dart` | Agent 2 | C |
| `quran_mobile/lib/presentation/providers/providers.dart` (line ~65) | Agent 2 | C |
| `quran_mobile/lib/core/services/arabic_text_utils.dart` | Agent 2 | G |
| `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` | Agent 2 | G |
| `quran_mobile/lib/presentation/screens/classroom/word_popup.dart` | Agent 2 | G |
| `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` | Agent 2 | G |
| `quran_mobile/lib/presentation/screens/classes/report/*.dart` | Agent 3 | D |
| `quran_mobile/lib/presentation/screens/classes/classes_screen.dart` | Agent 3 | E |
| `docs/Technical Implementation Journey/Flutter_*.md` | Agent 4 | -- |
| `docs/Logs/2026-02-18-003-*.md` | Agent 4 | -- |
| `docs/PROJECT_CHANGELOG.md` | Agent 4 | -- |
| `CLAUDE.md` / `AGENTS.md` | Agent 4 | -- |

## Task Count Per Agent

| Agent | Tasks | Phases |
|---|---|---|
| 1 — QPC Fonts | 7 tasks (A1-A7) | A |
| 2 — Foundation | 11 tasks (B1-B4, C1-C2, G1-G5) | B+C, then G |
| 3 — UI Widgets | 10 tasks (D1-D6, E1-E4) | D+E |
| 4 — Docs | 12 tasks (D-A through D-J + D-G0, D-G0b) | Continuous |

**Total: 40 tasks across 4 agents**
