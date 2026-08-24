# Becoming — App Reference

**Purpose:** Ground truth for what the app is, what it can do, and how it is
designed. Written before the Supabase migration to establish shared vocabulary.
Correct this doc before correcting the code — it is the spec, not the other
way around.

**Last updated:** 2026-08-23

---

## 1. What it is

A visual operating system for a life, organized by **purpose** not time.

The north star for every decision:
> "Does this help the user understand who they are becoming?"

**It is not:** a calendar app, habit tracker, task manager, or journal.
The calendar is one visualization — never the primary interface.

**Mental model:**
```
Life → Identity → Goals → Projects → Activities → Calendar
```

Everything exists to support goals. The calendar shows *when* progress happened.

---

## 2. Goal types

Goals are the primary object. Every goal has a **type** that determines how
progress is measured and how the app computes adherence.

### 2a. Current implementation (code)

Three types exist in `src/data/goalTypes/`:

| Type | Intent | Baseline/Target | Event verb | Adherence states |
|------|--------|-----------------|------------|-----------------|
| `wake` | Shift wake time earlier | `"HH:MM"` string | `wake` (with time) | hit / soft / off / none |
| `cadence` | Increase a practice's interval | `{ intervalDays: N }` | `session` (with optional duration) | hit / off / clean |
| `simple` | Mark days worked, no schedule | `null` / `null` | `done` | hit / none |

**wake:** Rounds split the baseline→target gap into 30-minute steps. Adherence
is time-based: within ±15min = hit, ±45min = soft, beyond = off.

**cadence:** Rounds widen the interval step by step (e.g. daily → weekly).
Scheduled days (green days) are `hit` regardless of whether a session was
logged — the plan is the commitment. Off-schedule days with a logged session
are `off` (you broke the rest). Off-schedule days with no session are `clean`.

**simple:** One round, entire span. Any logged event = `hit`. No schedule,
no frequency target. Created via QuickCreate (not Balboa Breakdown).

### 2b. Confirmed redesign (migration target)

**Two types only: `tracker` and `habit`.** The existing `wake`/`cadence`/`simple`
types collapse into `tracker`. This is locked for the Supabase migration.

| Type | Core idea | Lives on Home as |
|------|-----------|-----------------|
| **tracker** | Moving toward a measurable target. Has rounds, baseline, target, adherence scoring. Replaces wake + cadence + simple. | Own goal card |
| **habit** | Daily binary practice. Kept or missed, every day. Streak, 365-cell year strip. No rounds, no target. New type. | Own goal card |

Adherence behavior for tracker goals is inferred from the shape of `baseline` in JS —
no stored variant needed. `"HH:MM"` → wake logic; `{intervalDays}` → cadence logic;
`null` → count/mark logic. Two types only: tracker and habit.

---

## 3. Goal fields

```
id            string      — slug (e.g. "read-50-books"); becomes UUID in Supabase
name          string
cat           string      — ai | career | health | relationships | reading | creativity | finance
color         string?     — hex override (optional; defaults to CATS[cat])
type          string      — wake | cadence | simple (→ tracker | habit post-redesign)
state         string      — active | drift | dormant | completed | retired
baseline      any         — HH:MM (wake), { intervalDays } (cadence), null (simple)
target        any         — same shape as baseline
endDate       string      — ISO date
currentRound  number
createdAt     string      — ISO date
ambition      string      — user's own words; never normalized or paraphrased
howWeGetThere string      — strategy; free text
rounds        Round[]     — computed by goal type; see §5
indicators    Indicators  — right / wrong / stall signal lists; see §6
```

---

## 4. Goal states (Seasons)

Goals are never simply "on" or "abandoned." State machine:

```
active ──────────────────────────────────────────────────► completed
  │                                                          │
  │  (computed, not stored)                                  ▼
  ├──── drift ──► (user confirms still active)          retired
  │
  └──► dormant ──► active  (user wakes it)
        │
        └──► retired
```

| State | Meaning | UI behavior |
|-------|---------|-------------|
| `active` | In pursuit | Normal orb, momentum bar, insights |
| `drift` | Unintentionally neglected (≥7 days no log) | Rendered same as active; one gentle insight question |
| `dormant` | Intentionally paused | Orb still + 0.78 opacity, no momentum bar, no insights, note preserved |
| `completed` | Achieved; retro written | "✓ became real · {month}", retro shown in italic |
| `retired` | No longer part of who you're becoming | Same treatment as completed |

