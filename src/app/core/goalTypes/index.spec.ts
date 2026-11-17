import { describe, it, expect } from 'vitest';
import * as wake from './wake';
import * as cadence from './cadence';
import * as simple from './simple';

describe('wake.buildRounds', () => {
  it('divides baseline→target into 30-min steps across timeline', () => {
    const rounds = wake.buildRounds('08:30', '06:00', '2026-08-10', '2026-12-31');
    expect(rounds[0].targetValue).toBe('08:00');
    expect(rounds[rounds.length - 1].targetValue).toBe('06:00');
    expect(rounds).toHaveLength(5);
    expect(rounds[0].startDate).toBe('2026-08-10');
    expect(rounds[rounds.length - 1].endDate).toBe('2026-12-31');
  });
});

describe('wake.adherenceForDay', () => {
  const round = { n: 1, targetValue: '08:00', startDate: '2026-08-10', endDate: '2026-08-24' };

  it('hit when wake ≤ target + 15min', () => {
    expect(wake.adherenceForDay({
      date: '2026-08-11', currentRound: round,
      events: [{ verb: 'wake', time: '08:12', goalId: 'wake-6am' }],
    })).toBe('hit');
  });

  it('soft when 15 < delta ≤ 45', () => {
    expect(wake.adherenceForDay({
      date: '2026-08-11', currentRound: round,
      events: [{ verb: 'wake', time: '08:30', goalId: 'wake-6am' }],
    })).toBe('soft');
  });

  it('off when > 45min late', () => {
    expect(wake.adherenceForDay({
      date: '2026-08-11', currentRound: round,
      events: [{ verb: 'wake', time: '09:15', goalId: 'wake-6am' }],
    })).toBe('off');
  });

  it('none when no wake event', () => {
    expect(wake.adherenceForDay({ date: '2026-08-11', currentRound: round, events: [] })).toBe('none');
  });
});

describe('cadence.buildRounds', () => {
  it('widens intervalDays linearly across timeline', () => {
    const rounds = cadence.buildRounds(
      { intervalDays: 1 }, { intervalDays: 7 },
      '2026-08-10', '2026-12-31',
    );
    expect(rounds[0].targetValue).toEqual({ intervalDays: 2 });
    expect(rounds[rounds.length - 1].targetValue).toEqual({ intervalDays: 7 });
    expect(rounds.length).toBeGreaterThanOrEqual(3);
  });
});

describe('cadence.adherenceForDay', () => {
  const round = { n: 1, targetValue: { intervalDays: 2 }, startDate: '2026-08-10', endDate: '2026-08-24' };

  it('hit when green day with session', () => {
    expect(cadence.adherenceForDay({
      date: '2026-08-12', currentRound: round,
      events: [{ verb: 'session', time: '22:00', durationMin: 15, goalId: 'cadence-reset' }],
    })).toBe('hit');
  });

  it('clean skip on non-green day with no session', () => {
    expect(cadence.adherenceForDay({ date: '2026-08-11', currentRound: round, events: [] })).toBe('clean');
  });

  it('off plan on non-green day with session', () => {
    expect(cadence.adherenceForDay({
      date: '2026-08-11', currentRound: round,
      events: [{ verb: 'session', time: '22:00', durationMin: 15, goalId: 'cadence-reset' }],
    })).toBe('off');
  });

  it('green day with no session still marks as hit', () => {
    expect(cadence.adherenceForDay({ date: '2026-08-12', currentRound: round, events: [] })).toBe('hit');
  });
});

describe('wake.safeRateCeiling', () => {
  it('computes minimum safe days as steps * MIN_DAYS_PER_STEP', () => {
    expect(wake.safeRateCeiling('08:30', '07:30')).toEqual({ minDays: 20 });
  });

  it('handles a large delta', () => {
    expect(wake.safeRateCeiling('23:00', '14:00')).toEqual({ minDays: 180 });
  });
});

describe('cadence.safeRateCeiling', () => {
  it('computes minimum safe days as steps * MIN_DAYS_PER_ROUND', () => {
    expect(cadence.safeRateCeiling({ intervalDays: 1 }, { intervalDays: 7 })).toEqual({ minDays: 84 });
  });

  it('returns zero minDays when target equals baseline', () => {
    expect(cadence.safeRateCeiling({ intervalDays: 3 }, { intervalDays: 3 })).toEqual({ minDays: 0 });
  });
});

describe('simple.safeRateCeiling', () => {
  it('returns null — no mechanical ceiling for simple goals', () => {
    expect(simple.safeRateCeiling()).toBeNull();
  });
});
