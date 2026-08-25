// Design tokens — single source of truth. Import everywhere; never redeclare.
// Codified from the Figma file "Becoming — UI/UX" (97VazqojfNOspymPEF0uc1).
// Rationale for every choice lives in docs/brand.md. Anatomy + exact usage
// per screen lives in docs/ui-spec.md.

// ── Category palette ───────────────────────────────────────────────────
// Color is IDENTITY. The same hue must appear on a goal's orb, its momentum
// bar, its habit strip, its calendar blobs, and its pen chip. Never reassign.
export const CATS = {
  ai:            { name: "AI",            color: "#A8BEE8" }, // periwinkle — unchanged
  career:        { name: "Career",        color: "#E8A8BA" }, // rose — hue shifted from H=356° (red-adjacent) to H=344° (clear pink); vs-track 1.60
  health:        { name: "Health",        color: "#98C9AE" }, // sage — slightly richer; vs-track 1.52
  relationships: { name: "Relationships", color: "#EBC3A0" }, // peach — unchanged
  reading:       { name: "Reading",       color: "#BBA8E0" }, // lavender — slightly richer; vs-track 1.75
  creativity:    { name: "Creativity",    color: "#DDB84E" }, // amber-gold — was near-invisible on track (1.18:1); now 1.55:1
  finance:       { name: "Finance",       color: "#7FC8C4" }, // seafoam — richer; vs-track 1.56
};

// ── Surface: ONE theme, end to end ─────────────────────────────────────
// Theme-switching between screens raises arousal; coherence calms. Every
// screen uses PAPER. No pure white, no pure black, no red anywhere.
export const PAPER = {
  bg: "#F0F0F0",        // bodega cool grey — andrewsbodega.com exact bg
  card: "#FAFAFA",      // near-white card surface
  line: "#E2E2E2",      // cool grey hairline
  panel: "#EBEBEB",     // cool grey recessed panels
  ink: "#2B2B2B",       // near-black — bodega text color
  dim: "#5F5F5F",       // neutral secondary
  faint: "#9A9A9A",     // tertiary text, empty-day dots
  whisper: "#A89070",   // DRIFT ONLY — muted amber. Never red.
  track: "#E2E2E2",     // progress bar troughs
  trough: "rgba(0,0,0,0.06)",    // momentum bar trough
  miss: "#EBEBEB",      // habit-strip misses — near-invisible on purpose
  affirm: "#DCEAE2",    // confirm pill fill
  affirmLine: "#C3DACD",
  affirmInk: "#5F8672",
  // Neutral scrim + shadow tokens
  scrim: "rgba(0,0,0,0.12)",
  shadow: "0 6px 20px rgba(0,0,0,0.08)",
  sheetShadow: "0 -10px 40px rgba(0,0,0,0.12)",
  cardBorder: "#E2E2E2",
};

export const FONT = {
  serif: "'Fraunces', Georgia, serif", // IDENTITY: goal names, headlines, ambitions
  sans: "'Instrument Sans', 'Inter', system-ui, sans-serif", // DATA: numbers, labels, UI
};

// Type scale (px) — serif for who you are, sans for what you did.
export const TYPE = {
  h1: 28,        // serif — screen headline
  goalName: 17.5, // serif — goal card title
  goalTitle: 26, // serif — goal workspace title
  ambition: 16,  // serif italic — the user's own words
  body: 14,      // sans
  meta: 12.5,    // sans — card metadata
  small: 12,     // sans — headline counts, pills
  kicker: 11,    // sans, uppercase, letterSpacing 1.6px
};

// Irregular radii — a life is not a rectangle (brand.md rule 5). Alternate
// R1/R2 down a list so no two adjacent cards share a silhouette.
export const RADIUS = {
  r1: "22px 18px 24px 19px",
  r2: "18px 23px 17px 22px",
  screen: 28,
  pill: 999,
  blob: "67% 33% 52% 48% / 42% 58% 35% 65%",
};

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 18, xl: 26, screenPad: 26 };

// Goal lifecycle states (see docs/philosophy.md → Seasons)
export const STATE = {
  ACTIVE: "active",
  DRIFT: "drift",       // unintentional neglect — surface gently, once, as a question
  DORMANT: "dormant",   // intentional pause — respect silently
  COMPLETED: "completed",
  RETIRED: "retired",
};
