// Watercolor ellipse blob rendered inside a DayCell SVG. `scale` grows the
// blob for larger zoom levels (Week view uses ~2). All other visual math
// (tilt, radii ratio, opacity handled by the caller) stays proportional.
export default function Blob({ cx, cy, color, seed, big, opacity, scale = 1 }) {
  const tilt = ((seed * 137) % 360) - 180;
  const rx = (big ? 9.5 : 7.5) * scale;
  const ry = (big ? 7.2 : 5.6) * scale;
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill={color}
      opacity={opacity ?? 0.78}
      transform={`rotate(${tilt} ${cx} ${cy})`}
    />
  );
}
