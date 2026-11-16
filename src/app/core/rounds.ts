import type { Goal, Round } from './types';

export function computeCurrentRound(goal: Goal, today: string): number {
  const rounds = goal.rounds || [];
  if (rounds.length === 0) return 1;
  for (const r of rounds) {
    if (today >= r.startDate && today <= r.endDate) return r.n;
  }
  const first = rounds[0];
  if (today < first.startDate) return first.n;
  return rounds[rounds.length - 1].n;
}

export function advanceGoal(goal: Goal, today: string): { goal: Goal; changed: boolean } {
  const next = computeCurrentRound(goal, today);
  if (next <= goal.currentRound) return { goal, changed: false };
  return { goal: { ...goal, currentRound: next }, changed: true };
}
