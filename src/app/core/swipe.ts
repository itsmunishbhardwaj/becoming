interface SwipeOptions {
  dx: number;
  dy: number;
  dtMs: number;
  minDx?: number;
  maxDtMs?: number;
  ratio?: number;
}

export function classifySwipe({ dx, dy, dtMs, minDx = 60, maxDtMs = 500, ratio = 1.5 }: SwipeOptions): 'next' | 'prev' | null {
  if (dtMs > maxDtMs) return null;
  if (Math.abs(dx) < minDx) return null;
  if (Math.abs(dx) < Math.abs(dy) * ratio) return null;
  return dx < 0 ? 'next' : 'prev';
}
