import type { Log, StreakResult, ProgressResult } from './types';

function datesWithMark(goalId: string, logs: Log[]): Set<string> {
  const s = new Set<string>();
  for (const log of logs) {
    if (log.events.some((e) => e.goalId === goalId)) s.add(log.date);
  }
  return s;
}

function isoAddDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function getStreaks(goalId: string, logs: Log[], today?: string): StreakResult {
  const marked = datesWithMark(goalId, logs);
  if (marked.size === 0) return { current: 0, longest: 0, longestFrom: null, longestTo: null };

  const asOf = today || new Date().toISOString().slice(0, 10);
  let cur = 0;
  let check = marked.has(asOf) ? asOf : isoAddDays(asOf, -1);
  while (marked.has(check)) {
    cur++;
    check = isoAddDays(check, -1);
  }

  const dates = [...marked].sort();
  let best = 0, bestFrom = dates[0], bestTo = dates[0];
  let runLen = 1, runFrom = dates[0];

  for (let i = 1; i < dates.length; i++) {
    const prev = isoAddDays(dates[i - 1], 1);
    if (dates[i] === prev) {
      runLen++;
    } else {
      if (runLen > best) { best = runLen; bestFrom = runFrom; bestTo = dates[i - 1]; }
      runLen = 1;
      runFrom = dates[i];
    }
  }
  if (runLen > best) { best = runLen; bestFrom = runFrom; bestTo = dates[dates.length - 1]; }

  return { current: cur, longest: best, longestFrom: bestFrom, longestTo: bestTo };
}

export function getProgress(goalId: string, logs: Log[], dayTarget?: number): ProgressResult {
  const marked = datesWithMark(goalId, logs).size;
  if (!dayTarget) return { marked, target: null, percent: null };
  const percent = Math.round((marked / dayTarget) * 100);
  return { marked, target: dayTarget, percent };
}
