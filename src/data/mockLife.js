import { STATE } from "../tokens.js";

// ── Home: goals as living identity objects ─────────────────────────────
export const GOALS = [
  {
    id: "google",
    name: "Become a Google Engineer",
    cat: "career",
    momentum: 0.74,
    last: "Yesterday",
    lastDetail: "Solved 3 Leetcode problems",
    streak: "12-day streak",
    state: STATE.ACTIVE,
    projects: [
      { name: "Leetcode", done: 148, total: 200 },
      { name: "System Design", done: 6, total: 12 },
      { name: "Networking", done: 9, total: 15 },
      { name: "Behavioral", done: 4, total: 8 },
    ],
  },
  {
    id: "health",
    name: "Health",
    cat: "health",
    momentum: 0.68,
    last: "Yesterday",
    lastDetail: "Gym — push day, 55 min",
    streak: "4 of last 5 days",
    state: STATE.ACTIVE,
    projects: [{ name: "Strength", done: 3, total: 4 }],
    // binary daily habits — tallied over the year (X/365). polarity: do | avoid
    habits: [
      { name: "Slept before 12", polarity: "do", hits: 214, current: 6 },
      { name: "No PMO", polarity: "avoid", hits: 180, current: 12 },
      { name: "Trained", polarity: "do", hits: 141, current: 3 },
    ],
  },
  {
    id: "relationships",
    name: "Relationships",
    cat: "relationships",
    momentum: 0.53,
    last: "Today",
    lastDetail: "Called parents",
    streak: null,
    state: STATE.ACTIVE,
    projects: [
      { name: "Weekly family call", done: 3, total: 4 },
      { name: "Meet one friend / week", done: 1, total: 4 },
    ],
  },
  {
    id: "reading",
    name: "Read 50 Books",
    cat: "reading",
    momentum: 0.32,
    last: "6 days ago",
    lastDetail: "20 pages — Deep Work",
    streak: null,
    state: STATE.DRIFT,
    projects: [{ name: "Books this year", done: 16, total: 50 }],
  },
  {
    id: "startup",
    name: "Build AI Startup",
    cat: "ai",
    momentum: 0.42,
    last: "March",
    lastDetail: null,
    streak: null,
    state: STATE.DORMANT,
    dormantNote: "Paused to focus on Google interviews. Returning in summer.",
    projects: [
      { name: "Agent MVP", done: 7, total: 10 },
      { name: "First 10 users", done: 3, total: 10 },
    ],
  },
];

// ── Calendar: a synthetic year with seasons baked in ───────────────────
const DAYS_IN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// Seasons: AI bright Jan–Mar then dormant; reading drifts after May;
// career steady w/ spring peak; health steady; relationships light.
export function buildYear(seed = 2026) {
  const r = rng(seed);
  const year = [];
  for (let m = 0; m < 12; m++) {
    const days = [];
    for (let d = 1; d <= DAYS_IN[m]; d++) {
      const circles = [];
      const add = (cat, prob, min, max) => {
        if (r() < prob) circles.push({ cat, effort: min + r() * (max - min) });
      };
      add("career", 0.55 - Math.abs(m - 3) * 0.03, 0.4, 1);
      add("ai", m <= 2 ? 0.6 : 0.05, 0.4, 1);
      add("health", 0.5, 0.3, 0.85);
      add("relationships", 0.22, 0.3, 0.7);
      add("reading", m <= 4 ? 0.4 : 0.08, 0.25, 0.7);
      add("creativity", 0.14, 0.3, 0.9);
      days.push(circles);
    }
    year.push(days);
  }
  return year;
}

export function isMonthDormant(days, monthIdx) {
  const aiCount = days.filter((c) => c.some((x) => x.cat === "ai")).length;
  return monthIdx > 2 && aiCount <= 2;
}
