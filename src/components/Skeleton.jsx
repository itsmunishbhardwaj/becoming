import { PAPER, RADIUS } from "../tokens.js";

// Solid-coloured placeholder that shimmers softly. Use SkeletonRow for list
// placeholders and SkeletonBlock for card/composer shapes. Driven by a single
// CSS keyframe (defined in styles.css under .skeleton-pulse) so there's no
// per-instance JS cost.

export function SkeletonBlock({ height = 60, width = "100%", radius, style }) {
  return (
    <div
      className="skeleton-pulse"
      style={{
        height,
        width,
        borderRadius: radius ?? RADIUS.r1,
        background: PAPER.panel,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonRow({ height = 56, radius, style }) {
  return (
    <SkeletonBlock
      height={height}
      radius={radius ?? RADIUS.r2}
      style={style}
    />
  );
}

// Stacked list of skeleton rows. count defaults to 4 which is a
// reasonable "doesn't look empty" shape for most V2 screens.
export function SkeletonList({ count = 4, gap = 8, rowHeight = 56, radius }) {
  const rows = Array.from({ length: count });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {rows.map((_, i) => (
        <SkeletonRow key={i} height={rowHeight} radius={radius} />
      ))}
    </div>
  );
}
