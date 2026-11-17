export type GoalState = 'active' | 'drift' | 'dormant' | 'completed' | 'retired';
export type GoalType = 'tracker' | 'habit';
export type AdherenceStatus = 'hit' | 'soft' | 'off' | 'none' | 'clean';

export interface Round {
  n: number;
  targetValue: string | { intervalDays: number } | null;
  startDate: string;
  endDate: string;
}

export interface Indicators {
  right: string[];
  wrong: string[];
  stall: string[];
}

export interface Goal {
  id: string;
  name: string;
  cat: string;
  color?: string;
  type: GoalType;
  state: GoalState;
  baseline: string | { intervalDays: number } | null;
  target: string | { intervalDays: number } | null;
  endDate: string | null;
  currentRound: number;
  createdAt: string;
  ambition: string;
  rounds: Round[];
  howWeGetThere: string;
  indicators: Indicators;
  goalTime?: string | null;
}

export interface LogEvent {
  verb: string;
  payload?: string;
  goalId: string;
  time?: string;
  durationMin?: number;
  raw?: string;
}

export interface Log {
  date: string;
  events: LogEvent[];
  notes: Record<string, string>;
}

export interface JournalEntry {
  id: string;
  date: string;
  text: string;
  prompt: string | null;
  goalIds: string[];
  createdAt: string;
  editedAt: string | null;
}

export interface Task {
  id: string;
  title: string;
  date: string;
  order: number;
  done: boolean;
  doneAt: string | null;
  dueTime: string | null;
  goalId: string | null;
  carriedFrom: string | null;
}

export interface Contract {
  id: string;
  goalId: string;
  change: string;
  terms: string;
  signatureSvg: string | null;
  signedAt: string | null;
  retiredAt: string | null;
  createdAt: string;
}

export interface InsightQuestion {
  id: string;
  kicker: string;
  text: string;
  yes: { label: string; response: string };
  no: { label: string; response: string };
}

export interface StreakResult {
  current: number;
  longest: number;
  longestFrom: string | null;
  longestTo: string | null;
}

export interface ProgressResult {
  marked: number;
  target: number | null;
  percent: number | null;
}
