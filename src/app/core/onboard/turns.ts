import type { Goal, Round, Indicators } from '../types';

export const TURNS = Object.freeze([
  'ambition', 'type', 'baseline', 'target', 'endDate',
  'roundsPreview', 'indicators', 'confirm',
] as const);

export type TurnId = typeof TURNS[number];

export interface OnboardState {
  sessionId: string;
  answers: Partial<Record<TurnId, unknown>>;
  name?: string;
  cat?: string;
}

function uid(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'goal';
}

function classifyCat(ambition: string): string {
  const t = ambition.toLowerCase();
  if (/(sleep|wake|gym|run|body|health|weight)/.test(t)) return 'health';
  if (/(read|book)/.test(t)) return 'reading';
  if (/(job|career|interview|coding|ship|startup|work)/.test(t)) return 'career';
  if (/(friend|family|call|meet|partner|love|relation)/.test(t)) return 'relationships';
  if (/(money|save|invest|fund)/.test(t)) return 'finance';
  if (/(write|draw|paint|create)/.test(t)) return 'creativity';
  return 'health';
}

export function initialState(): OnboardState {
  return { sessionId: uid(), answers: {} };
}

const HHMM = /^\d{1,2}:\d{2}$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function validate(turnId: TurnId, value: unknown): { ok: boolean; error?: string } {
  switch (turnId) {
    case 'ambition':
      return typeof value === 'string' && value.trim().length > 0 ? { ok: true } : { ok: false, error: 'Say the goal in your own words.' };
    case 'type':
      return value === 'wake' || value === 'cadence' ? { ok: true } : { ok: false, error: 'Type must be wake or cadence.' };
    case 'baseline':
    case 'target':
      if (typeof value === 'string' && HHMM.test(value)) return { ok: true };
      if (value && typeof value === 'object' && Number.isInteger((value as { intervalDays: number }).intervalDays) && (value as { intervalDays: number }).intervalDays > 0) return { ok: true };
      return { ok: false, error: 'Use HH:MM for wake, or { intervalDays: N > 0 } for cadence.' };
    case 'endDate':
      return typeof value === 'string' && ISO.test(value) ? { ok: true } : { ok: false, error: 'Use YYYY-MM-DD.' };
    case 'roundsPreview':
      return Array.isArray(value) && value.length > 0 ? { ok: true } : { ok: false, error: 'Need at least one round.' };
    case 'indicators':
      return value && Array.isArray((value as Indicators).right) && Array.isArray((value as Indicators).wrong) && Array.isArray((value as Indicators).stall)
        ? { ok: true } : { ok: false, error: 'Indicators need right, wrong, stall arrays.' };
    case 'confirm':
      return value === true ? { ok: true } : { ok: false, error: 'Confirm with true.' };
    default:
      return { ok: false, error: `Unknown turn ${turnId}` };
  }
}

export function applyInput(state: OnboardState, turnId: TurnId, value: unknown): OnboardState {
  const v = validate(turnId, value);
  if (!v.ok) throw new Error(`invalid input for ${turnId}: ${v.error}`);
  const answers = { ...state.answers, [turnId]: value };
  const next: OnboardState = { ...state, answers };
  if (turnId === 'ambition') {
    next.name = (value as string).trim();
    next.cat = classifyCat(value as string);
  }
  return next;
}

export function nextTurn(state: OnboardState): { id?: TurnId; done: boolean } {
  for (const id of TURNS) {
    if (state.answers[id] === undefined) return { id, done: false };
  }
  return { done: true };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function finalize(state: OnboardState): Goal {
  const a = state.answers;
  if (!a.ambition || !a.type || !a.baseline || !a.target || !a.endDate || !a.roundsPreview || !a.indicators) {
    throw new Error('finalize called before all turns answered');
  }
  const createdAt = today();
  const id = slugify(state.name || (a.ambition as string));
  return {
    id, name: state.name || (a.ambition as string),
    cat: state.cat || 'health', type: 'tracker', state: 'active',
    baseline: a.baseline as Goal['baseline'], target: a.target as Goal['target'],
    endDate: a.endDate as string, currentRound: 1, createdAt,
    ambition: a.ambition as string, rounds: a.roundsPreview as Round[],
    howWeGetThere: '', indicators: a.indicators as Indicators,
  };
}
