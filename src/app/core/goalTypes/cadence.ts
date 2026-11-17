import type { Round, LogEvent, AdherenceStatus } from '../types';

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const MIN_DAYS_PER_ROUND = 14;

export function safeRateCeiling(baseline: { intervalDays: number }, target: { intervalDays: number }): { minDays: number } {
  const steps = Math.max(0, target.intervalDays - baseline.intervalDays);
  return { minDays: steps * MIN_DAYS_PER_ROUND };
}

export function buildRounds(
  baseline: { intervalDays: number },
  target: { intervalDays: number },
  startDate: string,
  endDate: string,
): Round[] {
  const b = baseline.intervalDays;
  const t = target.intervalDays;
  const steps = Math.max(1, t - b);
  const totalDays = Math.max(1, daysBetween(startDate, endDate));
  const perRound = Math.max(MIN_DAYS_PER_ROUND, Math.floor(totalDays / steps));
  const rounds: Round[] = [];
  for (let i = 0; i < steps; i++) {
    const start = addDays(startDate, i * perRound);
    const end = i === steps - 1 ? endDate : addDays(startDate, (i + 1) * perRound - 1);
    rounds.push({ n: i + 1, targetValue: { intervalDays: b + i + 1 }, startDate: start, endDate: end });
  }
  return rounds;
}

export function isScheduledDay({ date, currentRound }: { date: string; currentRound: Round }): boolean {
  const dayIdx = daysBetween(currentRound.startDate, date);
  const target = currentRound.targetValue as { intervalDays: number };
  return dayIdx >= 0 && dayIdx % target.intervalDays === 0;
}

export function adherenceForDay({
  date,
  currentRound,
  events,
}: {
  date: string;
  currentRound: Round;
  events: LogEvent[];
}): AdherenceStatus {
  const isGreen = isScheduledDay({ date, currentRound });
  const hasSession = events.some((e) => e.verb === 'session');
  if (isGreen) return 'hit';
  if (hasSession) return 'off';
  return 'clean';
}
