import { CATS, PAPER } from "../tokens.js";

export function goalColor(goal, fallback = PAPER.faint) {
  if (!goal) return fallback;
  if (goal.color) return goal.color;
  return CATS[goal.cat]?.color ?? fallback;
}

// Color palette sourced exactly from deanira.co/onestopshop and andrewsbodega.com.
// Values are unmodified — exact computed colors from those sites.
export const PALETTE = [
  { color: "#84A8BA", name: "Steel" },        // deanira — dominant blue-grey section
  { color: "#2C6AAD", name: "Ocean" },        // deanira — button / accent blue
  { color: "#538AFF", name: "Electric" },     // bodega — bright cornflower blue
  { color: "#194DC4", name: "Denim" },        // bodega — deep blue
  { color: "#7096C4", name: "Cornflower" },   // bodega — muted periwinkle
  { color: "#DFE3E6", name: "Mist" },         // deanira — cool grey
  { color: "#696969", name: "Smoke" },        // deanira — mid grey
  { color: "#F6BD60", name: "Marigold" },     // deanira — amber gold accent
  { color: "#EE4434", name: "Tomato" },       // deanira — red CTA
  { color: "#FFFAED", name: "Parchment" },    // deanira — warm cream bg
  { color: "#F0F0F0", name: "Pearl" },        // bodega — light grey
];

export function autoPickColor(existingGoals = [], preferKey = null) {
  const counts = new Map(PALETTE.map((p) => [p.color, 0]));
  for (const g of existingGoals) {
    const c = g?.color || CATS[g?.cat]?.color;
    if (c && counts.has(c)) counts.set(c, counts.get(c) + 1);
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
