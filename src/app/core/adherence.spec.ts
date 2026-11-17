import { describe, it, expect } from 'vitest';
import { dailyAdherence, momentum } from './adherence';
import type { Goal, Log } from './types';

const WAKE_GOAL = {
  id: 'wake-6am', type: 'tracker' as const, baseline: '08:30',
  currentRound: 1,
  rounds: [{ n: 1, targetValue: '08:00', startDate: '2026-08-10', endDate: '2026-08-24' }],
} as unknown as Goal;

const CADENCE_GOAL = {
  id: 'cadence-reset', type: 'tracker' as const, baseline: { intervalDays: 1 },
  currentRound: 1,
  rounds: [{ n: 1, targetValue: { intervalDays: 2 }, startDate: '2026-08-10', endDate: '2026-08-24' }],
} as unknown as Goal;

describe('dailyAdherence — event outside round window', () => {
  it('simple goal: an event logged before the round starts still marks as hit', () => {
    const goal = {
      id: 'oil-pulling', type: 'tracker' as const, baseline: null,
      currentRound: 1,
      rounds: [{ n: 1, targetValue: null, startDate: '2026-08-18', endDate: '2026-12-31' }],
    } as unknown as Goal;
    const logs: Log[] = [{ date: '2026-01-17', events: [{ verb: 'done', goalId: 'oil-pulling' }], notes: {} }];
    const out = dailyAdherence({ goal, logs, from: '2026-01-17', to: '2026-01-17' });
    expect(out['2026-01-17']).toBe('hit');
  });

  it('cadence goal: a session logged before the round starts still marks as hit', () => {
    const goal = {
      id: 'cadence-reset', type: 'tracker' as const, baseline: { intervalDays: 1 },
      currentRound: 1,
      rounds: [{ n: 1, targetValue: { intervalDays: 2 }, startDate: '2026-08-18', endDate: '2026-12-31' }],
    } as unknown as Goal;
    const logs: Log[] = [{ date: '2026-01-17', events: [{ verb: 'session', durationMin: 10, goalId: 'cadence-reset' }], notes: {} }];
    const out = dailyAdherence({ goal, logs, from: '2026-01-17', to: '2026-01-17' });
    expect(out['2026-01-17']).toBe('hit');
  });
});

describe('dailyAdherence — wake', () => {
  it('marks hit/soft/off/none per rule bands', () => {
    const logs: Log[] = [
      { date: '2026-08-11', events: [{ verb: 'wake', time: '08:05', goalId: 'wake-6am' }], notes: {} },
      { date: '2026-08-12', events: [{ verb: 'wake', time: '08:30', goalId: 'wake-6am' }], notes: {} },
      { date: '2026-08-13', events: [{ verb: 'wake', time: '09:15', goalId: 'wake-6am' }], notes: {} },
    ];
    const out = dailyAdherence({ goal: WAKE_GOAL, logs, from: '2026-08-11', to: '2026-08-14' });
    expect(out).toEqual({ '2026-08-11': 'hit', '2026-08-12': 'soft', '2026-08-13': 'off', '2026-08-14': 'none' });
  });
});

describe('dailyAdherence — cadence', () => {
  it('marks hit/clean/off/none per green-day rule', () => {
    const logs: Log[] = [
      { date: '2026-08-10', events: [{ verb: 'session', durationMin: 12, goalId: 'cadence-reset' }], notes: {} },
      { date: '2026-08-11', events: [], notes: {} },
      { date: '2026-08-13', events: [{ verb: 'session', durationMin: 8, goalId: 'cadence-reset' }], notes: {} },
    ];
    const out = dailyAdherence({ goal: CADENCE_GOAL, logs, from: '2026-08-10', to: '2026-08-13' });
    expect(out).toEqual({ '2026-08-10': 'hit', '2026-08-11': 'clean', '2026-08-12': 'hit', '2026-08-13': 'off' });
  });
});

describe('momentum — wake', () => {
  it('computes soft-weighted ratio over 14-day window', () => {
    const logs: Log[] = [
      { date: '2026-08-11', events: [{ verb: 'wake', time: '08:00', goalId: 'wake-6am' }], notes: {} },
      { date: '2026-08-12', events: [{ verb: 'wake', time: '08:10', goalId: 'wake-6am' }], notes: {} },
      { date: '2026-08-13', events: [{ verb: 'wake', time: '08:12', goalId: 'wake-6am' }], notes: {} },
      { date: '2026-08-14', events: [{ verb: 'wake', time: '08:30', goalId: 'wake-6am' }], notes: {} },
    ];
    const m = momentum({ goal: WAKE_GOAL, logs, asOf: '2026-08-14' });
    expect(m).toBeCloseTo(0.875, 3);
  });

  it('returns 0 when no logs in window', () => {
    expect(momentum({ goal: WAKE_GOAL, logs: [], asOf: '2026-08-14' })).toBe(0);
  });
});

describe('momentum — cadence', () => {
  it('counts hits + clean_skips over full 14 days', () => {
    const logs: Log[] = [];
    for (const d of ['2026-08-10','2026-08-12','2026-08-14','2026-08-16','2026-08-18','2026-08-20','2026-08-22']) {
      logs.push({ date: d, events: [{ verb: 'session', durationMin: 10, goalId: 'cadence-reset' }], notes: {} });
    }
    const m = momentum({ goal: CADENCE_GOAL, logs, asOf: '2026-08-23' });
    expect(m).toBeCloseTo(1, 3);
  });

  it('subtracts for off-plan sessions', () => {
    const logs: Log[] = [
      { date: '2026-08-11', events: [{ verb: 'session', durationMin: 5, goalId: 'cadence-reset' }], notes: {} },
    ];
    const m = momentum({ goal: CADENCE_GOAL, logs, asOf: '2026-08-11' });
    expect(m).toBeCloseTo(1 / 14, 4);
  });
});
