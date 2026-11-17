import { isScheduledDay } from './goalTypes/cadence';
import type { Goal } from './types';

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function projectedDates({ goal, from, to }: { goal: Goal; from: string; to: string }): string[] {
  const isCadence = goal.baseline != null && typeof goal.baseline === 'object' && 'intervalDays' in goal.baseline;
  const dates: string[] = [];
  let cur = from;
  while (cur <= to) {
    if (isCadence) {
      const round = (goal.rounds || []).find((r) => cur >= r.startDate && cur <= r.endDate);
      if (round && isScheduledDay({ date: cur, currentRound: round })) dates.push(cur);
    } else {
      dates.push(cur);
    }
    cur = addDays(cur, 1);
  }
  return dates;
}
