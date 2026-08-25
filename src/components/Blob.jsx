// Water-droplet blob rendered inside a DayCell SVG.
// Generates a teardrop/droplet path per seed — tip, bulgy body, round base.
// Radial gradient gives the same lit-orb highlight as the CSS orbs on Home/Goal.

function dropletPath(cx, cy, rx, ry, seed) {
  const rng = (i) => {
    const x = Math.sin(seed * 9301 + i * 49297) * 233280;
    return x - Math.floor(x);
  };

  const tilt       = rng(0) * Math.PI * 2;          // random orientation
  const tipSpread  = 0.68 + rng(1) * 0.28;          // tip roundness (high=round)
  const bodyRatio  = 0.44 + rng(2) * 0.14;          // widest point near center
  const widthMul   = 0.88 + rng(3) * 0.24;          // width variation
  const elongation = 0.88 + rng(4) * 0.28;          // close to 1:1 — round, slight oval

  const w = rx * widthMul;
  const h = ry * elongation;
  const tipY    = -h;
  const bodyY   = -h + h * bodyRatio * 2;
  const bottomY =  h * 0.52;

  // 4 anchor points: tip / left / bottom / right
  const pts = [
    [0,  tipY],
    [-w, bodyY],
    [0,  bottomY],
    [w,  bodyY],
  ];

  // Bezier control points — smooth teardrop curves
  const cps = [
    // tip → left
    [-w * tipSpread, tipY + (bodyY - tipY) * 0.28],
    [-w,             tipY + (bodyY - tipY) * 0.42],
    // left → bottom
    [-w,  bodyY + (bottomY - bodyY) * 0.72],
    [-w * 0.38, bottomY],
    // bottom → right
    [ w * 0.38, bottomY],
    [ w,  bodyY + (bottomY - bodyY) * 0.72],
    // right → tip
    [ w,             tipY + (bodyY - tipY) * 0.42],
    [ w * tipSpread, tipY + (bodyY - tipY) * 0.28],
  ];

  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const tx = ([x, y]) => `${(cx + x * cos - y * sin).toFixed(2)} ${(cy + x * sin + y * cos).toFixed(2)}`;

  return [
    `M ${tx(pts[0])}`,
    `C ${tx(cps[0])}, ${tx(cps[1])}, ${tx(pts[1])}`,
    `C ${tx(cps[2])}, ${tx(cps[3])}, ${tx(pts[2])}`,
    `C ${tx(cps[4])}, ${tx(cps[5])}, ${tx(pts[3])}`,
    `C ${tx(cps[6])}, ${tx(cps[7])}, ${tx(pts[0])}`,
    'Z',
  ].join(' ');
}

export default function Blob({ cx, cy, color, seed, big, opacity, scale = 1 }) {
  const rx = (big ? 11.0 : 8.5) * scale;
  const ry = (big ? 10.5 : 8.0) * scale;

  const gradId = `blob-g-${seed}-${color.replace(/[^a-z0-9]/gi, "")}`;
  // Focal point at 35% left / 30% top of bounding box — matches CSS orb gradient
  const gx = cx - rx * 0.3;
  const gy = cy - ry * 0.4;
  const gr = Math.max(rx, ry) * 1.45;

  return (
    <g>
      <defs>
        <radialGradient id={gradId} gradientUnits="userSpaceOnUse" cx={gx} cy={gy} r={gr}>
          <stop offset="0%"  stopColor={color} stopOpacity="1" />
          <stop offset="80%" stopColor={color} stopOpacity="0.58" />
        </radialGradient>
      </defs>
      <path
        d={dropletPath(cx, cy, rx, ry, seed)}
        fill={`url(#${gradId})`}
        opacity={opacity ?? 0.90}
      />
    </g>
  );
}
