import type { Round, LogEvent, AdherenceStatus } from '../types';

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fromMin(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const STEP_MIN = 30;
const MIN_DAYS_PER_STEP = 10;

export function safeRateCeiling(baseline: string, target: string): { minDays: number } {
  const steps = Math.max(1, Math.round(Math.abs(toMin(baseline) - toMin(target)) / STEP_MIN));
  return { minDays: steps * MIN_DAYS_PER_STEP };
}

export function buildRounds(baseline: string, target: string, startDate: string, endDate: string): Round[] {
  const b = toMin(baseline);
  const t = toMin(target);
  const totalSteps = Math.max(1, Math.round((b - t) / STEP_MIN));
  const totalDays = Math.max(1, daysBetween(startDate, endDate));
  const perRound = Math.max(10, Math.floor(totalDays / totalSteps));
  const rounds: Round[] = [];
  for (let i = 0; i < totalSteps; i++) {
    const start = addDays(startDate, i * perRound);
    const end = i === totalSteps - 1 ? endDate : addDays(startDate, (i + 1) * perRound - 1);
    rounds.push({ n: i + 1, targetValue: fromMin(b - STEP_MIN * (i + 1)), startDate: start, endDate: end });
  }
  return rounds;
}

export function adherenceForDay({
  currentRound,
  events,
}: {
  date: string;
  currentRound: Round;
  events: LogEvent[];
}): AdherenceStatus {
  const wake = events.find((e) => e.verb === 'wake' && e.time);
  if (!wake) return 'none';
  const delta = toMin(wake.time!) - toMin(currentRound.targetValue as string);
  if (delta <= 15) return 'hit';
  if (delta <= 45) return 'soft';
  return 'off';
}
