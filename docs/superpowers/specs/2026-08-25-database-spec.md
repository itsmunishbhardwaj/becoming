# Database Spec — Becoming (Supabase)

**Part of:** Supabase + Next.js migration  
**Depends on:** `2026-08-23-app-reference.md`  
**Status:** Draft — awaiting approval before any schema is created

---

## 1. First-principles reasoning

Three real entities drive everything in the app:

1. **A goal** — named intention with type, state, target, rounds, rich text
2. **A tracker log event** — "I did verb X toward goal Y on date Z"
3. **A habit log entry** — "I kept / missed habit goal Y on date Z" (boolean)

Everything else is computed from these:
- Adherence → computed from log events + goal rounds in JS
- Momentum → computed from adherence in JS
- Drift state → computed from last-log date, never stored
- Insights → generated from goals + logs in JS, dismissed state stored

**Log notes** (freeform text per goal per day) are a fourth persist unit — not
events, not goals, but their own table.

**Insights dismissed** are bookkeeping — just a key + yes/no response per user.

**Rounds** have individual identity (you reference "round 2", update one round's
dates, query which is active) — separate table from goals.

---

## 2. Tables

### `goals`

The primary object. One row per goal per user.

```sql
CREATE TABLE goals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  name                text NOT NULL,
  cat                 text NOT NULL,  -- ai|career|health|relationships|reading|creativity|finance
  color               text,           -- hex override; NULL = use CATS[cat] default
  type                text NOT NULL,  -- tracker | habit

  -- State machine
  state               text NOT NULL DEFAULT 'active',
  -- active | drift | dormant | completed | retired
  -- drift is COMPUTED, not written here; stored only when user confirms dormancy
  dormant_note        text,           -- filled when state → dormant
  retro               text,           -- filled when state → completed | retired

  -- Tracker fields (NULL for habit goals)
  baseline            jsonb,          -- shape encodes behavior: "HH:MM" | {intervalDays:N} | null
  target              jsonb,          -- same shape as baseline
  end_date            date,
  current_round       int NOT NULL DEFAULT 1,

  -- Rich text
  ambition            text NOT NULL DEFAULT '',
  how_we_get_there    text NOT NULL DEFAULT '',

  -- Indicators (tracker goals only; habit goals leave these empty)
  indicators_right    text[] NOT NULL DEFAULT '{}',
  indicators_wrong    text[] NOT NULL DEFAULT '{}',
  indicators_stall    text[] NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at          timestamptz NOT NULL DEFAULT now(),

  -- Migration only — original vault slug; DROP this column after migration verified
  vault_id            text,

  CONSTRAINT goals_type_check
    CHECK (type IN ('tracker', 'habit')),
  CONSTRAINT goals_cat_check
    CHECK (cat IN ('ai','career','health','relationships','reading','creativity','finance')),
  CONSTRAINT goals_state_check
    CHECK (state IN ('active', 'drift', 'dormant', 'completed', 'retired'))
);
```

**Design notes:**
- `drift` can appear in `state` only transiently if needed for client sync, but
  is primarily a computed property. The constraint allows it for flexibility.
- Adherence behavior is inferred from `baseline` shape in JS — no variant column needed:
  `"HH:MM"` string → wake logic; `{intervalDays}` object → cadence logic; `null` → count logic.
- `baseline`/`target`/`end_date`/`current_round`/`indicators_*` are NULL/empty
  for habit goals — habits have no target or schedule beyond "every day."

---

### `rounds`

Time-boxed sub-targets within a tracker goal. Computed by goal type from
baseline/target/endDate — never manually created by the user.

```sql
CREATE TABLE rounds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id       uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  n             int NOT NULL,           -- 1-based round index
  target_value  jsonb,                  -- same shape as goal.target; null for count variant
  start_date    date NOT NULL,
  end_date      date NOT NULL,

  UNIQUE (goal_id, n)
);
```

**Design notes:**
- Habit goals have no rounds. Constraint enforced at application layer
  (store.js never inserts rounds for habit goals).
- `target_value` shape matches `goal.target` — same three shapes:
  `"HH:MM"` string, `{ "intervalDays": N }`, or `null`.

---

### `log_events`

Activity entries for tracker goals. Every tap, session, or log line becomes a row.

```sql
CREATE TABLE log_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id       uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  date          date NOT NULL,
  verb          text NOT NULL,   -- wake | session | done | any custom verb
  time          text,            -- HH:MM; wake and session only
  duration_min  int,             -- session only
  payload       text,            -- catch-all for unstructured verb data
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

**Design notes:**
- Habit goals do NOT use this table. They use `habit_logs`.
- `verb` is open text — the app currently uses wake/session/done; future verbs
  are additive without a schema change.
- `(user_id, goal_id, date, verb, time, payload)` uniqueness is enforced at the
  application layer (appendLog idempotency check), not DB level — duplicate
  prevention via re-read before write, matching current vault behavior.

---

### `habit_logs`

Binary daily record for habit goals. One row = one kept day. Missing row = missed day.

```sql
CREATE TABLE habit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id       uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  date          date NOT NULL,
  kept          bool NOT NULL DEFAULT true,

  UNIQUE (user_id, goal_id, date)
);
```

**Design notes:**
- Separate from `log_events` because habit days are boolean, not verb-based.
  Query pattern is different: year strip needs `SELECT date WHERE kept = true`
  across a full year; streak needs the longest consecutive kept sequence.
- `kept = false` rows are written when the user explicitly unmarks a day (tap
  again on Year). Missing rows and `kept = false` rows are both "missed" — the
  UI treats them identically. Explicit false rows exist only when the user has
  previously marked then unmarked.

---

### `log_notes`

Freeform text attached to a goal on a specific date. Set from the Day screen.

```sql
CREATE TABLE log_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id       uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  date          date NOT NULL,
  text          text NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, goal_id, date)
);
```

---

### `insights_dismissed`

Tracks which AI insight questions the user has already answered. Prevents
the same question from resurfacing.

```sql
CREATE TABLE insights_dismissed (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_key   text NOT NULL,
  -- Format: "drift-{goalId}", "wrong-echo-{goalId}-{weekStartISO}",
  --         "low-momentum-{goalId}"
  response      text NOT NULL CHECK (response IN ('yes', 'no')),
  dismissed_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, insight_key)
);
```

---

## 3. Indexes

```sql
-- Goals — primary access pattern: all goals for a user
CREATE INDEX goals_user_id ON goals(user_id);
CREATE INDEX goals_user_type ON goals(user_id, type);   -- filter tracker vs habit

