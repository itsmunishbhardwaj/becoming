# Animation Plans

Self-contained implementation plans from the `/improve-animations` audit pass.
Each plan can be executed independently by any agent with zero prior context.

## Status

| # | Plan | Severity | Status | Depends on |
|---|------|----------|--------|------------|
| 001 | [Onboard chat bubbles animate in sequentially](001-onboard-chat-bubble-entry.md) | HIGH | DONE | — |
| 002 | [Year view tooltip fades + scales in from bottom](002-year-tooltip-fade-scale.md) | MEDIUM | DONE | — |
| 003 | [Goal color picker expands with height + opacity spring](003-goal-color-picker-expand.md) | MEDIUM | DONE | — |
| 004 | [Day view delete button requires hold-to-confirm](004-day-delete-hold-to-confirm.md) | HIGH | DONE | — |
| 005 | [Day empty state fades in on mount](005-day-empty-state-fade.md) | LOW | DONE | — |

## Recommended execution order

1. **001** — Highest impact. First impression screen. 8-line change, zero risk.
2. **004** — Safety fix. Single-tap deletion is a product bug, not a polish issue.
3. **002** — Jarring tooltip pop-in is the most noticeable remaining rough edge.
4. **003** — Goal color picker expand. Small scope, focused improvement.
5. **005** — Delight polish. Lowest risk, last to execute.

Plans 001–005 have no dependencies on each other. They can be executed in any order
or in parallel on separate worktrees.

## Conventions used across all plans

- Import: `import { AnimatePresence, motion } from "motion/react"` — matches `src/components/LogSheet.jsx:2`.
- Spring config: `{ type: "spring", duration: 0.3, bounce: 0 }` — critically damped, no overshoot.
- Easing: `cubic-bezier(0.23, 1, 0.32, 1)` = `--ease-out` token from `src/styles.css`.
- `@starting-style` for CSS-only entry fades — matches InsightCard pattern in `src/styles.css`.
- All plans stay within their named file. No cross-file refactoring.

## Marking done

When a plan is executed, update the Status column: `TODO` → `DONE`.