**Drift is computed**, never written to the goal. The app observes the gap and
surfaces a single question. If the user confirms dormancy, state is written as
`dormant` with a `dormantNote`. Drift is never shown as a failure — it is
rendered in `PAPER.whisper` (warm sand), the quietest signal the app owns.

---

## 5. Rounds

A round is a time-boxed sub-target within a goal. Rounds are computed
deterministically from baseline, target, and endDate — never via LLM.

```
Round {
  n            number   — round index (1-based)
  targetValue  any      — same shape as goal target; null for simple
  startDate    string   — ISO date
  endDate      string   — ISO date
}
```

**wake:** 30-minute steps from baseline toward target. Minimum 10 days per round.

**cadence:** +1 day interval per step (daily → every-2-days → … → weekly).
Minimum 14 days per round.

**simple:** One round, same span as the goal. No progression.

`goal.currentRound` points to the active round index.

---

## 6. Indicators

Per-goal signal lists, written during onboarding, edited by the user:

```
indicators {
  right  string[]   — signs you're on track
  wrong  string[]   — warning signals
  stall  string[]   — signs of stall (neither progress nor obvious failure)
}
```

Used by the Insight engine to generate `wrong-echo` questions when the user
has multiple `off`/`soft` days in a week. Not used for adherence computation.

---

## 7. Log events

Every activity is a **log event**: a verb + optional payload + goal link, on a date.

```
LogEvent {
  verb        string    — "wake" | "session" | "done" | any custom verb
  goalId      string    — links to a goal
  time        string?   — HH:MM; wake and session only
  durationMin number?   — session only
  payload     string?   — catch-all for verbs that don't parse into structured fields
}
```

Serialized in vault as:
```
- wake 06:14 → [[Read 50 Books]]
- session 07:30 · 45min → [[Health]]
- done → [[Read 50 Books]]
```

**Log notes** are separate: freeform text per-goal per-date, stored alongside events.

```
notes: { [goalId]: string }
```

---

## 8. Adherence & momentum

Computed in `src/data/adherence.js` from goals + logs. Never stored.

### dailyAdherence

For each goal, for each day in range, returns one status:

| Status | Meaning |
|--------|---------|
| `hit` | On target (all types) |
| `soft` | Wake within ±45min but not ±15min |
| `off` | Off-schedule session logged (cadence), or wake too late |
| `clean` | Non-scheduled cadence day with no session (good) |
| `none` | No event (wake/simple) |

### momentum

Rolling 14-day score (0–1):

| Type | Formula |
|------|---------|
| wake | Average of `{ hit:1, soft:0.5, off:0 }` per day |
| simple | hit-count / 14 |
| cadence | (hit + clean) / 14 |

Used for: orb size + breathing speed, momentum bar width, insight triggers.

---

## 9. Insights

Generated dynamically in `src/data/insights.js`. Never stored (except dismissals).
Each insight is a question — never a declaration.

| Kind | Trigger | Insight key pattern |
|------|---------|---------------------|
| `drift` | No logs in ≥7 days (active goals only) | `drift-{goalId}` |
| `wrong-echo` | ≥3 off/soft days in last 7 | `wrong-echo-{goalId}-{weekStart}` |
| `low-momentum` | momentum < 0.25 AND ≥3 logs in last 30 days | `low-momentum-{goalId}` |

Each insight has:
- `kicker` — category label (e.g. "A QUIET ONE")
- `text` — the question body
- `yes` / `no` — equal-weight response buttons

Dismissed insights (user tapped yes or no) are stored in localStorage today;
will move to `insights_dismissed` table in Supabase.

---

## 10. Screens

| Route | Screen | Creates | Primary reads |
|-------|--------|---------|---------------|
| `/` | Home | — | goals, logs (14d), insights |
| `/year` | Year | — | goals, logs (full year) |
| `/month/:yyyymm` | Month | — | goals, logs (month) |
| `/week/:yyyymmdd` | Week | — | goals, logs (week) |
| `/day/:date` | Day | log events, log notes | goals, single-day log |
| `/goal/:id` | Goal workspace | color edits | goal, 365-day logs |
| `/onboard` | Balboa Breakdown | goals (wake/cadence) | draft in localStorage |
| `/create` | QuickCreate | goals (simple) | existing goals (color check) |