-- Log events — adherence computation: range queries by date
CREATE INDEX log_events_user_date ON log_events(user_id, date);
CREATE INDEX log_events_goal_date ON log_events(goal_id, date);

-- Habit logs — year strip and streak computation
CREATE INDEX habit_logs_goal_date ON habit_logs(goal_id, date);
CREATE INDEX habit_logs_user_date ON habit_logs(user_id, date);

-- Rounds — always accessed by goal
CREATE INDEX rounds_goal_id ON rounds(goal_id);

-- Log notes — Day screen access: one day's notes across all goals
CREATE INDEX log_notes_user_date ON log_notes(user_id, date);
CREATE INDEX log_notes_goal_date ON log_notes(goal_id, date);

-- Insights — check if a specific key is already dismissed
CREATE INDEX insights_user_key ON insights_dismissed(user_id, insight_key);
```

---

## 4. Row Level Security

All tables are user-isolated. Every query from the client is automatically
filtered to the authenticated user's rows.

```sql
ALTER TABLE goals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds             ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights_dismissed ENABLE ROW LEVEL SECURITY;

-- Goals: full CRUD for own rows
CREATE POLICY "users own their goals"
  ON goals FOR ALL
  USING (auth.uid() = user_id);

-- Rounds: accessible when you own the parent goal
CREATE POLICY "users own their rounds"
  ON rounds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = rounds.goal_id
        AND goals.user_id = auth.uid()
    )
  );

-- Log events
CREATE POLICY "users own their log events"
  ON log_events FOR ALL
  USING (auth.uid() = user_id);

-- Habit logs
CREATE POLICY "users own their habit logs"
  ON habit_logs FOR ALL
  USING (auth.uid() = user_id);

-- Log notes
CREATE POLICY "users own their log notes"
  ON log_notes FOR ALL
  USING (auth.uid() = user_id);

-- Insights dismissed
CREATE POLICY "users own their dismissed insights"
  ON insights_dismissed FOR ALL
  USING (auth.uid() = user_id);
```

---

## 5. Auth

Managed entirely by Supabase Auth. No custom `users` table needed —
`auth.users` is the source of truth.

**Provider:** Google OAuth only (for web launch).  
**Sign in with Apple:** deferred until SwiftUI iOS app.

Client setup:
```js
// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
```

Server-side (API routes, middleware):
```js
import { createServerClient } from '@supabase/ssr'
// one client per request; reads cookies for session
```

---

## 6. Relationship diagram

```
auth.users
  │ user_id
  ├── goals ──────────────── rounds (goal_id)
  │     │ goal_id
  │     ├── log_events
  │     ├── habit_logs
  │     └── log_notes
  └── insights_dismissed
```

---

## 7. What is NOT in this schema

**Computed and never stored:**
- Adherence status per day (hit/soft/off/clean/none) — computed in JS from log_events + rounds
- Momentum score — computed in JS from adherence
- Drift state — computed from last log date; only written to goals.state if user confirms dormancy
- Insight questions — generated dynamically from goals + logs in JS

**Deferred to v2:**
- `people` — connections/relationships referenced in activity notes
- `reflections` — retro ceremonies, weekly/yearly reviews
- `projects` — sub-targets within a goal with milestone tracking

**Never in this schema:**
- Anything that requires filesystem access (vault is deleted as a data source)

---

## 8. Vault migration script (one-time)

Before the vault backend is deleted, a migration script must:

1. Read all goal markdown files from `vault/goals/*.md` via vault REST API
2. Parse each with `goalCodec.parseGoal()` — codec already normalizes stored `wake`/`cadence`/`simple` to `tracker`
3. Insert into `goals` with a generated UUID, storing the original slug in `vault_id`
4. Insert all rounds from `goal.rounds` into `rounds`
5. Read all daily log files from `vault/Daily/*.md` via vault REST API
6. Parse each with `logCodec.parseLog()`
7. Resolve each event's `goalId` (slug) → the new UUID via `vault_id` lookup
8. Insert events into `log_events`
9. Insert notes into `log_notes`
10. Verify row counts match expectation before proceeding
11. Drop `vault_id` column in a follow-on migration after verification

**Habit goals:** none exist in the current vault (the type is new), so no habit_logs
migration is needed.

---

## 9. Open questions

None blocking the schema. The following are deferred decisions:

- **Numeric logging:** if a future tracker needs to log a scalar value
  (e.g. weight in kg, pages read), add `value numeric` to `log_events`. Nullable;
  existing rows unaffected. No schema change needed now.
- **Projects table:** deferred to when Goal workspace projects section is built.
  Will be `projects(id, goal_id, user_id, name, created_at)` + milestone tracking.
