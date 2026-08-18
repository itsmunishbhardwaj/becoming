export function centroidOf(pts) {
  const n = pts.length;
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / n,
    y: pts.reduce((s, p) => s + p.y, 0) / n,
  };
}

export function distanceOf(pts) {
  const dx = pts[1].x - pts[0].x;
  const dy = pts[1].y - pts[0].y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Returns "in" (zoom in), "out" (zoom out), or null.
// ratio = currentDist / initialDist, elapsed = ms since gesture started.
export function classifyPinch({ ratio, elapsed, maxElapsedMs = 400 }) {
  if (elapsed > maxElapsedMs) return null;
  if (ratio >= 1.35) return "in";
  if (ratio <= 0.75) return "out";
  return null;
}
