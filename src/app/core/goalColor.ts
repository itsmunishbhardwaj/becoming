import { CATS, PAPER } from './tokens';
import type { Goal } from './types';

export function goalColor(goal: Goal | null | undefined, fallback = PAPER.faint): string {
  if (!goal) return fallback;
  if (goal.color) return goal.color;
  return CATS[goal.cat]?.color ?? fallback;
}

export const PALETTE: { color: string; name: string }[] = [
  { color: '#84A8BA', name: 'Steel' },
  { color: '#2C6AAD', name: 'Ocean' },
  { color: '#538AFF', name: 'Electric' },
  { color: '#194DC4', name: 'Denim' },
  { color: '#7096C4', name: 'Cornflower' },
  { color: '#DFE3E6', name: 'Mist' },
  { color: '#696969', name: 'Smoke' },
  { color: '#F6BD60', name: 'Marigold' },
  { color: '#EE4434', name: 'Tomato' },
  { color: '#FFFAED', name: 'Parchment' },
  { color: '#F0F0F0', name: 'Pearl' },
];

export function autoPickColor(existingGoals: Goal[] = [], preferKey: string | null = null): string {
  const counts = new Map(PALETTE.map((p) => [p.color, 0]));
  for (const g of existingGoals) {
    const c = g?.color || CATS[g?.cat]?.color;
    if (c && counts.has(c)) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const preferred = preferKey && CATS[preferKey]?.color;
  if (preferred && (counts.get(preferred) ?? 0) === 0) return preferred;
  let best = PALETTE[0].color;
  let bestCount = Infinity;
  for (const p of PALETTE) {
    const n = counts.get(p.color) ?? 0;
    if (n < bestCount) { best = p.color; bestCount = n; }
  }
  return best;
}
