# Phase 6: Goal Lifecycle + Ceremonies — Deferred to v2

**Status:** Deferred. Phases 1–5 complete. v1 coding done as of 2026-08-11.

**Goal:** Let users actually use the seasons system from the Goal workspace. Close seasons intentionally, not just watch drift accumulate.

---

## Proposed scope

### 1. Goal state controls (Goal workspace)

Three new controls on the Goal workspace screen:

- **Pause → Dormant**: one-line note prompt, writes `state: dormant` + `dormantNote` to vault goal file via `store.saveGoal`.
- **Complete**: triggers a Result reflection prompt ("One line — what did this become?"), stores `retro`, writes `state: completed`. Resurfaces the stored `reward` field as part of the ceremony. Origin obligation #3.
- **Retire**: silent, immediate. No reflection required. Writes `state: retired`.

### 2. GoalCard visual states (already coded, just need data)

`GoalCard.jsx` already renders:
- Completed: `✓ became real · {month}` in category color + retro in quotes
- Dormant: `🌙 resting since {month}` in `dim` + dormantNote in quotes + opacity 0.78

These states are display-only today because nothing writes `retro` or `dormantNote`. The state controls above close that loop.

### 3. Wake from dormant

Goal workspace also needs a **Wake** control when `state === "dormant"` → sets back to `active`.

---

## Data fields needed

All already in `goalCodec.js`:
- `goal.state` — `active | drift | dormant | completed | retired`
- `goal.dormantNote` — string, written on pause
- `goal.retro` — string, written on complete

No schema changes. Pure UI + `saveGoal` calls.

---

## Rough task breakdown (for when this is planned)

1. Goal workspace state controls UI (Pause / Complete / Retire / Wake buttons, conditional on current state)
2. Dormant note modal (inline prompt, not a new route)
3. Complete ceremony modal (Result reflection + reward surfacing)
4. Wire `saveGoal` calls, refresh Goal screen + navigate home on retire/complete
5. Tests for each state transition
6. GoalCard manual smoke — verify completed/dormant visuals with real vault data

---

## Why deferred

- v1 is fully usable without state controls (goals can be observed, logged, and tracked)
- Seasons display (drift detection, dormant card rendering) already works read-only
- Phase 6 is pure UI with no new data model work — safe to pick up cold any time
- Habits year-strip and projects (also v2) need data model additions; do those in the same sprint if desired
