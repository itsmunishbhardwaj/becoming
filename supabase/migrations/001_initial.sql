-- Becoming — initial schema
-- Run in: Supabase Dashboard → SQL Editor

-- ── Goals ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id              TEXT         NOT NULL,
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT         NOT NULL DEFAULT '',
  cat             TEXT         NOT NULL DEFAULT '',
  color           TEXT,
  type            TEXT         NOT NULL DEFAULT 'tracker',
  state           TEXT         NOT NULL DEFAULT 'active',
  baseline        JSONB,
  target          JSONB,
  end_date        DATE,
  current_round   INT          NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ambition        TEXT         NOT NULL DEFAULT '',
  rounds          JSONB        NOT NULL DEFAULT '[]'::jsonb,
  how_we_get_there TEXT        NOT NULL DEFAULT '',
  indicators      JSONB        NOT NULL DEFAULT '{"right":[],"wrong":[],"stall":[]}'::jsonb,
  PRIMARY KEY (user_id, id)
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own goals" ON goals
  FOR ALL USING (user_id = auth.uid());

-- ── Log events ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS log_events (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            DATE         NOT NULL,
  goal_id         TEXT         NOT NULL,
  verb            TEXT         NOT NULL,
  payload         TEXT         NOT NULL DEFAULT '',
  time            TEXT,
  duration_min    INT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date, goal_id, verb, payload)
);

ALTER TABLE log_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own log events" ON log_events
  FOR ALL USING (user_id = auth.uid());

-- ── Log notes ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS log_notes (
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            DATE         NOT NULL,
  goal_id         TEXT         NOT NULL,
  text            TEXT         NOT NULL DEFAULT '',
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, date, goal_id)
);

ALTER TABLE log_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own log notes" ON log_notes
  FOR ALL USING (user_id = auth.uid());

-- ── Insights dismissed ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insights_dismissed (
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_id      TEXT         NOT NULL,
  dismissed_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, insight_id)
);

ALTER TABLE insights_dismissed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own dismissed insights" ON insights_dismissed
  FOR ALL USING (user_id = auth.uid());
