import { describe, it, expect, vi } from 'vitest';
import { parseLogSmart } from './logParserLLM';
import type { Goal } from './types';

const GOALS = [
  { id: 'wake-6am', type: 'tracker' as const, baseline: '08:30', state: 'active' as const },
  { id: 'cadence-reset', type: 'tracker' as const, baseline: { intervalDays: 1 }, state: 'active' as const },
] as unknown as Goal[];

describe('parseLogSmart', () => {
  it('returns LLM-parsed events when configured + chat resolves', async () => {
    const llmChat = vi.fn().mockResolvedValue(JSON.stringify([
      { verb: 'wake', time: '07:12', raw: 'up at 7:12ish today' },
    ]));
    const out = await parseLogSmart({
      text: 'up at 7:12ish today',
      goals: GOALS, llmChat, isConfigured: async () => true,
    });
    expect(out).toEqual([{ verb: 'wake', time: '07:12', raw: 'up at 7:12ish today' }]);
    expect(llmChat).toHaveBeenCalledOnce();
  });

  it('falls back to regex when LLM throws', async () => {
    const llmChat = vi.fn().mockRejectedValue(new Error('500'));
    const out = await parseLogSmart({
      text: 'woke 07:00', goals: GOALS, llmChat, isConfigured: async () => true,
    });
    expect(out).toEqual([{ verb: 'wake', time: '07:00', goalId: '', raw: 'woke 07:00' }]);
  });

  it('falls back to regex when LLM returns invalid JSON', async () => {
    const llmChat = vi.fn().mockResolvedValue("here's what I found: {");
    const out = await parseLogSmart({
      text: 'woke 07:00', goals: GOALS, llmChat, isConfigured: async () => true,
    });
    expect(out).toEqual([{ verb: 'wake', time: '07:00', goalId: '', raw: 'woke 07:00' }]);
  });

  it('uses regex directly when isConfigured returns false', async () => {
    const llmChat = vi.fn();
    const out = await parseLogSmart({
      text: 'woke 07:00', goals: GOALS, llmChat, isConfigured: async () => false,
    });
    expect(out).toEqual([{ verb: 'wake', time: '07:00', goalId: '', raw: 'woke 07:00' }]);
    expect(llmChat).not.toHaveBeenCalled();
  });
});
