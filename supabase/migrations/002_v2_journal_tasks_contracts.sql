-- Becoming v2 — journal entries, tasks, contracts, day_target on goals
-- Run in: Supabase Dashboard → SQL Editor

-- ── Goals: add day_target ─────────────────────────────────────────────────
ALTER TABLE goals ADD COLUMN IF NOT EXISTS day_target INTEGER;

-- ── Journal entries ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_entries (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE         NOT NULL,
  text        TEXT         NOT NULL DEFAULT '',
  prompt      TEXT         CHECK (prompt IN ('highlight', 'remember')),
  goal_ids    TEXT[]       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  edited_at   TIMESTAMPTZ
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own journal entries" ON journal_entries
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS journal_entries_user_date ON journal_entries (user_id, date DESC);

-- ── Tasks ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT         NOT NULL,
  date         DATE         NOT NULL,
  "order"      INTEGER      NOT NULL DEFAULT 0,
  done         BOOLEAN      NOT NULL DEFAULT FALSE,
  done_at      TIMESTAMPTZ,
  due_time     TEXT,
  goal_id      TEXT,
  carried_from DATE
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own tasks" ON tasks
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS tasks_user_date ON tasks (user_id, date);

-- ── Contracts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contracts (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id        TEXT         NOT NULL,
  change         TEXT         NOT NULL DEFAULT '',
  terms          TEXT         NOT NULL DEFAULT '',
  signature_svg  TEXT,
  signed_at      TIMESTAMPTZ,
  retired_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own contracts" ON contracts
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS contracts_user_goal ON contracts (user_id, goal_id);
