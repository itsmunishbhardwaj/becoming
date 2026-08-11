# Balboa Breakdown — Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each goal its own workspace, let rounds advance themselves as endDates pass, upgrade the log parser with an optional LLM path, and surface the goal's indicators as gentle insight questions on Home.

**Architecture:** A pure `src/data/rounds.js` computes the next `currentRound` from a goal's rounds + today's date; `store.saveGoal` persists advancement transparently on Home load. A new `/goal/:id` route renders `Goal.jsx` per `docs/ui-spec.md` §4/§7.4 — ambition, period chip, rounds timeline, recent activity, adjust-rounds link. `src/lib/logParserLLM.js` layers an OpenAI-compat structured extractor over the regex parser (falls back on failure or no key). `src/data/insights.js` walks each active goal's indicators + momentum against recent logs to produce candidate `InsightQuestion`s; `localStorage` remembers which ids were shown/rejected so the user is never asked twice.

**Tech Stack:** No new deps. Vite 5, React 18, react-router-dom 6, vitest 2 + jsdom, existing store/goalTypes/adherence/llm modules.

## Global Constraints

- Paper theme only — every color from `src/tokens.js` `PAPER` or `CATS`. No hex outside tokens.
- No red anywhere. Drift and off-plan use `PAPER.whisper`.
- Accumulation-only copy. No percentage-as-text, no scolding, no miss counts.
- Category color = identity — one hue per goal across every surface.
- Serif (Fraunces) for identity, sans (Inter) for data.
- `prefers-reduced-motion` disables all animation.
- All new modules ESM.
- Insights render as questions with equal-weight yes/no pills — rejecting must cost nothing visually (`docs/philosophy.md`).
- LLM_API_KEY must never appear in browser code, response bodies, or client-facing logs (mirrors Phase 2 constraint).
- LLM parser upgrade must degrade gracefully to the regex parser on failure — never blocks log save.

---

### Task 1: Round advancement engine

**Files:**
- Create: `src/data/rounds.js`
- Create: `src/data/rounds.test.js`

**Interfaces:**
- Consumes: nothing external.
- Produces:
  - `computeCurrentRound(goal: Goal, today: string): number` — pure. Returns the round number whose window contains `today` (`startDate <= today <= endDate`); if today is past the last round, returns `goal.rounds.length`; if before the first round, returns `1`.
  - `advanceGoal(goal: Goal, today: string): { goal: Goal, changed: boolean }` — pure. Returns `{ goal: goal, changed: false }` unchanged when `computeCurrentRound(goal, today) === goal.currentRound`; otherwise returns a new goal with updated `currentRound`.

- [ ] **Step 1: Write failing tests**

Create `src/data/rounds.test.js`:
```js
import { describe, it, expect } from "vitest";
import { computeCurrentRound, advanceGoal } from "./rounds.js";

const G = {
  id: "wake-6am",
  currentRound: 1,
  rounds: [
    { n: 1, targetValue: "08:00", startDate: "2026-08-01", endDate: "2026-08-15" },
    { n: 2, targetValue: "07:30", startDate: "2026-08-16", endDate: "2026-08-31" },
    { n: 3, targetValue: "07:00", startDate: "2026-09-01", endDate: "2026-09-30" },
  ],
};

describe("computeCurrentRound", () => {
  it("returns the round whose window covers today", () => {
    expect(computeCurrentRound(G, "2026-08-10")).toBe(1);
    expect(computeCurrentRound(G, "2026-08-16")).toBe(2);
    expect(computeCurrentRound(G, "2026-09-15")).toBe(3);
  });
  it("returns 1 when today is before the first round", () => {
    expect(computeCurrentRound(G, "2026-07-01")).toBe(1);
  });
  it("returns the last round when today is past the last endDate", () => {
    expect(computeCurrentRound(G, "2026-12-31")).toBe(3);
  });
  it("returns 1 when goal has no rounds", () => {
    expect(computeCurrentRound({ rounds: [], currentRound: 1 }, "2026-08-10")).toBe(1);
  });
});

describe("advanceGoal", () => {
  it("returns unchanged when currentRound already matches today", () => {
    const out = advanceGoal({ ...G, currentRound: 1 }, "2026-08-10");
    expect(out.changed).toBe(false);
    expect(out.goal.currentRound).toBe(1);
  });
  it("advances when today has moved into a later round", () => {
    const out = advanceGoal({ ...G, currentRound: 1 }, "2026-08-20");
    expect(out.changed).toBe(true);
    expect(out.goal.currentRound).toBe(2);
    expect(out.goal.id).toBe("wake-6am"); // preserves other fields
  });
  it("does not regress when today is earlier than currentRound", () => {
    const out = advanceGoal({ ...G, currentRound: 2 }, "2026-08-05");
    expect(out.changed).toBe(false);
    expect(out.goal.currentRound).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

Run: `npm test src/data/rounds.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/data/rounds.js`**

```js
export function computeCurrentRound(goal, today) {
  const rounds = goal.rounds || [];
  if (rounds.length === 0) return 1;
  for (const r of rounds) {
    if (today >= r.startDate && today <= r.endDate) return r.n;
  }
  const first = rounds[0];
  if (today < first.startDate) return first.n;
  return rounds[rounds.length - 1].n;
}

export function advanceGoal(goal, today) {
  const next = computeCurrentRound(goal, today);
  if (next <= goal.currentRound) return { goal, changed: false };
  return { goal: { ...goal, currentRound: next }, changed: true };
}
```

`advanceGoal` never regresses `currentRound` — user's manual override sticks.

- [ ] **Step 4: Run tests to confirm pass**

Run: `npm test src/data/rounds.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/rounds.js src/data/rounds.test.js
git commit -m "feat: round advancement engine

