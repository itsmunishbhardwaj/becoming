import { STATE } from "../tokens.js";

// ── Home: goals as living identity objects ─────────────────────────────
//
// Fields carried per docs/origin-spreadsheets.md ("the eight obligations"):
//   ambition  — the goal in the user's own voice, stored verbatim (oblig. 8)
//   reward    — one line, user's words, resurfaced at completion (oblig. 4)
//   retro     — honest closing reflection on completed/retired goals (oblig. 3)
//   period    — the current stretch's sub-target; cadence is per-goal (oblig. 2)
//   headline  — accumulation count: what's been EARNED, never % missed (oblig. 5)
//   habits[]  — polarity "avoid" supported without shame mechanics (oblig. 6)
export const GOALS = [
  {
    id: "google",
    name: "Become a Google Engineer",
    cat: "career",
    ambition: "Get into Google. Not for the badge — to know I can stand with the best.",
    reward: "First paycheck goes to a business-class flight home.",
    momentum: 0.74,
    last: "Yesterday",
    lastDetail: "Solved 3 Leetcode problems",
    streak: "12-day streak",
    state: STATE.ACTIVE,
    headline: { n: 148, unit: "problems solved" },
    period: { label: "This stretch (T3)", target: "40 more problems · system design 6 → 12" },
    projects: [
      { name: "Leetcode", done: 148, total: 200, unit: "problems" },
      { name: "System Design", done: 6, total: 12, unit: "chapters" },
      { name: "Networking", done: 9, total: 15, unit: "conversations" },
      { name: "Behavioral", done: 4, total: 8, unit: "sessions" },
    ],
  },
  {
    id: "health",
    name: "Health",
    cat: "health",
    // Custom denominator (oblig. 5): success is 4 gym days a week, not 7.
    ambition: "Four sessions a week. Strong at 40, not sore at 30.",
    reward: null,
    momentum: 0.68,
    last: "Yesterday",
    lastDetail: "Gym — push day, 55 min",
    streak: "4 of last 5 days",
    state: STATE.ACTIVE,
    headline: { n: 141, unit: "sessions this year" },
    period: { label: "This stretch (T3)", target: "36 hours or 60 laps" },
    projects: [{ name: "Strength", done: 3, total: 4, unit: "days this week" }],
    // binary daily habits — tallied as days KEPT, misses never headlined.
    // polarity: do | avoid  (avoid habits count clean days — no shame render)
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
    ambition: "Never become the son who only calls on birthdays.",
    reward: null,
    momentum: 0.53,
    last: "Today",
    lastDetail: "Called parents",
    streak: null,
    state: STATE.ACTIVE,
    headline: { n: 31, unit: "calls & meetups" },
    period: { label: "This month", target: "weekly family call · one friend a week" },
    projects: [
      { name: "Weekly family call", done: 3, total: 4, unit: "weeks" },
      { name: "Meet one friend / week", done: 1, total: 4, unit: "weeks" },
    ],
  },
  {
    id: "reading",
    name: "Read 50 Books",
    cat: "reading",
    ambition: "Fifty books. A book a week, near enough.",
    reward: "A proper reading chair. The expensive one.",
    momentum: 0.32,
    last: "6 days ago",
    lastDetail: "20 pages — Deep Work",
    streak: null,
    state: STATE.DRIFT,
    headline: { n: 16, unit: "books" },
    period: { label: "This stretch (T3)", target: "8 books" },
    projects: [{ name: "Books this year", done: 16, total: 50, unit: "books" }],
  },
  {
    id: "startup",
    name: "Build AI Startup",
    cat: "ai",
    ambition: "Build something people use while I sleep.",
    reward: null,
    momentum: 0.42,
    last: "March",
    lastDetail: null,
    streak: null,
    state: STATE.DORMANT,
    dormantNote: "Paused to focus on Google interviews. Returning in summer.",
    headline: { n: 7, unit: "milestones shipped" },
    projects: [
      { name: "Agent MVP", done: 7, total: 10, unit: "milestones" },
      { name: "First 10 users", done: 3, total: 10, unit: "users" },
    ],
  },
  {
    id: "fund",
    name: "Six-Month Emergency Fund",
    cat: "finance",
    ambition: "Enough runway that no bad month can push me around.",
    reward: "Sleeping properly.",
    momentum: 1,
    last: "May",
    lastDetail: null,
    streak: null,
    state: STATE.COMPLETED,
    // Result column, kept with the goal's history (origin oblig. 3)
    retro: "Automated the transfer in January. Hit the number in May without thinking about it once.",
    headline: { n: 5, unit: "months, then done" },
    projects: [
      { name: "Pick the account", done: 1, total: 1, unit: "" },
      { name: "Automate the transfer", done: 1, total: 1, unit: "" },
      { name: "Reach the number", done: 1, total: 1, unit: "" },
    ],
  },
];

// ── AI questions — patterns and drift, always asked, never declared ────
// Drift is surfaced as a question with equal-weight answers; "resting" costs
// nothing and converts drift → dormancy (origin-spreadsheets.md: the 0% rows
// that haunted every month must become a single gentle question instead).
export const QUESTIONS = [
  {
    id: "reading-drift",
    kicker: "A quiet one",
    text:
      "Read 50 Books hasn't seen a mark in 6 days. Still part of the plan right now, or resting for a while?",
    yes: { label: "Still on it", response: "Good. I'll leave it be." },
    no: {
      label: "Resting for now",
      response: "Marked resting 🌙 — it won't nag, and it keeps every one of your 16 books.",
    },
  },
  {
    id: "gym-coding",
    kicker: "A question from your week",
    text:
      "Your Leetcode sessions seem stronger on gym days — 3 of your last 4 best sessions came after workouts. Does that match your experience?",
    yes: { label: "Yes, that's real", response: "Noted. Gym → coding link added to your pattern graph." },
    no: { label: "Not really", response: "Discarded. I won't bring this one up again." },
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
// career steady w/ spring peak; health steady; relationships light;
// finance sparse Feb–Jun (the house), then done.
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
      add("finance", m >= 1 && m <= 5 ? 0.12 : 0, 0.4, 0.9);
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
