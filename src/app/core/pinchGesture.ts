interface Point { x: number; y: number }

export function centroidOf(pts: Point[]): Point {
  const n = pts.length;
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / n,
    y: pts.reduce((s, p) => s + p.y, 0) / n,
  };
}

export function distanceOf(pts: [Point, Point]): number {
  const dx = pts[1].x - pts[0].x;
  const dy = pts[1].y - pts[0].y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function classifyPinch({ ratio, elapsed, maxElapsedMs = 400 }: { ratio: number; elapsed: number; maxElapsedMs?: number }): 'in' | 'out' | null {
  if (elapsed > maxElapsedMs) return null;
  if (ratio >= 1.35) return 'in';
  if (ratio <= 0.75) return 'out';
  return null;
}
