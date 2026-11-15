-- Becoming — goals.goal_time (HH:MM, 24h local time)
-- Run in: Supabase Dashboard → SQL Editor

ALTER TABLE goals ADD COLUMN IF NOT EXISTS goal_time TEXT;