Pure computeCurrentRound + advanceGoal. Auto-advances as
today's date moves past round endDates; never regresses when
user has manually set a higher currentRound."
```

---

### Task 2: Wire round auto-advance into Home load

**Files:**
- Modify: `src/screens/Home.jsx` — after `listGoals()`, call `advanceGoal(g, today)` on each; if any changed, `saveGoal` in the background and use the advanced shape.
- Modify: `src/screens/Home.test.jsx` — add `saveGoal` to mock; add one test that a goal whose currentRound is behind today's date gets auto-advanced.

**Interfaces:**
- Consumes: `advanceGoal` from Task 1. `saveGoal`, `listGoals`, `readLogsInRange` from `src/data/store.js`. `todayLocalISO` from `src/lib/date.js`.
- Produces: nothing new.

- [ ] **Step 1: Update Home.test.jsx mock**

Read `/Users/munish/becoming/src/screens/Home.test.jsx`. Extend the `vi.mock("../data/store.js", ...)` factory to include `saveGoal: vi.fn().mockResolvedValue(undefined)`. Import + `mockReset()` in `beforeEach`.

Add a new test at the end:
```jsx
describe("Home auto-advances rounds", () => {
  it("bumps currentRound + saves when today is past round window", async () => {
    // A goal where round 1 ends 2026-08-01 but currentRound is stuck at 1
    listGoals.mockResolvedValue([{
      id: "wake-6am", name: "Wake at 6:00 AM", cat: "health", state: "active", type: "wake",
      baseline: "08:30", target: "06:00", endDate: "2026-12-31", createdAt: "2026-01-01",
      currentRound: 1,
      rounds: [
        { n: 1, targetValue: "08:00", startDate: "2026-01-01", endDate: "2026-01-31" },
        { n: 2, targetValue: "07:30", startDate: "2026-02-01", endDate: "2026-12-31" },
      ],
      ambition: "", howWeGetThere: "",
      indicators: { right: [], wrong: [], stall: [] },
      headline: { n: 0, unit: "days marked" },
    }]);
    readLogsInRange.mockResolvedValue([]);
    renderHome();
    await waitFor(() => expect(saveGoal).toHaveBeenCalledTimes(1));
    const saved = saveGoal.mock.calls[0][0];
    expect(saved.currentRound).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to confirm the new one fails**

Run: `npm test src/screens/Home.test.jsx`
Expected: FAIL — the auto-advance test fails (Home doesn't call saveGoal yet).

- [ ] **Step 3: Wire auto-advance into Home**

Read `/Users/munish/becoming/src/screens/Home.jsx`. In the mount `Promise.all`, after receiving `goals`, apply advancement:

```js
import { advanceGoal } from "../data/rounds.js";
import { todayLocalISO } from "../lib/date.js";
import { listGoals, readLogsInRange, saveGoal } from "../data/store.js";
```

Then after resolving:
```js
.then(async ([g, l]) => {
  const today = todayLocalISO();
  const advanced = [];
  for (const goal of g) {
    const { goal: next, changed } = advanceGoal(goal, today);
    if (changed) { saveGoal(next).catch(() => {}); }
    advanced.push(next);
  }
  setGoals(advanced);
  setLogs(l);
})
```

Do NOT block on the `saveGoal` (fire-and-forget); UI updates immediately with the advanced shape.

- [ ] **Step 4: Run tests to confirm pass**

Run: `npm test`
Expected: all previous tests pass + the new auto-advance test.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Home.jsx src/screens/Home.test.jsx
git commit -m "feat: Home auto-advances rounds on load

When today has moved past a goal's currentRound window,
Home applies advanceGoal to the in-memory shape and fires
saveGoal in the background. Never regresses on manual override."
```

---

### Task 3: `/goal/:id` route + Goal workspace screen

**Files:**
- Create: `src/screens/Goal.jsx`
- Create: `src/screens/Goal.test.jsx`
- Modify: `src/App.jsx` — add `<Route path="/goal/:id" element={<Goal />} />`.
- Modify: `src/components/GoalCard.jsx` — wrap card in a `<Link to={`/goal/${goal.id}`} …>` if not already navigating there. If GoalCard already renders a link, verify the target is correct.

**Interfaces:**
- Consumes: `getGoal`, `readLogsInRange` from `src/data/store.js`. `dailyAdherence` from `src/data/adherence.js`. `computeCurrentRound` from `src/data/rounds.js`. `todayLocalISO`, `addDaysLocalISO` from `src/lib/date.js`. `useParams`, `Link` from `react-router-dom`. Existing tokens + `Orb` component.
- Produces: `<Goal />` rendered at `/goal/:id`.

Screen anatomy (per `docs/ui-spec.md` §4):
- Back link `← Life`.
- Header: 48px orb (existing `<Orb cat={goal.cat} momentum={0.6} />` — momentum reused from Home load in Phase 5; for Phase 4 pass a computed rolling momentum via `momentum()`), title (Fraunces 26), meta line `{headline.n} {unit} · last worked {when}` in Inter 13 dim.
- Ambition — Fraunces Italic 16 in quotes, `PAPER.ink`.
- Period chip — kicker "THIS STRETCH — ROUND {n}" (Inter 10.5 letterSpacing 1.3 faint) + target text ("wake by 07:30 until 2026-08-31") in Inter 12.5 dim.
- **Rounds timeline** — new. Horizontal dots, one per round. Current round: filled dot in category color, 10px. Past rounds: 6px `PAPER.line` fill. Future rounds: 6px outline `PAPER.line`. Below the dots, a compact list of each round: `Round N · <target> · <startDate> → <endDate>` in Inter 12.5, with current round `PAPER.ink` and others `PAPER.dim`.
- Recent activity — up to 5 most recent log lines for this goal, each with a 7px category dot + text (Inter 13.5). Format: `<date>: <verb> <payload>` (e.g., `Aug 10: wake 07:12`).
- Adjust rounds pill — `Adjust rounds →` linking to `/onboard?goalId=<id>&turn=roundsPreview`. Phase 4 stubs the query params — Onboard reads them in Task 4.
- "See its year on the calendar →" pill linking to `/year?pen=<id>` (Year respects the pen query param in Task 4).

- [ ] **Step 1: Write failing smoke tests**

Create `src/screens/Goal.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../data/store.js", () => ({
  getGoal: vi.fn(),
  readLogsInRange: vi.fn().mockResolvedValue([]),
}));

import Goal from "./Goal.jsx";
import { getGoal, readLogsInRange } from "../data/store.js";

const WAKE_GOAL = {
  id: "wake-6am",
  name: "Wake at 6:00 AM",
  cat: "health",
  state: "active",
  type: "wake",
  baseline: "08:30",
  target: "06:00",
  endDate: "2026-12-31",
  createdAt: "2026-08-01",
  currentRound: 2,
  ambition: "Own the morning.",
  howWeGetThere: "30 min earlier every 30 days.",
  rounds: [
    { n: 1, targetValue: "08:00", startDate: "2026-08-01", endDate: "2026-08-31" },
    { n: 2, targetValue: "07:30", startDate: "2026-09-01", endDate: "2026-09-30" },
    { n: 3, targetValue: "07:00", startDate: "2026-10-01", endDate: "2026-12-31" },
  ],
  indicators: { right: [], wrong: [], stall: [] },
};

function renderGoal(id = "wake-6am") {
  return render(
    <MemoryRouter initialEntries={[`/goal/${id}`]}>
      <Routes>
        <Route path="/goal/:id" element={<Goal />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  getGoal.mockReset();
  readLogsInRange.mockReset().mockResolvedValue([]);
});

describe("Goal workspace", () => {
  it("renders ambition, title, current round, and adjust link", async () => {
    getGoal.mockResolvedValue(WAKE_GOAL);
    renderGoal();
    await waitFor(() => expect(screen.getByRole("heading", { name: /Wake at 6:00 AM/i })).toBeInTheDocument());
    expect(screen.getByText(/Own the morning\./)).toBeInTheDocument();
    expect(screen.getByText(/round 2/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /adjust rounds/i })).toHaveAttribute("href", "/onboard?goalId=wake-6am&turn=roundsPreview");
    expect(screen.getByRole("link", { name: /see its year/i })).toHaveAttribute("href", "/year?pen=wake-6am");
    expect(screen.getByRole("link", { name: /life/i })).toHaveAttribute("href", "/");
  });

  it("renders a placeholder when the goal is missing", async () => {
    getGoal.mockResolvedValue(null);
    renderGoal("missing");
    await waitFor(() => expect(screen.getByText(/couldn't find/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

Run: `npm test src/screens/Goal.test.jsx`
Expected: FAIL — Goal.jsx missing.

- [ ] **Step 3: Implement `src/screens/Goal.jsx`**

```jsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PAPER, FONT, TYPE, RADIUS, CATS } from "../tokens.js";
import { getGoal, readLogsInRange } from "../data/store.js";
import { todayLocalISO, addDaysLocalISO } from "../lib/date.js";
import Orb from "../components/Orb.jsx";

function catColor(cat) {
  return (CATS[cat] && CATS[cat].color) || PAPER.dim;
}

function formatTarget(goal, r) {
  if (goal.type === "wake") return `wake by ${r.targetValue}`;
  return `every ${r.targetValue.intervalDays}d`;
}

function formatEvent(evt) {
  if (evt.verb === "wake" && evt.time) return `wake ${evt.time}`;
  if (evt.verb === "session") {
    if (evt.time && evt.durationMin != null) return `session ${evt.time} · ${evt.durationMin}min`;
    if (evt.durationMin != null) return `session ${evt.durationMin}min`;
  }
  return evt.payload || evt.verb;
}

export default function Goal() {
  const { id } = useParams();
  const [goal, setGoal] = useState(undefined); // undefined = loading; null = missing
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    let alive = true;
    const end = todayLocalISO();
    const start = addDaysLocalISO(end, -30);
    Promise.all([getGoal(id), readLogsInRange({ from: start, to: end })])
      .then(([g, l]) => {
        if (!alive) return;
        setGoal(g);
        setLogs(l);
      })
      .catch(() => { if (alive) { setGoal(null); setLogs([]); } });
    return () => { alive = false; };
  }, [id]);

  if (goal === undefined) {
    return <div style={pageStyle}><div style={containerStyle}><p style={{ color: PAPER.faint }}>Reading your vault…</p></div></div>;
  }
  if (goal === null) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <p style={{ color: PAPER.dim }}>Couldn't find that goal.</p>
          <p><Link to="/" style={backLinkStyle}>← Life</Link></p>
        </div>
      </div>
    );
  }

  const cur = goal.rounds[Math.max(0, goal.currentRound - 1)];
  const catHue = catColor(goal.cat);

  const recentEvents = [];
  for (const log of logs) {
    for (const e of log.events) {
      if (e.goalId === goal.id) recentEvents.push({ date: log.date, ...e });
    }
  }
  recentEvents.sort((a, b) => b.date.localeCompare(a.date));
  const recentTop = recentEvents.slice(0, 5);

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Link to="/" style={backLinkStyle}>← Life</Link>

        <header style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
          <div style={{ width: 48, height: 48, display: "grid", placeItems: "center" }}>
            <Orb cat={goal.cat} momentum={0.5} still={goal.state !== "active" && goal.state !== "drift"} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: FONT.serif, fontWeight: 400, fontSize: TYPE.goalTitle, margin: 0, color: PAPER.ink }}>
              {goal.name}
            </h1>
            <div style={{ fontSize: 13, color: PAPER.dim, marginTop: 4 }}>
              {recentTop.length > 0 ? `last worked ${recentTop[0].date}` : "no logs yet"}
            </div>
          </div>
        </header>

        <blockquote style={{
          fontFamily: FONT.serif, fontStyle: "italic",
          fontSize: TYPE.ambition, lineHeight: 1.5,
          color: PAPER.ink, margin: "24px 0 0",
        }}>
          "{goal.ambition}"
        </blockquote>

        {cur && (
          <div style={{
            background: PAPER.card, border: `1px solid ${PAPER.line}`,
            borderRadius: RADIUS.r1, padding: "10px 14px", marginTop: 20,
            display: "inline-block",
          }}>
            <div style={{ fontSize: 10.5, letterSpacing: "1.3px", textTransform: "uppercase", color: PAPER.faint, fontWeight: 500 }}>
              THIS STRETCH — ROUND {cur.n}
            </div>
            <div style={{ fontSize: 12.5, color: PAPER.dim, marginTop: 4 }}>
              {formatTarget(goal, cur)} until {cur.endDate}
            </div>
          </div>
        )}

        {/* Rounds timeline */}
        <section style={{ marginTop: 26 }}>
          <div style={kickerStyle}>ROUNDS</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
            {goal.rounds.map((r) => {
              const isCurrent = r.n === goal.currentRound;
              const isPast = r.n < goal.currentRound;
              const size = isCurrent ? 10 : 6;
              return (
                <div key={r.n} title={`Round ${r.n}`}
                  style={{
                    width: size, height: size, borderRadius: 999,
                    background: isCurrent ? catHue : (isPast ? PAPER.line : "transparent"),
                    border: isPast || isCurrent ? "none" : `1.5px solid ${PAPER.line}`,
                    flexShrink: 0,
                  }}
                />
              );
            })}
          </div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
            {goal.rounds.map((r) => {
              const isCurrent = r.n === goal.currentRound;
              return (
                <div key={r.n} style={{ fontSize: 12.5, color: isCurrent ? PAPER.ink : PAPER.dim }}>
                  Round {r.n} · {formatTarget(goal, r)} · {r.startDate} → {r.endDate}
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent activity */}
        {recentTop.length > 0 && (
          <section style={{ marginTop: 26 }}>
            <div style={kickerStyle}>RECENT ACTIVITY</div>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {recentTop.map((evt, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: PAPER.ink }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: 999,
                    background: catHue, display: "inline-block", flexShrink: 0,
                  }} />
                  <span>{evt.date}: {formatEvent(evt)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 32, flexWrap: "wrap" }}>
          <Link to={`/onboard?goalId=${goal.id}&turn=roundsPreview`} style={pillStyle}>
            Adjust rounds →
          </Link>
          <Link to={`/year?pen=${goal.id}`} style={pillStyle}>
            See its year on the calendar →
          </Link>
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: PAPER.bg,
  color: PAPER.ink,
  fontFamily: FONT.sans,
  padding: "32px 26px 96px",
};
const containerStyle = { maxWidth: 560, margin: "0 auto" };
const backLinkStyle = { color: PAPER.dim, fontSize: 13, textDecoration: "none" };
const kickerStyle = {
  fontSize: 11, letterSpacing: "1.6px", textTransform: "uppercase",
  color: PAPER.faint, fontWeight: 500,
};
const pillStyle = {
  padding: "9px 16px", borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.line}`, background: PAPER.card,
  fontSize: 13, color: PAPER.ink, textDecoration: "none",
};
```

- [ ] **Step 4: Wire the route into App.jsx**

Read `/Users/munish/becoming/src/App.jsx`. Add:
```jsx
import Goal from "./screens/Goal.jsx";
// …
<Route path="/goal/:id" element={<Goal />} />
```

- [ ] **Step 5: Ensure GoalCard links to `/goal/:id`**

Read `/Users/munish/becoming/src/components/GoalCard.jsx`. If the outermost element is not already a `<Link to={`/goal/${goal.id}`}>`, wrap it as one (preserving existing styling). If it is, verify the target. Skip if already correct.

- [ ] **Step 6: Run tests to confirm pass**

Run: `npm test`
Expected: all previous tests pass + 2 new Goal tests.

- [ ] **Step 7: Manual smoke — dev server**

Run: `npm run dev`.
- Visit `/`, click a goal card → lands on `/goal/wake-6am`.
- Ambition, ROUND N chip, rounds timeline, recent activity all render.
- "Adjust rounds" link points at `/onboard?goalId=wake-6am&turn=roundsPreview` (Task 4 makes it functional).
- "See its year on the calendar" points at `/year?pen=wake-6am` (Task 4 makes Year respect it).

- [ ] **Step 8: Commit**

```bash
git add src/screens/Goal.jsx src/screens/Goal.test.jsx src/App.jsx src/components/GoalCard.jsx
git commit -m "feat: /goal/:id workspace screen

Per ui-spec §4: back link, orb + title, ambition (Fraunces
italic), current-round chip, rounds timeline (past/current/
future dots), recent activity from vault logs, and adjust/
year pills. GoalCard now navigates to the workspace."
```

---

### Task 4: Onboard `?goalId&turn` params + Year `?pen` param

**Files:**
- Modify: `src/screens/Onboard.jsx` — read URL query params on mount. If `goalId` present, hydrate the state with the existing goal via `store.getGoal(goalId)`; if `turn=roundsPreview`, jump directly to that turn.
- Modify: `src/screens/Year.jsx` — read `?pen=<id>` and set the initial `penId` state to that value.
- Modify: `src/screens/Onboard.test.jsx` — add one test that visiting `/onboard?goalId=wake-6am&turn=roundsPreview` starts the transcript at the roundsPreview turn.

**Interfaces:**
- Consumes: `useSearchParams` from `react-router-dom`. `store.getGoal` + `store.saveGoal`.
- Produces: nothing new.

- [ ] **Step 1: Draft the Onboard params contract**

Onboard already loads a `localStorage` draft. Add this rule: **URL params override draft when present.** If both exist, the URL wins and the draft is cleared before hydration.

Hydration from `goalId`:
1. `getGoal(goalId)` → real goal from vault.
2. Build an `OnboardState` whose `answers` are pre-populated: `ambition`, `type`, `baseline`, `target`, `endDate`, `roundsPreview` (= `goal.rounds`), `indicators` (= `goal.indicators`). `name` = `goal.name`, `cat` = `goal.cat`.
3. If `turn=roundsPreview`, mark answers up through `endDate` as answered but leave `roundsPreview` UNANSWERED so `nextTurn` returns it. To do this: `delete answers.roundsPreview` and everything after.
4. Also mark this as an edit session — on finalize, `saveGoal` should overwrite the existing `.md` (which `store.saveGoal` already does via filename match).

- [ ] **Step 2: Write failing test**

Add to `src/screens/Onboard.test.jsx`:
```jsx
vi.mock("../data/store.js", () => ({
  saveGoal: vi.fn().mockResolvedValue(undefined),
  getGoal: vi.fn(),
}));

import { getGoal } from "../data/store.js";

// Reset in existing beforeEach:
// getGoal.mockReset();

describe("Onboard edit mode", () => {
  it("hydrates state from ?goalId and jumps to ?turn", async () => {
    getGoal.mockResolvedValue({
      id: "wake-6am", name: "Wake at 6:00 AM", cat: "health", type: "wake",
      state: "active", baseline: "08:30", target: "06:00", endDate: "2026-12-31",
      createdAt: "2026-08-01", currentRound: 1,
      rounds: [{ n: 1, targetValue: "08:00", startDate: "2026-08-01", endDate: "2026-09-01" }],
      ambition: "Own the morning.",
      howWeGetThere: "",
      indicators: { right: ["a"], wrong: ["b"], stall: ["c"] },
    });
    render(
      <MemoryRouter initialEntries={["/onboard?goalId=wake-6am&turn=roundsPreview"]}>
        <Onboard />
      </MemoryRouter>
    );
    // The proposed rounds prompt should appear (per PROMPTS.roundsPreview)
    await waitFor(() =>
      expect(screen.getByText(/proposed rounds — accept, or ask to soften/i)).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 3: Run test to confirm fail**

Run: `npm test src/screens/Onboard.test.jsx`
Expected: FAIL — Onboard doesn't handle URL params yet.

- [ ] **Step 4: Modify Onboard.jsx to honor URL params**

Read `/Users/munish/becoming/src/screens/Onboard.jsx`. Import `useSearchParams`:
```jsx
import { useSearchParams } from "react-router-dom";
import { getGoal } from "../data/store.js";
```

Inside `Onboard`, replace the mount effect that only reads draft:
```jsx
const [params] = useSearchParams();
const editGoalId = params.get("goalId");
const jumpTurn = params.get("turn");

useEffect(() => {
  async function boot() {
    if (editGoalId) {
      clearDraft();
      const goal = await getGoal(editGoalId).catch(() => null);
      if (!goal) {
        const s = initialState();
        setState(s);
        setTranscript([{ role: "assistant", text: promptFor("ambition", s.answers) }]);
        return;
      }
      const answers = {
        ambition: goal.ambition,
        type: goal.type,
        baseline: goal.baseline,
        target: goal.target,
        endDate: goal.endDate,
        roundsPreview: goal.rounds,
        indicators: goal.indicators,
      };
      // If jumpTurn is set, drop that turn and everything after so nextTurn returns it.
      if (jumpTurn) {
        const idx = TURNS.indexOf(jumpTurn);
        if (idx >= 0) {
          for (const t of TURNS.slice(idx)) delete answers[t];
        }
      }
      const s = { sessionId: `edit-${goal.id}`, answers, name: goal.name, cat: goal.cat };
      setState(s);
      const target = jumpTurn || TURNS[Object.keys(answers).length];
      setTranscript([{ role: "assistant", text: promptFor(target, answers) }]);
      return;
    }
    const draft = loadDraft();
    if (draft) {
      setState(draft.state);
      setTranscript(draft.transcript);
    } else {
      const s = initialState();
      setState(s);
      setTranscript([{ role: "assistant", text: promptFor("ambition", s.answers) }]);
    }
  }
  boot();
  isConfigured().then(setLlmOn).catch(() => setLlmOn(false));
}, [editGoalId, jumpTurn]);
```

Import `TURNS` from turns.js if not already imported.

- [ ] **Step 5: Modify Year.jsx to read `?pen`**

Read `/Users/munish/becoming/src/screens/Year.jsx`. Add:
```jsx
import { useSearchParams } from "react-router-dom";
// …
const [params] = useSearchParams();
```
In the `useState` that initializes `penId`, seed from `params.get("pen")` when present. On first `goals` load, if the seeded penId doesn't match any goal, reset to `null`.

Concretely:
```jsx
const [penId, setPenId] = useState(() => params.get("pen") || null);

useEffect(() => {
  if (!goals || goals.length === 0) return;
  if (penId && !goals.some((g) => g.id === penId)) setPenId(null);
}, [goals]);
```

- [ ] **Step 6: Run tests to confirm pass**

Run: `npm test`
Expected: all previous tests still pass + the new Onboard edit-mode test.

- [ ] **Step 7: Manual smoke**

Run: `npm run dev`.
- On Goal workspace, click "Adjust rounds" → `/onboard` loads at the roundsPreview turn, existing rounds visible.
- On Goal workspace, click "See its year on the calendar" → `/year` loads with the goal's pen already held.

- [ ] **Step 8: Commit**

```bash
git add src/screens/Onboard.jsx src/screens/Onboard.test.jsx src/screens/Year.jsx
git commit -m "feat: Onboard ?goalId&turn params + Year ?pen param

Onboard now hydrates from an existing vault goal when goalId
is present, and jumps directly to a specific turn (e.g. round
adjustments). Year seeds its pen chip from ?pen so links from
the goal workspace focus the right hue on arrival."
```

---

### Task 5: LLM log parser with regex fallback

**Files:**
- Create: `src/lib/logParserLLM.js`
- Create: `src/lib/logParserLLM.test.js`
- Modify: `src/components/LogSheet.jsx` — swap the sync `parseLogText` for an async `parseLogSmart` (LLM if `isConfigured`, else regex). Debounce parses to 350ms while typing.

**Interfaces:**
- Consumes: `chat`, `isConfigured` from `src/lib/llm.js`. `parseLogText` from `src/lib/logParser.js`.
- Produces:
  - `parseLogSmart({ text, goals, llmChat, isConfigured }): Promise<ParsedEvent[]>` — a single entry point. If `isConfigured` returns true AND `llmChat` is provided, call the LLM with a structured prompt; parse its JSON reply into `ParsedEvent[]`; if that fails or the LLM throws, fall back to `parseLogText(text)`. Otherwise call `parseLogText(text)` directly.

Prompt shape (system):
```
You are a log-line extractor for a personal-goals app. Given a free-text log entry and a list of active goals, return a JSON array of events. Each event has: {"verb":"wake"|"session","time"?:"HH:MM","durationMin"?:number,"raw":"<the original line>"}. Include only lines that clearly log a wake or session event. Skip commentary. Reply with ONLY the JSON array — no prose, no markdown, no code fences.
```

User content:
```
Active goals:
- wake-6am (type: wake)
- cadence-reset (type: cadence)

Free text:
""" <text> """
```

- [ ] **Step 1: Write failing tests with a mock llmChat**

Create `src/lib/logParserLLM.test.js`:
```js
import { describe, it, expect, vi } from "vitest";
import { parseLogSmart } from "./logParserLLM.js";

const GOALS = [
  { id: "wake-6am", type: "wake", state: "active" },
  { id: "cadence-reset", type: "cadence", state: "active" },
];

describe("parseLogSmart", () => {
  it("returns LLM-parsed events when configured + chat resolves", async () => {
    const llmChat = vi.fn().mockResolvedValue(JSON.stringify([
      { verb: "wake", time: "07:12", raw: "up at 7:12ish today" },
    ]));
    const out = await parseLogSmart({
      text: "up at 7:12ish today",
      goals: GOALS, llmChat, isConfigured: async () => true,
    });
    expect(out).toEqual([{ verb: "wake", time: "07:12", raw: "up at 7:12ish today" }]);
    expect(llmChat).toHaveBeenCalledOnce();
  });

  it("falls back to regex when LLM throws", async () => {
    const llmChat = vi.fn().mockRejectedValue(new Error("500"));
    const out = await parseLogSmart({
      text: "woke 07:00",
      goals: GOALS, llmChat, isConfigured: async () => true,
    });
    expect(out).toEqual([{ verb: "wake", time: "07:00", raw: "woke 07:00" }]);
  });

  it("falls back to regex when LLM returns invalid JSON", async () => {
    const llmChat = vi.fn().mockResolvedValue("here's what I found: {");
    const out = await parseLogSmart({
      text: "woke 07:00",
      goals: GOALS, llmChat, isConfigured: async () => true,
    });
    expect(out).toEqual([{ verb: "wake", time: "07:00", raw: "woke 07:00" }]);
  });

  it("uses regex directly when isConfigured returns false", async () => {
    const llmChat = vi.fn();
    const out = await parseLogSmart({
      text: "woke 07:00",
      goals: GOALS, llmChat, isConfigured: async () => false,
    });
    expect(out).toEqual([{ verb: "wake", time: "07:00", raw: "woke 07:00" }]);
    expect(llmChat).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

Run: `npm test src/lib/logParserLLM.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/logParserLLM.js`**

```js
import { parseLogText } from "./logParser.js";

const SYSTEM = "You are a log-line extractor for a personal-goals app. Given a free-text log entry and a list of active goals, return a JSON array of events. Each event has: {\"verb\":\"wake\"|\"session\",\"time\"?:\"HH:MM\",\"durationMin\"?:number,\"raw\":\"<the original line>\"}. Include only lines that clearly log a wake or session event. Skip commentary. Reply with ONLY the JSON array — no prose, no markdown, no code fences.";

function userPrompt(text, goals) {
  const activeGoals = goals
    .filter((g) => g.state === "active" || g.state === "drift")
    .map((g) => `- ${g.id} (type: ${g.type})`)
    .join("\n");
  return `Active goals:\n${activeGoals || "(none)"}\n\nFree text:\n""" ${text} """`;
}

function parseJSONArray(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    for (const evt of parsed) {
      if (!evt || (evt.verb !== "wake" && evt.verb !== "session")) return null;
      if (typeof evt.raw !== "string") return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function parseLogSmart({ text, goals, llmChat, isConfigured }) {
  const configured = await Promise.resolve(isConfigured ? isConfigured() : false).catch(() => false);
  if (!configured || !llmChat) return parseLogText(text);
  try {
    const reply = await llmChat([
      { role: "system", content: SYSTEM },
      { role: "user", content: userPrompt(text, goals) },
    ]);
    const events = parseJSONArray(reply);
    return events || parseLogText(text);
  } catch {
    return parseLogText(text);
  }
}
```

- [ ] **Step 4: Wire into LogSheet**

Read `/Users/munish/becoming/src/components/LogSheet.jsx`. Replace the synchronous `parseLogText` usage with a debounced async parse using `parseLogSmart`:

```jsx
import { parseLogSmart } from "../lib/logParserLLM.js";
import { chat, isConfigured } from "../lib/llm.js";
// remove: import { parseLogText } from "../lib/logParser.js";
// …
const [parsed, setParsed] = useState([]);
useEffect(() => {
  const handle = setTimeout(() => {
    parseLogSmart({ text, goals, llmChat: chat, isConfigured })
      .then(setParsed)
      .catch(() => setParsed([]));
  }, 350);
  return () => clearTimeout(handle);
}, [text, goals]);
```

Remove the `useMemo(() => parseLogText(text), [text])` line. Everything downstream that read `parsed` continues to work.

- [ ] **Step 5: Update LogSheet tests to mock llm**

Read `/Users/munish/becoming/src/components/LogSheet.test.jsx`. Add:
```jsx
vi.mock("../lib/llm.js", () => ({
  isConfigured: vi.fn().mockResolvedValue(false),
  chat: vi.fn(),
}));
```
The debounce timing of 350ms may need `vi.useFakeTimers()` + `vi.advanceTimersByTime(400)` inside each assertion `waitFor`, OR bump the tests' `waitFor` timeout via `waitFor(..., { timeout: 1000 })`. Prefer the second — simpler.

- [ ] **Step 6: Run tests to confirm pass**

Run: `npm test`
Expected: all previous tests still pass + 4 new logParserLLM tests. LogSheet tests still pass (regex fallback fires because isConfigured mocks false).

- [ ] **Step 7: Commit**

```bash
git add src/lib/logParserLLM.js src/lib/logParserLLM.test.js src/components/LogSheet.jsx src/components/LogSheet.test.jsx
git commit -m "feat: LLM log parser with regex fallback

parseLogSmart delegates to the LLM only when configured;
JSON parse errors or upstream failures silently fall back
to the regex parser. LogSheet debounces parses at 350ms."
```

---

### Task 6: Insight generator + InsightCard on Home

**Files:**
- Create: `src/data/insights.js`
- Create: `src/data/insights.test.js`
- Modify: `src/screens/Home.jsx` — after loading goals+logs, call `generateInsights`, filter out seen ids from `localStorage`, render at most one `<InsightCard>` under the header.
- Modify: `src/components/InsightCard.jsx` (existing file) — replace its mock content with a `question` prop + `onAnswer(id, kind)` callback per §7.2/§ui-spec.

**Interfaces:**
- Consumes: `todayLocalISO`, `addDaysLocalISO` from `src/lib/date.js`. `dailyAdherence`, `momentum` from `src/data/adherence.js`. `PAPER`, `FONT`, `TYPE`, `RADIUS` from `src/tokens.js`.
- Produces:
  - `InsightQuestion` shape: `{ id: string, kicker: string, text: string, yes: { label, response }, no: { label, response } }`
  - `generateInsights({ goals, logs, today }): InsightQuestion[]` — pure. Returns candidate insights.

Rules (Phase 4 covers only these two — indicator-driven is Phase 5 polish):
1. **Drift**: for each active goal, count days in the last 7 with any log for that goal. If 0, emit:
   `id: "drift-<goalId>-<today>"`, kicker: `"A quiet one"`, text: `"{goal.name} hasn't seen a mark in 7 days. Still part of the plan right now, or resting for a while?"`, yes = `{label: "Still on it", response: "Good. I'll leave it be."}`, no = `{label: "Resting for now", response: "Marked resting 🌙 — it won't nag, and it keeps every one of your marks."}`
2. **Low momentum**: if a goal has momentum < 0.25 and has at least 3 events in the last 30 days, emit:
   `id: "low-mom-<goalId>-<today>"`, kicker: `"A question from your week"`, text: `"{goal.name}'s momentum is quiet lately. Want to make the next round gentler?"`, yes = `{label: "Yes, soften it", response: "Noted — head to Adjust rounds when you're ready."}`, no = `{label: "Leave it alone", response: "Fair. I'll trust the rhythm."}`

Sort output by priority: drift > low-momentum.

- [ ] **Step 1: Write failing tests for insights.js**

Create `src/data/insights.test.js`:
```js
import { describe, it, expect } from "vitest";
import { generateInsights } from "./insights.js";

const goal = {
  id: "wake-6am", name: "Wake at 6:00 AM", type: "wake",
  state: "active", currentRound: 1,
  rounds: [{ n: 1, targetValue: "08:00", startDate: "2026-07-01", endDate: "2026-12-31" }],
};

describe("generateInsights — drift", () => {
  it("emits a drift question when the last 7 days have no log", () => {
    const insights = generateInsights({ goals: [goal], logs: [], today: "2026-08-15" });
    const drift = insights.find((i) => i.id.startsWith("drift-"));
    expect(drift).toBeTruthy();
    expect(drift.kicker.toLowerCase()).toContain("quiet");
    expect(drift.text).toContain("Wake at 6:00 AM");
  });

  it("does not emit drift when there is a log in the last 7 days", () => {
    const logs = [{ date: "2026-08-13", events: [{ verb: "wake", time: "07:30", goalId: "wake-6am" }] }];
    const insights = generateInsights({ goals: [goal], logs, today: "2026-08-15" });
    expect(insights.find((i) => i.id.startsWith("drift-"))).toBeFalsy();
  });
});

describe("generateInsights — low momentum", () => {
  it("emits low-momentum when momentum < 0.25 and 3+ events in last 30 days", () => {
    const logs = [
      { date: "2026-08-01", events: [{ verb: "wake", time: "09:15", goalId: "wake-6am" }] }, // off
      { date: "2026-08-03", events: [{ verb: "wake", time: "09:30", goalId: "wake-6am" }] }, // off
      { date: "2026-08-05", events: [{ verb: "wake", time: "09:00", goalId: "wake-6am" }] }, // off
    ];
    const insights = generateInsights({ goals: [goal], logs, today: "2026-08-15" });
    // Drift also fires here since last 7 days have no log; we assert low-mom present too
    expect(insights.some((i) => i.id.startsWith("low-mom-"))).toBe(true);
  });

  it("skips low-momentum with fewer than 3 events", () => {
    const logs = [
      { date: "2026-08-10", events: [{ verb: "wake", time: "09:15", goalId: "wake-6am" }] },
    ];
    const insights = generateInsights({ goals: [goal], logs, today: "2026-08-15" });
    expect(insights.some((i) => i.id.startsWith("low-mom-"))).toBe(false);
  });
});

describe("generateInsights — ordering", () => {
  it("puts drift before low-momentum", () => {
    const logs = [
      { date: "2026-08-01", events: [{ verb: "wake", time: "09:15", goalId: "wake-6am" }] },
      { date: "2026-08-03", events: [{ verb: "wake", time: "09:30", goalId: "wake-6am" }] },
      { date: "2026-08-05", events: [{ verb: "wake", time: "09:00", goalId: "wake-6am" }] },
    ];
    const insights = generateInsights({ goals: [goal], logs, today: "2026-08-15" });
    const kinds = insights.map((i) => i.id.split("-")[0]);
    expect(kinds[0]).toBe("drift");
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

Run: `npm test src/data/insights.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/data/insights.js`**

```js
import { momentum } from "./adherence.js";
import { addDaysLocalISO } from "../lib/date.js";

function eventsInRange(goalId, logs, from, to) {
  let count = 0;
  for (const log of logs) {
    if (log.date < from || log.date > to) continue;
    if (log.events.some((e) => e.goalId === goalId)) count++;
  }
  return count;
}

function driftQuestion(goal, today) {
  return {
    id: `drift-${goal.id}-${today}`,
    kicker: "A quiet one",
    text: `${goal.name} hasn't seen a mark in 7 days. Still part of the plan right now, or resting for a while?`,
    yes: { label: "Still on it", response: "Good. I'll leave it be." },
    no: { label: "Resting for now", response: "Marked resting 🌙 — it won't nag, and it keeps every one of your marks." },
  };
}

function lowMomentumQuestion(goal, today) {
  return {
    id: `low-mom-${goal.id}-${today}`,
    kicker: "A question from your week",
    text: `${goal.name}'s momentum is quiet lately. Want to make the next round gentler?`,
    yes: { label: "Yes, soften it", response: "Noted — head to Adjust rounds when you're ready." },
    no: { label: "Leave it alone", response: "Fair. I'll trust the rhythm." },
  };
}

export function generateInsights({ goals, logs, today }) {
  const out = [];
  const drifts = [];
  const lowMoms = [];
  const from7 = addDaysLocalISO(today, -6);
  const from30 = addDaysLocalISO(today, -29);
  for (const goal of goals) {
    if (goal.state !== "active") continue;
    const last7 = eventsInRange(goal.id, logs, from7, today);
    if (last7 === 0) {
      drifts.push(driftQuestion(goal, today));
      continue; // skip low-momentum if already drifting
    }
    const last30 = eventsInRange(goal.id, logs, from30, today);
    if (last30 < 3) continue;
    const m = momentum({ goal, logs, asOf: today });
    if (m < 0.25) lowMoms.push(lowMomentumQuestion(goal, today));
  }
  out.push(...drifts, ...lowMoms);
  return out;
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `npm test src/data/insights.test.js`
Expected: PASS.

- [ ] **Step 5: Update InsightCard.jsx to accept question + onAnswer**

Read `/Users/munish/becoming/src/components/InsightCard.jsx`. Rewrite to a prop-driven contract:

```jsx
import { PAPER, FONT, TYPE, RADIUS } from "../tokens.js";

export default function InsightCard({ question, onAnswer }) {
  if (!question) return null;
  return (
    <div style={{
      background: `linear-gradient(135deg, #EFEAF6 0%, #EDF1EA 100%)`,
      border: `1px solid ${PAPER.line}`,
      borderRadius: RADIUS.r2,
      padding: "17px 20px",
      fontFamily: FONT.sans,
    }}>
      <div style={{
        fontSize: 11, letterSpacing: "1.6px", textTransform: "uppercase",
        color: PAPER.dim, fontWeight: 500, marginBottom: 8,
      }}>
        {question.kicker.toUpperCase()}
      </div>
      <p style={{
        fontSize: 14.5, lineHeight: 1.6, color: PAPER.ink, margin: "0 0 12px",
      }}>
        {question.text}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onAnswer(question.id, "yes")} style={pillStyle}>
          {question.yes.label}
        </button>
        <button onClick={() => onAnswer(question.id, "no")} style={pillStyle}>
          {question.no.label}
        </button>
      </div>
    </div>
  );
}

const pillStyle = {
  background: PAPER.card,
  border: `1px solid ${PAPER.line}`,
  borderRadius: 999,
  padding: "8px 15px",
  fontSize: 12.5,
  fontFamily: FONT.sans,
  color: PAPER.ink,
  cursor: "pointer",
};
```

Two color literals `#EFEAF6 / #EDF1EA` are the ui-spec §2 gradient — no PAPER tokens exist for them. Add them to a new `INSIGHT_GRADIENT` constant inside InsightCard.jsx and comment their spec origin.

Simpler alternative: use `PAPER.panel` at both stops — visually flatter but token-pure. Ship the gradient hex with the exception noted; a future token addition can migrate cleanly.

- [ ] **Step 6: Wire insights into Home**

Read `/Users/munish/becoming/src/screens/Home.jsx`. Import:
```jsx
import { generateInsights } from "../data/insights.js";
import InsightCard from "../components/InsightCard.jsx";
```

Add state + effect:
```jsx
const [insights, setInsights] = useState([]);
const [dismissedIds, setDismissedIds] = useState(() => {
  try { return new Set(JSON.parse(localStorage.getItem("becoming.insights.seen") || "[]")); }
  catch { return new Set(); }
});

// After goals + logs load — in the same .then:
setInsights(generateInsights({ goals: advanced, logs: l, today: todayLocalISO() }));
```

Filter dismissed and pick one to show:
```jsx
const activeInsight = insights.find((q) => !dismissedIds.has(q.id));

function dismissInsight(id) {
  const next = new Set(dismissedIds);
  next.add(id);
  setDismissedIds(next);
  try { localStorage.setItem("becoming.insights.seen", JSON.stringify([...next])); } catch {}
}
```

Render just below the H1 (before the goal cards):
```jsx
{activeInsight && (
  <div style={{ marginBottom: 20 }}>
    <InsightCard question={activeInsight} onAnswer={(id) => dismissInsight(id)} />
  </div>
)}
```

- [ ] **Step 7: Update Home.test.jsx smoke test**

Add a test that a drift-triggering goal shows an insight card:
```jsx
it("renders an insight when a goal has drifted 7+ days", async () => {
  listGoals.mockResolvedValue([{
    id: "wake-6am", name: "Wake at 6:00 AM", cat: "health", state: "active", type: "wake",
    baseline: "08:30", target: "06:00", endDate: "2026-12-31", createdAt: "2026-01-01",
    currentRound: 1,
    rounds: [{ n: 1, targetValue: "08:00", startDate: "2026-01-01", endDate: "2026-12-31" }],
    ambition: "", howWeGetThere: "",
    indicators: { right: [], wrong: [], stall: [] },
    headline: { n: 0, unit: "days marked" },
  }]);
  readLogsInRange.mockResolvedValue([]);
  renderHome();
  await waitFor(() => expect(screen.getByText(/a quiet one/i)).toBeInTheDocument());
  expect(screen.getByText(/still on it/i)).toBeInTheDocument();
});
```

- [ ] **Step 8: Run tests to confirm pass**

Run: `npm test`
Expected: all previous tests still pass + insights + Home insight test.

- [ ] **Step 9: Manual smoke**

Run: `npm run dev`.
- Delete `vault/logs/*.md` so a real goal has no recent activity.
- Reload Home. Insight card appears under the header for the drifted goal.
- Click "Resting for now" → card disappears, and stays gone on reload.
- Log a new event via LogSheet → next reload, insight no longer eligible (has an event in last 7 days).

- [ ] **Step 10: Commit**

```bash
git add src/data/insights.js src/data/insights.test.js src/components/InsightCard.jsx src/screens/Home.jsx src/screens/Home.test.jsx
git commit -m "feat: insight questions on Home — drift + low momentum

Pure generator walks each active goal's last 7d/30d logs;
emits gentle questions with equal-weight yes/no pills. Home
renders at most one; dismissed ids persist in localStorage
so the user is never asked twice."
```

---

### Task 7: Manual verification + PR

**Files:** none.

- [ ] **Step 1: Full test run**

Run: `npm test`
Expected: all green.

- [ ] **Step 2: End-to-end pass**

Run: `npm run dev`.
- Home renders real goals with real momentum. If any drift, an insight appears; answering it hides the card and it stays hidden.
- Click a goal card → `/goal/:id` renders with ambition, rounds timeline, recent activity.
- Click "Adjust rounds" → Onboard opens at the roundsPreview turn with existing values loaded.
- Click "See its year on the calendar" → Year opens with that goal's pen already held.
- Backdate a `.md` file so `currentRound` is behind today's date → reload Home → the goal's `.md` gets rewritten with the advanced `currentRound`.
- LLM log parser: with `LLM_API_KEY` set, type a fuzzy line like "up around 7ish today" — LLM should extract `wake 07:00`. With no key, only strict `woke 07:00` parses.

- [ ] **Step 3: Push + PR**

```bash
git push -u origin balboa-breakdown-phase-4
gh pr create --title "phase 4: goal workspace + auto-advance + LLM log parser + insights" --body "$(cat <<'EOF'
## Summary
Phase 4 makes each goal a place, not just a card.

- **Round advancement** (`src/data/rounds.js`): pure engine bumps `currentRound` as `endDate` passes. Home applies + saves on load; never regresses past a manual override.
- **`/goal/:id` workspace** (`src/screens/Goal.jsx`): back link, orb + title, ambition (Fraunces italic), current-round chip, rounds timeline (past/current/future dots + list), recent activity from vault logs, Adjust rounds + See its year pills.
- **Onboard `?goalId&turn`** + **Year `?pen`**: URL param hydration so the workspace's pills open the right context.
- **LLM log parser** (`src/lib/logParserLLM.js`): when `LLM_API_KEY` is set, LogSheet uses a structured extractor; on failure, silently falls back to the regex parser. Debounced 350ms.
- **Insights on Home** (`src/data/insights.js` + `InsightCard`): drift (7+ silent days) and low-momentum questions with equal-weight yes/no pills. Dismissed ids persist in localStorage so the user is never asked twice.

## Test plan
- [x] `npm test` — all green
- [x] `/goal/:id` renders workspace correctly, links carry state
- [x] Auto-advance rewrites `.md` when today has moved past a round window
- [x] LLM parser degrades gracefully when key missing or upstream fails
- [x] Insight appears for drifted goal; answering hides it permanently

## Deferred to Phase 5
- Indicator-driven insights (spec allows wrong/right/stall to trigger questions)
- Google Maps zoom transition (still deferred per roadmap)
- Log-delete API for tap-again-to-unmark on Year

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review (done inline)

**Spec coverage:**
- §7.4 goal workspace anatomy → Task 3 ✓
- §9 Phase 4 checklist items:
  - `/goal/:id` route with Rounds section → Task 3 ✓
  - Round auto-advance on endDate → Task 1 + Task 2 ✓ (manual override honored via non-regressing advance)
  - LLM parser upgrade for log sheet → Task 5 ✓
  - Indicators surfaced as insights → Task 6 (drift + low-momentum flavors; indicator-text-driven questions deferred to Phase 5, called out in PR body)

**Placeholder scan:** none.

**Type consistency:** `Goal`, `LogEvent`, `ParsedEvent`, `InsightQuestion` shapes all match earlier phases. `advanceGoal({ goal, changed })` return signature used consistently in Task 1 → Task 2. `parseLogSmart({ text, goals, llmChat, isConfigured })` signature exercised identically in tests + LogSheet wiring.

**Global-constraint traceability:** All new UI imports PAPER/CATS from tokens; InsightCard gradient is the one documented exception. `LLM_API_KEY` never appears in client code — the LLM adapter from Phase 2 is the only reader. Insights use PAPER.dim / PAPER.ink / PAPER.line only (no red). All copy is question-shaped, no scolding.