### Home
Opens into Life. Shows: insights question (if any), goal cards with orbs +
momentum bars + headlines, footer zoom link.

### Year
12-month calendar. Pen chips select the active goal. Tap days to mark/unmark.
Cadence green days render as full blobs regardless of log state — the schedule
is the plan.

### Goal workspace
Per-goal detail: ambition, period chip, habits strip (planned), projects
(planned), recent activity, 365-day calendar link.

### Day
List of events for the day. Per-goal quick-add and delete. Per-goal note text.

### Onboard (Balboa Breakdown)
Multi-turn guided creation for wake and cadence goals. Turns: ambition →
type → baseline → target → endDate → roundsPreview → indicators → confirm.
LLM optionally rewrites non-round responses (falls back to scripted).

### QuickCreate
Fast path for simple goals: name, category, endDate, optional ambition.
No type selection, no indicators.

---

## 11. Design system

**One paper theme.** `PAPER.bg` = `#FBFBF9`. No dark mode.

**No red.** `PAPER.whisper` (`#B9A87F`) is the loudest signal the app owns — used
only for drift.

**Accumulation framing everywhere.** Every number is earned, never a deficit.
"148 problems solved" not "67% complete." Percentage may appear only as a bar
width — never as rendered text.

**Category color = identity.** One hue per goal, identical across every surface
(orb, bar, blob, chip, strip). Defined in `CATS` in `tokens.js`. Never
hardcoded. Never reassigned without color-customization.

**Serif = who you are. Sans = what you did.** Goal names, ambitions, headlines
in Fraunces. All numbers, labels, UI text in Inter.

**Irregular shapes.** Cards alternate `RADIUS.r1` / `RADIUS.r2`. Day marks are
rotated ellipses. Orbs are blobs. Nothing is a plain rectangle.

**Only living things move.** Active orbs breathe (7s morph). Dormant orbs are
still. All motion disabled under `prefers-reduced-motion`.

**Empty is dignified.** Unmarked day = 2px faint dot at 50% opacity.
Empty day detail = "A quiet day. Rest counts too."

**AI insights are questions with equal-weight answers.** Both yes/no buttons
share one style. Rejecting costs nothing visually.

**CATS palette:**
| Key | Color | Hex |
|-----|-------|-----|
| ai | Periwinkle | #A8BEE8 |
| career | Dusty rose | #E9B3B7 |
| health | Sage | #A9CEBB |
| relationships | Peach | #EBC3A0 |
| reading | Lavender | #C5B5E3 |
| creativity | Butter | #E5D6A1 |
| finance | Seafoam | #A7D8D5 |

---

## 12. Data persistence (current)

All reads/writes go through `src/data/store.js` — the only file that knows
where data lives. This is the migration boundary.

**Current backend:** Obsidian vault in iCloud Drive, accessed via Local REST API
plugin at `https://127.0.0.1:27124`. Vite dev server proxies requests via
`vaultMiddleware.js`.

**Store API (stable — this interface survives the Supabase migration):**
```js
listGoals()                           → Goal[]
getGoal(id)                           → Goal | null
saveGoal(goal)                        → void
readLog(date)                         → Log | null
readLogsInRange({ from, to })         → Log[]
appendLog(date, event)                → void
deleteLogEvent(date, event)           → void
saveNote(date, goalId, text)          → void
```

**Post-migration:** `vaultMiddleware.js` deleted. `store.js` gets a
`supabaseStore` implementation behind the same interface. One file changes.

---

## 13. Open questions (to resolve in migration spec)

1. **Tracker vs Habit as goal types:** Do these replace wake/cadence/simple
   entirely, or does "tracker" encompass wake + cadence, and "habit" is a new
   type added alongside them?

2. **Habit sub-entities vs Habit goal type:** The ui-spec shows `habits[]` as
   sub-entities on the Goal workspace (named behaviors like "sleep before
   midnight" attached to a Health goal). Are these the same concept as a
   top-level "habit goal," or different things?

3. **Numeric trackers:** Does "tracker" include logging a scalar value (e.g.
   weight, pages read)? The current `log_event.durationMin` is the only numeric
   field. If trackers need arbitrary numeric logging, the schema needs a
   `tracker_entries` table.

4. **Vault migration script:** One-time import of existing goals + logs from
   vault markdown into Supabase. Needs to run before vault backend is deleted.
