import { getType } from '../goalTypes/index';
import type { OnboardState, TurnId } from './turns';

const HHMM_ANY = /(\d{1,2}:\d{2})/;
const EVERY_N = /every\s+(\d+)?\s*days?/i;
const ISO = /(\d{4}-\d{2}-\d{2})/;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function extractType(userText: string, ambition: string): string {
  const t = (userText || '').toLowerCase();
  if (/\bwake\b/.test(t)) return 'wake';
  if (/\bcadence\b/.test(t)) return 'cadence';
  const a = (ambition || '').toLowerCase();
  if (/(wake|sleep|morning)/.test(a)) return 'wake';
  return 'cadence';
}

function extractHHMM(userText: string): string | null {
  const m = userText.match(HHMM_ANY);
  return m ? m[1] : null;
}

function extractInterval(userText: string): { intervalDays: number } | null {
  const t = userText.toLowerCase();
  if (/every\s+day\b/.test(t) || /\bdaily\b/.test(t)) return { intervalDays: 1 };
  const m = t.match(EVERY_N);
  if (m && m[1]) return { intervalDays: Number(m[1]) };
  return null;
}

function extractDate(userText: string): string | null {
  const m = userText.match(ISO);
  if (m) return m[1];
  const t = userText.toLowerCase();
  const y = new Date().getUTCFullYear();
  if (/end of year|by year end|dec(ember)?\s*31/i.test(t)) return `${y}-12-31`;
  return null;
}

function defaultIndicators(type: string) {
  if (type === 'wake') {
    return {
      right: ['Wake within 15 min of round target 5+ days a week', 'Bedtime moves earlier without effort'],
      wrong: ['Snoozing past round target by 45+ min two days in a row'],
      stall: ['7+ days no wake logged', 'Same wake time held across 3 rounds'],
    };
  }
  return {
    right: ['Green days matched', 'Non-green days clean'],
    wrong: ['Multiple sessions on non-green days across a week'],
    stall: ['No logs at all for 14+ days'],
  };
}

type BaselineTarget = string | { intervalDays: number };

const CANNED: Record<TurnId, (v: unknown) => string> = {
  ambition: (a) => `Heard — "${a}". Let's shape a way there.`,
  type: (v) => v === 'wake' ? "Wake-type goal. Good — we'll step the time earlier." : "Cadence-type goal. Good — we'll widen the interval.",
  baseline: (v: unknown) => { const bv = v as BaselineTarget; return `Baseline noted — ${typeof bv === 'string' ? bv : `every ${(bv as { intervalDays: number }).intervalDays} day${(bv as { intervalDays: number }).intervalDays === 1 ? '' : 's'}`}.`; },
  target: (v: unknown) => { const tv = v as BaselineTarget; return `Target noted — ${typeof tv === 'string' ? tv : `every ${(tv as { intervalDays: number }).intervalDays} day${(tv as { intervalDays: number }).intervalDays === 1 ? '' : 's'}`}.`; },
  endDate: (v) => `Landing by ${v}.`,
  roundsPreview: (rounds) => { const r = rounds as unknown[]; return `Proposed ${r.length} round${r.length === 1 ? '' : 's'} — accept or ask to soften.`; },
  indicators: () => 'Draft indicators drawn. Edit any that don\'t feel right.',
  confirm: () => 'Locked in. Writing your goal.',
};

export interface ScriptedTurnResult {
  extractedValue?: unknown;
  assistant: string;
}

export function scriptedTurn({ state, turnId, userText }: { state: OnboardState; turnId: TurnId; userText: string }): ScriptedTurnResult {
  const a = state.answers;
  switch (turnId) {
    case 'ambition': {
      const value = (userText || '').trim();
      return { extractedValue: value || undefined, assistant: value ? CANNED.ambition(value) : 'Say the goal in your own words.' };
    }
    case 'type': {
      const value = extractType(userText, a['ambition'] as string);
      return { extractedValue: value, assistant: CANNED.type(value) };
    }
    case 'baseline':
    case 'target': {
      const value = a['type'] === 'cadence' ? extractInterval(userText) : extractHHMM(userText);
      return {
        extractedValue: value ?? undefined,
        assistant: value ? CANNED[turnId](value) : (a['type'] === 'cadence' ? "Say something like 'every day' or 'every 3 days'." : 'Say a time like 07:30.'),
      };
    }
    case 'endDate': {
      const value = extractDate(userText);
      return { extractedValue: value ?? undefined, assistant: value ? CANNED.endDate(value) : "Say a date like 2026-12-31 or 'end of year'." };
    }
    case 'roundsPreview': {
      const t = getType(a['type'] as string);
      const rounds = t.buildRounds(a['baseline'] as never, a['target'] as never, today(), a['endDate'] as string);
      return { extractedValue: rounds, assistant: CANNED.roundsPreview(rounds) };
    }
    case 'indicators': {
      const value = defaultIndicators(a['type'] as string);
      return { extractedValue: value, assistant: CANNED.indicators(value) };
    }
    case 'confirm':
      return { extractedValue: true, assistant: CANNED.confirm(true) };
    default:
      return { assistant: '' };
  }
}

export async function runTurn({
  state,
  turnId,
  userText,
  llmChat,
}: {
  state: OnboardState;
  turnId: TurnId;
  userText: string;
  llmChat?: ((messages: { role: string; content: string }[]) => Promise<string>) | null;
}): Promise<ScriptedTurnResult> {
  const scripted = scriptedTurn({ state, turnId, userText });
  if (turnId === 'roundsPreview' || !llmChat) return scripted;
  try {
    const softened = await llmChat([
      { role: 'system', content: 'You are a soft, spare voice inside a personal-goals app called Becoming. Answer in one or two short lines. Never scold. Never use emoji.' },
      { role: 'user', content: `Turn: ${turnId}. Their input: "${userText}". A canned reply is: "${scripted.assistant}". Rewrite it in your voice.` },
    ]);
    return { ...scripted, assistant: softened || scripted.assistant };
  } catch {
    return scripted;
  }
}
