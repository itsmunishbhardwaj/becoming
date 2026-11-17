import { describe, it, expect } from 'vitest';
import { generateInsights } from './insights';
import type { Goal, Log } from './types';

const goal = {
  id: 'wake-6am', name: 'Wake at 6:00 AM', type: 'tracker' as const,
  baseline: '08:30', state: 'active' as const, currentRound: 1,
  rounds: [{ n: 1, targetValue: '08:00', startDate: '2026-07-01', endDate: '2026-12-31' }],
} as unknown as Goal;

describe('generateInsights — drift', () => {
  it('emits a drift question when the last 7 days have no log', () => {
    const insights = generateInsights({ goals: [goal], logs: [], today: '2026-08-15' });
    const drift = insights.find((i) => i.id.startsWith('drift-'));
    expect(drift).toBeTruthy();
    expect(drift!.kicker.toLowerCase()).toContain('quiet');
    expect(drift!.text).toContain('Wake at 6:00 AM');
  });

  it('does not emit drift when there is a log in the last 7 days', () => {
    const logs: Log[] = [{ date: '2026-08-13', events: [{ verb: 'wake', time: '07:30', goalId: 'wake-6am' }], notes: {} }];
    const insights = generateInsights({ goals: [goal], logs, today: '2026-08-15' });
    expect(insights.find((i) => i.id.startsWith('drift-'))).toBeFalsy();
  });
});

describe('generateInsights — low momentum', () => {
  it('emits low-momentum when momentum < 0.25 and 3+ events in last 30 days', () => {
    const logs: Log[] = [
      { date: '2026-08-01', events: [{ verb: 'wake', time: '09:15', goalId: 'wake-6am' }], notes: {} },
      { date: '2026-08-03', events: [{ verb: 'wake', time: '09:30', goalId: 'wake-6am' }], notes: {} },
      { date: '2026-08-05', events: [{ verb: 'wake', time: '09:00', goalId: 'wake-6am' }], notes: {} },
    ];
    const insights = generateInsights({ goals: [goal], logs, today: '2026-08-15' });
    expect(insights.some((i) => i.id.startsWith('low-mom-'))).toBe(true);
  });

  it('skips low-momentum with fewer than 3 events', () => {
    const logs: Log[] = [
      { date: '2026-08-10', events: [{ verb: 'wake', time: '09:15', goalId: 'wake-6am' }], notes: {} },
    ];
    const insights = generateInsights({ goals: [goal], logs, today: '2026-08-15' });
    expect(insights.some((i) => i.id.startsWith('low-mom-'))).toBe(false);
  });
});

describe('generateInsights — ordering', () => {
  it('puts drift before low-momentum', () => {
    const logs: Log[] = [
      { date: '2026-08-01', events: [{ verb: 'wake', time: '09:15', goalId: 'wake-6am' }], notes: {} },
      { date: '2026-08-03', events: [{ verb: 'wake', time: '09:30', goalId: 'wake-6am' }], notes: {} },
      { date: '2026-08-05', events: [{ verb: 'wake', time: '09:00', goalId: 'wake-6am' }], notes: {} },
    ];
    const insights = generateInsights({ goals: [goal], logs, today: '2026-08-15' });
    const kinds = insights.map((i) => i.id.split('-')[0]);
    expect(kinds[0]).toBe('drift');
  });
});

describe('generateInsights — indicator echo', () => {
  const goalWithWrong = {
    ...goal,
    indicators: { right: [], wrong: ['Snoozing past target by 45+ min two days in a row'], stall: [] },
  } as unknown as Goal;

  it('emits wrong-echo when 3+ off/soft days in last 7', () => {
    const logs: Log[] = [
      { date: '2026-08-10', events: [{ verb: 'wake', time: '08:30', goalId: 'wake-6am' }], notes: {} },
      { date: '2026-08-12', events: [{ verb: 'wake', time: '09:15', goalId: 'wake-6am' }], notes: {} },
      { date: '2026-08-14', events: [{ verb: 'wake', time: '08:30', goalId: 'wake-6am' }], notes: {} },
    ];
    const insights = generateInsights({ goals: [goalWithWrong], logs, today: '2026-08-15' });
    const echo = insights.find((i) => i.id.startsWith('wrong-echo-'));
    expect(echo).toBeTruthy();
    expect(echo!.kicker.toLowerCase()).toContain('pattern');
    expect(echo!.text).toContain('Snoozing past target');
  });

  it('does not emit wrong-echo when goal has no wrong indicators', () => {
    const bare = { ...goalWithWrong, indicators: { right: [], wrong: [], stall: [] } } as unknown as Goal;
    const logs: Log[] = [
      { date: '2026-08-10', events: [{ verb: 'wake', time: '08:30', goalId: 'wake-6am' }], notes: {} },
      { date: '2026-08-12', events: [{ verb: 'wake', time: '09:15', goalId: 'wake-6am' }], notes: {} },
      { date: '2026-08-14', events: [{ verb: 'wake', time: '08:30', goalId: 'wake-6am' }], notes: {} },
    ];
    const insights = generateInsights({ goals: [bare], logs, today: '2026-08-15' });
    expect(insights.some((i) => i.id.startsWith('wrong-echo-'))).toBe(false);
  });

  it('orders wrong-echo before low-momentum', () => {
    const logs: Log[] = [
      { date: '2026-08-10', events: [{ verb: 'wake', time: '09:15', goalId: 'wake-6am' }], notes: {} },
      { date: '2026-08-12', events: [{ verb: 'wake', time: '09:20', goalId: 'wake-6am' }], notes: {} },
      { date: '2026-08-14', events: [{ verb: 'wake', time: '09:25', goalId: 'wake-6am' }], notes: {} },
    ];
    const insights = generateInsights({ goals: [goalWithWrong], logs, today: '2026-08-15' });
    const kinds = insights.map((i) => i.id.split('-')[0]);
    const echoIdx = kinds.indexOf('wrong');
    const lowIdx = kinds.indexOf('low');
    expect(echoIdx).toBeGreaterThan(-1);
    expect(lowIdx).toBeGreaterThan(-1);
    expect(echoIdx).toBeLessThan(lowIdx);
  });
});
