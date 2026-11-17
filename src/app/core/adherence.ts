import { getTypeByGoal } from './goalTypes/index';
import { todayLocalISO } from './date';
import type { Goal, Log, AdherenceStatus } from './types';

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function pickRound(goal: Goal, date: string) {
  for (const r of goal.rounds) {
    if (date >= r.startDate && date <= r.endDate) return r;
  }
  const minStart = goal.rounds.map((r) => r.startDate).sort()[0];
  if (date < minStart) return null;
  return goal.rounds[goal.currentRound - 1];
}

function eventsForGoalOnDay(logs: Log[], goalId: string, date: string) {
  const log = logs.find((l) => l.date === date);
  if (!log) return [];
  return log.events.filter((e) => e.goalId === goalId);
}

export function dailyAdherence({
  goal,
  logs,
  from,
  to,
}: {
  goal: Goal;
  logs: Log[];
  from: string;
  to: string;
}): Record<string, AdherenceStatus> {
  const t = getTypeByGoal(goal);
  const out: Record<string, AdherenceStatus> = {};
  let cur = from;
  while (cur <= to) {
    const round = pickRound(goal, cur);
    const events = eventsForGoalOnDay(logs, goal.id, cur);
    if (round) {
      out[cur] = (t as { adherenceForDay: (args: { date: string; currentRound: typeof round; events: typeof events }) => AdherenceStatus }).adherenceForDay({ date: cur, currentRound: round, events });
    } else {
      out[cur] = events.length > 0 ? 'hit' : 'none';
    }
    cur = addDays(cur, 1);
  }
  return out;
}

const WAKE_WEIGHT: Record<string, number> = { hit: 1, soft: 0.5, off: 0 };

export function momentum({ goal, logs, asOf }: { goal: Goal; logs: Log[]; asOf?: string }): number {
  const end = asOf || todayLocalISO();
  const start = addDays(end, -13);
  const per = dailyAdherence({ goal, logs, from: start, to: end });
  const days = Object.values(per);
  if (typeof goal.baseline === 'string') {
    let sum = 0, n = 0;
    for (const s of days) {
      if (s in WAKE_WEIGHT) { sum += WAKE_WEIGHT[s]; n++; }
    }
    return n === 0 ? 0 : sum / n;
  }
  if (goal.baseline == null) {
    let sum = 0;
    for (const s of days) if (s === 'hit') sum += 1;
    return sum / 14;
  }
  let sum = 0;
  for (const s of days) {
    if (s === 'hit' || s === 'clean') sum += 1;
  }
  return sum / 14;
}
