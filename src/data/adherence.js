import { getType } from "./goalTypes/index.js";
import { todayLocalISO } from "../lib/date.js";

function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function pickRound(goal, date) {
  for (const r of goal.rounds) {
    if (date >= r.startDate && date <= r.endDate) return r;
  }
  // If date is before all rounds, return null (no scoring)
  const minStart = goal.rounds.map(r => r.startDate).sort()[0];
  if (date < minStart) return null;
  // Otherwise (gap or after), use current round
  return goal.rounds[goal.currentRound - 1];
}

function eventsForGoalOnDay(logs, goalId, date) {
  const log = logs.find((l) => l.date === date);
  if (!log) return [];
  return log.events.filter((e) => e.goalId === goalId);
}

export function dailyAdherence({ goal, logs, from, to }) {
  const t = getType(goal.type);
  const out = {};
  let cur = from;
  while (cur <= to) {
    const round = pickRound(goal, cur);
    const events = eventsForGoalOnDay(logs, goal.id, cur);
    out[cur] = round
      ? t.adherenceForDay({ date: cur, currentRound: round, events })
      : "none";
    cur = addDays(cur, 1);
  }
  return out;
}

const WAKE_WEIGHT = { hit: 1, soft: 0.5, off: 0 };

export function momentum({ goal, logs, asOf }) {
  const end = asOf || todayLocalISO();
  const start = addDays(end, -13);
  const per = dailyAdherence({ goal, logs, from: start, to: end });
  const days = Object.values(per);
  if (goal.type === "wake") {
    let sum = 0, n = 0;
    for (const s of days) {
      if (s in WAKE_WEIGHT) { sum += WAKE_WEIGHT[s]; n++; }
    }
    return n === 0 ? 0 : sum / n;
  }
  // cadence
  let sum = 0;
  for (const s of days) {
    if (s === "hit" || s === "clean") sum += 1;
    // "off" and "none" contribute 0
  }
  return sum / 14;
}
