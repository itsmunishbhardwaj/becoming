// Design tokens — single source of truth. Import everywhere; never redeclare.
// Codified from the Figma file "Becoming — UI/UX" (97VazqojfNOspymPEF0uc1).
// Rationale for every choice lives in docs/brand.md. Anatomy + exact usage
// per screen lives in docs/ui-spec.md.

// ── Category palette ───────────────────────────────────────────────────
// Color is IDENTITY. The same hue must appear on a goal's orb, its momentum
// bar, its habit strip, its calendar blobs, and its pen chip. Never reassign.
export const CATS = {
  ai:            { name: "AI",            color: "#A8BEE8" }, // periwinkle
  career:        { name: "Career",        color: "#E9B3B7" }, // dusty rose
  health:        { name: "Health",        color: "#A9CEBB" }, // sage
  relationships: { name: "Relationships", color: "#EBC3A0" }, // peach
  reading:       { name: "Reading",       color: "#C5B5E3" }, // lavender
  creativity:    { name: "Creativity",    color: "#E5D6A3" }, // butter
  finance:       { name: "Finance",       color: "#A7D8D5" }, // seafoam
};

// ── Surface: ONE theme, end to end ─────────────────────────────────────
// Theme-switching between screens raises arousal; coherence calms. Every
// screen uses PAPER. No pure white, no pure black, no red anywhere.
export const PAPER = {
  bg: "#FBFBF9",        // base — cool near-white
  card: "#FFFFFF",      // surfaces sit above bg on their hairline
  line: "#E7E2D5",      // hairline borders
  panel: "#F4F2EA",     // recessed panels (period chips, summaries)
  ink: "#55505C",       // text — soft charcoal, never black
  dim: "#97919F",       // secondary text
  faint: "#C9C3CE",     // tertiary text, empty-day dots
  whisper: "#B9A87F",   // DRIFT ONLY — warm sand. The closest thing to a
                        // warning this app has. Never red.
  track: "#ECE8DD",     // progress bar troughs
  trough: "rgba(0,0,0,0.06)",    // momentum bar trough — dark-alpha on paper bg
  miss: "#EDE9DE",      // habit-strip misses — near-invisible on purpose
  affirm: "#DCEAE2",    // confirm pill fill
  affirmLine: "#C3DACD",
  affirmInk: "#5F8672",
  // Neutral scrim + shadow tokens — the only "off-palette" values are here so components stay hex-free.
  scrim: "rgba(0,0,0,0.12)",                        // sheet overlay dim, brand-neutral black-alpha
  shadow: "0 6px 20px rgba(85,80,92,0.10)",         // shadow token; RGB derives from PAPER.ink
  sheetShadow: "0 -10px 40px rgba(0,0,0,0.15)",    // top-facing sheet drop shadow
  cardBorder: "#E7E2D5",                             // matches PAPER.line — added so NIGHT.cardBorder no longer resolves undefined
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
  blob: "58% 42% 55% 45% / 45% 55% 42% 58%",
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
