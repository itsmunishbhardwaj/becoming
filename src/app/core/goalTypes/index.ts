import * as wake from './wake';
import * as cadence from './cadence';
import * as simple from './simple';
import type { Goal } from '../types';

const TYPES = { wake, cadence, simple } as const;
type TypeKey = keyof typeof TYPES;

export function getTypeByGoal(goal: Goal): typeof simple | typeof wake | typeof cadence {
  if (typeof goal.baseline === 'string') return wake;
  if (goal.baseline != null && typeof goal.baseline === 'object' && 'intervalDays' in goal.baseline) return cadence;
  return simple;
}

export function getType(type: string): typeof simple | typeof wake | typeof cadence {
  const t = TYPES[type as TypeKey];
  if (!t) throw new Error(`Unknown goal type: ${type}`);
  return t;
}
