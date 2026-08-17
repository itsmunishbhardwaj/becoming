import { CATS, PAPER } from "../tokens.js";

export function goalColor(goal, fallback = PAPER.faint) {
  if (!goal) return fallback;
  if (goal.color) return goal.color;
  return CATS[goal.cat]?.color ?? fallback;
}

// Watercolor wash palette — 16 perceptually-distinct hues spanning the wheel.
// One shade per hue family so days with multiple goals stay legible.
// Rules from docs/brand.md: no red, no pure black/white, one paper theme.
// Slight saturation lift vs. earlier draft so warm and cool anchors read apart.
export const PALETTE = [
  { color: "#E9A6B0", name: "Blush" },        // pink
  { color: "#D48FA6", name: "Rose" },         // magenta wash
  { color: "#C99BC4", name: "Orchid" },       // pink-purple
  { color: "#B48FC4", name: "Plum" },         // violet
  { color: "#9E8FD1", name: "Iris" },         // deep lavender
  { color: "#8A98D2", name: "Indigo" },       // blue-violet
  { color: "#8FB0DC", name: "Cornflower" },   // blue
  { color: "#8FBFC4", name: "Teal" },         // blue-green
  { color: "#7FB79A", name: "Sea" },          // green-teal
  { color: "#9EC078", name: "Meadow" },       // green
  { color: "#C9CE7B", name: "Chartreuse" },   // yellow-green
  { color: "#E4D273", name: "Honey" },        // yellow
  { color: "#E6B972", name: "Amber" },        // gold
  { color: "#DFA26F", name: "Apricot" },      // orange
  { color: "#D08B6C", name: "Terracotta" },   // burnt orange
  { color: "#9B9DAB", name: "Slate" },        // cool grey wash
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
