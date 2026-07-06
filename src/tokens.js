// Design tokens — single source of truth. Import everywhere; never redeclare.

// Pastel category palette. Color is identity — consistent across home + calendar.
export const CATS = {
  ai:            { name: "AI",            color: "#A9C4F5" }, // periwinkle
  career:        { name: "Career",        color: "#F2AFB4" }, // dusty rose
  health:        { name: "Health",        color: "#A8DAC0" }, // sage
  relationships: { name: "Relationships", color: "#F5C6A0" }, // peach
  reading:       { name: "Reading",       color: "#C9B8F0" }, // lavender
  creativity:    { name: "Creativity",    color: "#F3E1A0" }, // butter
};

// Two surface themes. Home = calm night. Calendar = soft paper.
export const NIGHT = {
  bg: "#0E1220",
  bgGradient: "radial-gradient(1200px 600px at 70% -10%, #1A2140 0%, #0E1220 55%)",
  card: "rgba(255,255,255,0.035)",
  cardBorder: "rgba(255,255,255,0.07)",
  text: "#E8EAF2",
  dim: "#8A90A8",
  faint: "#565D75",
};

export const PAPER = {
  bg: "#FBFAF6",
  ink: "#4A4658",
  dim: "#9A96A8",
  faint: "#C7C3D2",
  panel: "#F4F2FA",
  panelBorder: "#E9E5F2",
};

export const FONT = {
  serif: "'Fraunces', Georgia, serif", // identity statements, goal names
  sans: "'Inter', system-ui, sans-serif", // data, UI
};

// Goal lifecycle states (see docs/philosophy.md → Seasons)
export const STATE = {
  ACTIVE: "active",
  DRIFT: "drift", // unintentional neglect — surface gently
  DORMANT: "dormant", // intentional pause — respect silently
  COMPLETED: "completed",
  RETIRED: "retired",
};
