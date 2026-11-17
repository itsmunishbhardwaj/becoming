import { describe, it, expect, vi } from 'vitest';
import { runTurn, scriptedTurn } from './prompting';
import { initialState, applyInput } from './turns';
import type { OnboardState, TurnId } from './turns';

function stateAt(pairs: [TurnId, unknown][]): OnboardState {
  let s = initialState();
  for (const [t, v] of pairs) s = applyInput(s, t, v);
  return s;
}

describe('scriptedTurn — extraction', () => {
  it('type: reads wake or cadence from user text', () => {
    const s = stateAt([['ambition', 'Wake at 6 AM every day']]);
    const out = scriptedTurn({ state: s, turnId: 'type', userText: 'wake' });
    expect(out.extractedValue).toBe('wake');
  });

  it('baseline (wake): extracts HH:MM', () => {
    const s = stateAt([['ambition', 'Wake at 6 AM'], ['type', 'wake']]);
    expect(scriptedTurn({ state: s, turnId: 'baseline', userText: '08:30' }).extractedValue).toBe('08:30');
    expect(scriptedTurn({ state: s, turnId: 'baseline', userText: 'I get up around 7:15' }).extractedValue).toBe('7:15');
  });

  it('baseline (cadence): extracts every-N-days', () => {
    const s = stateAt([['ambition', 'Space it out'], ['type', 'cadence']]);
    expect(scriptedTurn({ state: s, turnId: 'baseline', userText: 'every day' }).extractedValue)
      .toEqual({ intervalDays: 1 });
    expect(scriptedTurn({ state: s, turnId: 'baseline', userText: 'every 3 days' }).extractedValue)
      .toEqual({ intervalDays: 3 });
  });

  it("endDate: parses ISO and 'end of year'", () => {
    const s = stateAt([]);
    expect(scriptedTurn({ state: s, turnId: 'endDate', userText: '2026-12-31' }).extractedValue)
      .toBe('2026-12-31');
    const y = new Date().getUTCFullYear();
    expect(scriptedTurn({ state: s, turnId: 'endDate', userText: 'end of year' }).extractedValue)
      .toBe(`${y}-12-31`);
  });

  it('roundsPreview: computes deterministic rounds via goal-type heuristic', () => {
    const s = stateAt([
      ['ambition', 'Wake at 6 AM'], ['type', 'wake'],
      ['baseline', '08:30'], ['target', '06:00'], ['endDate', '2026-12-31'],
    ]);
    const out = scriptedTurn({ state: s, turnId: 'roundsPreview', userText: 'ok' });
    expect(Array.isArray(out.extractedValue)).toBe(true);
    expect((out.extractedValue as unknown[]).length).toBeGreaterThan(0);
    expect((out.extractedValue as { n: number }[])[0].n).toBe(1);
  });

  it('indicators: emits default set per type', () => {
    const s = stateAt([
      ['ambition', 'Wake at 6 AM'], ['type', 'wake'],
      ['baseline', '08:30'], ['target', '06:00'], ['endDate', '2026-12-31'],
      ['roundsPreview', [{ n: 1, targetValue: '08:00', startDate: '2026-08-11', endDate: '2026-09-10' }]],
    ]);
    const out = scriptedTurn({ state: s, turnId: 'indicators', userText: '' });
    const v = out.extractedValue as { right: string[]; wrong: string[]; stall: string[] };
    expect(v.right.length).toBeGreaterThan(0);
    expect(v.wrong.length).toBeGreaterThan(0);
    expect(v.stall.length).toBeGreaterThan(0);
  });
});

describe('runTurn — LLM injection', () => {
  it('uses llmChat when provided to soften the assistant line', async () => {
    const s = stateAt([['ambition', 'Wake at 6 AM']]);
    const llmChat = vi.fn().mockResolvedValue('Nice hour to own. Wake, got it.');
    const out = await runTurn({ state: s, turnId: 'type', userText: 'wake', llmChat });
    expect(out.extractedValue).toBe('wake');
    expect(out.assistant).toBe('Nice hour to own. Wake, got it.');
    expect(llmChat).toHaveBeenCalledOnce();
  });

  it('falls back to scripted line when llmChat throws', async () => {
    const s = stateAt([['ambition', 'Wake at 6 AM']]);
    const llmChat = vi.fn().mockRejectedValue(new Error('500'));
    const out = await runTurn({ state: s, turnId: 'type', userText: 'wake', llmChat });
    expect(out.extractedValue).toBe('wake');
    expect(out.assistant).toBeTruthy();
  });

  it('skips llmChat entirely for round math', async () => {
    const s = stateAt([
      ['ambition', 'Wake at 6 AM'], ['type', 'wake'],
      ['baseline', '08:30'], ['target', '06:00'], ['endDate', '2026-12-31'],
    ]);
    const llmChat = vi.fn();
    const out = await runTurn({ state: s, turnId: 'roundsPreview', userText: 'ok', llmChat });
    expect((out.extractedValue as unknown[]).length).toBeGreaterThan(0);
    expect(llmChat).not.toHaveBeenCalled();
  });
});
