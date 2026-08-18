// Pure classifier for a horizontal swipe. Fed by pointerdown/up positions +
// elapsed ms. Returns "prev" (right-to-left → next-item), "next"
// (left-to-right → previous-item), or null (below threshold / too slow / too
// vertical).
//
// Convention: swiping LEFT (finger moves right→left, dx < 0) reveals the NEXT
// month (calendar advances). Swiping RIGHT reveals the PREVIOUS month.
export function classifySwipe({ dx, dy, dtMs, minDx = 60, maxDtMs = 500, ratio = 1.5 }) {
  if (dtMs > maxDtMs) return null;
  if (Math.abs(dx) < minDx) return null;
  if (Math.abs(dx) < Math.abs(dy) * ratio) return null;
  return dx < 0 ? "next" : "prev";
}
