# Balboa Breakdown — Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the loop. Users log daily wake times and cadence sessions through a bottom-sheet log FAB; the Year screen paints those logs as real adherence marks; Home orbs carry real 14-day momentum. Vault becomes a system that reflects the user back to themselves.

**Architecture:** A pure regex parser (`src/lib/logParser.js`) turns free text into typed `LogEvent`s. A pure adherence engine (`src/data/adherence.js`) walks a goal's rounds against a date range and produces per-day statuses (`hit`/`soft`/`off`/`clean`/`none`) via `goalTypes/*.adherenceForDay`. The LogSheet bottom-sheet component parses, previews, then routes each event to the matching active goal via `store.appendLog`. Home's Orb momentum reads a rolling 14-day adherence ratio; Year replaces synthetic `buildYear` blobs with real per-day marks.

**Tech Stack:** No new dependencies. Vitest 2, React 18, existing store + goalTypes.

## Global Constraints

- Paper theme only — every color from `src/tokens.js` `PAPER` or `CATS`. No hex outside tokens.
- No red anywhere. Off-plan cadence sessions render in `PAPER.whisper`, never a red.
- Accumulation only — no percentage-as-text, no miss counts, no "you missed" strings.
- Category color = identity — one hue per goal across orb, momentum bar, and every Year day mark.
- `prefers-reduced-motion` disables all animation (log-blob breathing + sheet slide).
- All new modules ESM.
- Log events pass through `store.appendLog(date, event)` — idempotent by exact line, format via `logCodec.serializeEvent`.
- Adherence rules from design spec §4/§8:
  - **Wake**: log wake ≤ target+15min → `hit`; 15 < Δ ≤ 45 → `soft`; Δ > 45 → `off`; no log → `none`.
  - **Cadence**: green day (`daysSince(round.startDate) % intervalDays === 0`) + session → `hit`; non-green + no session → `clean`; non-green + session → `off`; green + no session → `none` (no penalty).
- Home momentum = rolling 14 days ending today:
  - Wake: `sum(hit=1, soft=0.5, off=0) / count(logged_days)`; `0` when no logs in window.
  - Cadence: `(hits + clean_skips) / 14`; off counts 0.
- LogSheet layout per `docs/ui-spec.md` §5 (sheet, textarea, extracted rows with category dot + routing meta, confirm pill in `PAPER.affirm`).

---

### Task 1: Log parser

**Files:**
- Create: `src/lib/logParser.js`
- Create: `src/lib/logParser.test.js`

**Interfaces:**
- Consumes: nothing external.
- Produces:
  - `parseLogText(text: string): ParsedEvent[]`
  - `ParsedEvent` shape: `{ verb: "wake" | "session", time?: string, durationMin?: number, raw: string }`
    - No `goalId` — routing is the LogSheet's job (multiple wake goals could exist).
    - `raw` preserves the original line for the LogSheet preview.
    - Unrecognized lines are skipped silently (no throw). Blank lines skipped.

Grammar accepted (one per line):
- Wake: `/^woke?\s+(\d{1,2}:\d{2})/i` or `/^wake\s+at\s+(\d{1,2}:\d{2})/i`
- Session with time + duration: `/^(session|jerked?\s*off|masturbat\w*)\s+(\d{1,2}:\d{2})\s*·?\s*(\d+)\s*min/i`
- Session with only duration: `/^(session|jerked?\s*off|masturbat\w*)\s+(\d+)\s*min/i` (time undefined)

- [ ] **Step 1: Write failing tests**

Create `src/lib/logParser.test.js`:
```js
import { describe, it, expect } from "vitest";
import { parseLogText } from "./logParser.js";

describe("parseLogText — wake events", () => {
  it("parses 'woke 07:12'", () => {
    expect(parseLogText("woke 07:12")).toEqual([
      { verb: "wake", time: "07:12", raw: "woke 07:12" },
    ]);
  });
  it("parses 'wake 06:45'", () => {
    expect(parseLogText("wake 06:45")).toEqual([
      { verb: "wake", time: "06:45", raw: "wake 06:45" },
    ]);
  });
  it("parses 'wake at 07:30'", () => {
    expect(parseLogText("wake at 07:30")).toEqual([
      { verb: "wake", time: "07:30", raw: "wake at 07:30" },
    ]);
  });
});

describe("parseLogText — session events", () => {
  it("parses 'session 22:40 · 18min'", () => {
    expect(parseLogText("session 22:40 · 18min")).toEqual([
      { verb: "session", time: "22:40", durationMin: 18, raw: "session 22:40 · 18min" },
    ]);
  });
  it("parses 'session 15 min' (no time)", () => {
    expect(parseLogText("session 15 min")).toEqual([
      { verb: "session", durationMin: 15, raw: "session 15 min" },
    ]);
  });
  it("parses 'masturbated 22:00 · 20min'", () => {
    const out = parseLogText("masturbated 22:00 · 20min");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ verb: "session", time: "22:00", durationMin: 20 });
  });
});

describe("parseLogText — multi-line + skip", () => {
  it("parses multiple lines and skips blanks + unrecognized", () => {
    const text = `woke 07:00

random note about the day
session 22:15 · 10min
`;
    const out = parseLogText(text);
    expect(out).toHaveLength(2);
    expect(out[0].verb).toBe("wake");
    expect(out[1].verb).toBe("session");
  });
  it("returns empty array for empty or nonsense input", () => {
    expect(parseLogText("")).toEqual([]);
    expect(parseLogText("   \n\n  ")).toEqual([]);
    expect(parseLogText("hello world")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

Run: `npm test src/lib/logParser.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/logParser.js`**

```js
const WAKE_RE = /^(?:wake(?:\s+at)?|woke)\s+(\d{1,2}:\d{2})\s*$/i;
const SESSION_TIME_DUR = /^(?:session|jerked?\s*off|masturbat\w*)\s+(\d{1,2}:\d{2})\s*·?\s*(\d+)\s*min\s*$/i;
const SESSION_DUR_ONLY = /^(?:session|jerked?\s*off|masturbat\w*)\s+(\d+)\s*min\s*$/i;

export function parseLogText(text) {
  if (!text) return [];
  const out = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    let m;
    if ((m = line.match(WAKE_RE))) {
      out.push({ verb: "wake", time: m[1], raw });
      continue;
    }
    if ((m = line.match(SESSION_TIME_DUR))) {
      out.push({ verb: "session", time: m[1], durationMin: Number(m[2]), raw });
      continue;
    }
    if ((m = line.match(SESSION_DUR_ONLY))) {
      out.push({ verb: "session", durationMin: Number(m[1]), raw });
      continue;
    }
    // unrecognized — skip silently
  }
  return out;
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `npm test src/lib/logParser.test.js`
Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/logParser.js src/lib/logParser.test.js
git commit -m "feat: log-sheet regex parser

Turns free-text lines into typed ParsedEvent[]. Skips blanks
and unrecognized lines silently. Routing to a specific goalId
is the caller's job (LogSheet resolves via active goals of
matching type)."
```

---

### Task 2: Adherence engine

**Files:**
- Create: `src/data/adherence.js`
- Create: `src/data/adherence.test.js`

**Interfaces:**
- Consumes:
  - `getType` from `src/data/goalTypes/index.js` (provides `adherenceForDay({ date, currentRound, events })`).
- Produces:
  - `dailyAdherence({ goal, logs, from, to }): Record<string, string>` — map of ISO date → status (`"hit" | "soft" | "off" | "clean" | "none"`) for every date in `[from, to]` inclusive.
    - `logs` is `Array<{ date: string, events: LogEvent[] }>` (shape from `store.readLogsInRange`).
    - The engine picks the round whose window covers each date; defaults to `goal.rounds[goal.currentRound - 1]` if a date is outside any round window.
  - `momentum({ goal, logs, asOf }): number` — rolling 14-day adherence per §Global Constraints. `asOf` defaults to today. Returns a number in `[0, 1]`.

- [ ] **Step 1: Write failing tests**

Create `src/data/adherence.test.js`:
```js
import { describe, it, expect } from "vitest";
import { dailyAdherence, momentum } from "./adherence.js";

const WAKE_GOAL = {
  id: "wake-6am",
  type: "wake",
  currentRound: 1,
  rounds: [
    { n: 1, targetValue: "08:00", startDate: "2026-08-10", endDate: "2026-08-24" },
  ],
};

const CADENCE_GOAL = {
  id: "cadence-reset",
  type: "cadence",
  currentRound: 1,
  rounds: [
    { n: 1, targetValue: { intervalDays: 2 }, startDate: "2026-08-10", endDate: "2026-08-24" },
  ],
};

describe("dailyAdherence — wake", () => {
  it("marks hit/soft/off/none per rule bands", () => {
    const logs = [
      { date: "2026-08-11", events: [{ verb: "wake", time: "08:05", goalId: "wake-6am" }] }, // Δ=5 → hit
      { date: "2026-08-12", events: [{ verb: "wake", time: "08:30", goalId: "wake-6am" }] }, // Δ=30 → soft
      { date: "2026-08-13", events: [{ verb: "wake", time: "09:15", goalId: "wake-6am" }] }, // Δ=75 → off
      // 2026-08-14 no log → none
    ];
    const out = dailyAdherence({ goal: WAKE_GOAL, logs, from: "2026-08-11", to: "2026-08-14" });
    expect(out).toEqual({
      "2026-08-11": "hit",
      "2026-08-12": "soft",
      "2026-08-13": "off",
      "2026-08-14": "none",
    });
  });
});

describe("dailyAdherence — cadence", () => {
  it("marks hit/clean/off/none per green-day rule", () => {
    // startDate 2026-08-10 (day 0). intervalDays=2 → green days: 10, 12, 14, ...
    const logs = [
      { date: "2026-08-10", events: [{ verb: "session", durationMin: 12, goalId: "cadence-reset" }] }, // green + session → hit
      { date: "2026-08-11", events: [] }, // non-green + no session → clean
      { date: "2026-08-13", events: [{ verb: "session", durationMin: 8,  goalId: "cadence-reset" }] }, // non-green + session → off
      // 2026-08-12 (green) with no session → none
    ];
    const out = dailyAdherence({ goal: CADENCE_GOAL, logs, from: "2026-08-10", to: "2026-08-13" });
    expect(out).toEqual({
      "2026-08-10": "hit",
      "2026-08-11": "clean",
      "2026-08-12": "none",
      "2026-08-13": "off",
    });
  });
});

describe("momentum — wake", () => {
  it("computes soft-weighted ratio over 14-day window", () => {
    // 3 hits + 1 soft over 4 logged days = (3 + 0.5) / 4 = 0.875
    const logs = [
      { date: "2026-08-11", events: [{ verb: "wake", time: "08:00", goalId: "wake-6am" }] },
      { date: "2026-08-12", events: [{ verb: "wake", time: "08:10", goalId: "wake-6am" }] },
      { date: "2026-08-13", events: [{ verb: "wake", time: "08:12", goalId: "wake-6am" }] },
      { date: "2026-08-14", events: [{ verb: "wake", time: "08:30", goalId: "wake-6am" }] }, // soft
    ];
    const m = momentum({ goal: WAKE_GOAL, logs, asOf: "2026-08-14" });
    expect(m).toBeCloseTo(0.875, 3);
  });

  it("returns 0 when no logs in window", () => {
    expect(momentum({ goal: WAKE_GOAL, logs: [], asOf: "2026-08-14" })).toBe(0);
  });
});

describe("momentum — cadence", () => {
  it("counts hits + clean_skips over full 14 days", () => {
    // 14 days ending 2026-08-23. Round starts 2026-08-10.
    // Green days in window: 10, 12, 14, 16, 18, 20, 22 → 7 green days.
    // Non-green in window: 11, 13, 15, 17, 19, 21, 23 → 7 non-green days.
    // Log a session on every green day → 7 hits.
    // Non-green days with no session → 7 cleans.
    // Momentum = (7 + 7) / 14 = 1.0.
    const logs = [];
    for (const d of ["2026-08-10","2026-08-12","2026-08-14","2026-08-16","2026-08-18","2026-08-20","2026-08-22"]) {
      logs.push({ date: d, events: [{ verb: "session", durationMin: 10, goalId: "cadence-reset" }] });
    }
    const m = momentum({ goal: CADENCE_GOAL, logs, asOf: "2026-08-23" });
    expect(m).toBeCloseTo(1, 3);
  });

  it("subtracts for off-plan sessions", () => {
    // One session on a non-green day inside window → that day counts 0 not clean.
    const logs = [
      { date: "2026-08-11", events: [{ verb: "session", durationMin: 5, goalId: "cadence-reset" }] },
    ];
    const m = momentum({ goal: CADENCE_GOAL, logs, asOf: "2026-08-11" });
    // Window: 2026-07-29 .. 2026-08-11 (14 days ending on asOf).
    // Only 2026-08-11 is inside round 1. All other days are before round start → status "none".
    // "none" contributes 0. So numerator = 0. Denominator = 14. Result 0.
    expect(m).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

Run: `npm test src/data/adherence.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/data/adherence.js`**

```js
import { getType } from "./goalTypes/index.js";

function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function pickRound(goal, date) {
  for (const r of goal.rounds) {
    if (date >= r.startDate && date <= r.endDate) return r;
  }
  return goal.rounds[goal.currentRound - 1];
}

function eventsForGoalOnDay(logs, goalId, date) {
  const log = logs.find((l) => l.date === date);
  if (!log) return [];
  return log.events.filter((e) => e.goalId === goalId);
}

export function dailyAdherence({ goal, logs, from, to }) {
  const t = getType(goal.type);
  const out = {};
  let cur = from;
  while (cur <= to) {
    const round = pickRound(goal, cur);
    const events = eventsForGoalOnDay(logs, goal.id, cur);
    out[cur] = round
      ? t.adherenceForDay({ date: cur, currentRound: round, events })
      : "none";
    cur = addDays(cur, 1);
  }
  return out;
}

const WAKE_WEIGHT = { hit: 1, soft: 0.5, off: 0 };

export function momentum({ goal, logs, asOf }) {
  const end = asOf || today();
  const start = addDays(end, -13);
  const per = dailyAdherence({ goal, logs, from: start, to: end });
  const days = Object.values(per);
  if (goal.type === "wake") {
    let sum = 0, n = 0;
    for (const s of days) {
      if (s in WAKE_WEIGHT) { sum += WAKE_WEIGHT[s]; n++; }
    }
    return n === 0 ? 0 : sum / n;
  }
  // cadence
  let sum = 0;
  for (const s of days) {
    if (s === "hit" || s === "clean") sum += 1;
    // "off" and "none" contribute 0
  }
  return sum / 14;
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `npm test src/data/adherence.test.js`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/data/adherence.js src/data/adherence.test.js
git commit -m "feat: adherence engine — daily statuses + 14-day momentum

Pure walker over goal.rounds × logs. Delegates per-day rules
to goalTypes.adherenceForDay. Momentum weights wake soft=0.5
and treats missed green days as neutral (no penalty)."
```

---

### Task 3: LogSheet component + log-blob FAB on Home

**Files:**
- Create: `src/components/LogSheet.jsx`
- Create: `src/components/LogBlob.jsx`
- Create: `src/components/LogSheet.test.jsx`
- Modify: `src/screens/Home.jsx` — mount `<LogBlob onClick={openSheet} />` when there is ≥1 active goal, and `<LogSheet open={...} onClose={...} onSaved={reload} />` at the page root.

**Interfaces:**
- Consumes:
  - `parseLogText` from `src/lib/logParser.js`
  - `store.listGoals`, `store.appendLog` from `src/data/store.js`
  - `PAPER`, `FONT`, `TYPE`, `RADIUS`, `SPACE`, `CATS` from `src/tokens.js`
- Produces:
  - `<LogBlob onClick />` — 54px round paper button, bottom-right absolute, blob-radius. Renders "+" glyph. Breathes 7s (respects `prefers-reduced-motion`).
  - `<LogSheet open, onClose, onSaved />` — bottom sheet per ui-spec §5.
    - Textarea with placeholder "log your day — just write".
    - After first input, live-parses via `parseLogText` and shows one row per event: 10px category dot + label + routing meta (`8h → wake-6am` etc.). Rows alternate `RADIUS.r1` / `RADIUS.r2`.
    - "Looks right — save" confirm pill (`PAPER.affirm`) writes each event via `store.appendLog(todayISO, {...event, goalId})`. Routing:
      - `verb === "wake"` → first active goal with `type === "wake"`
      - `verb === "session"` → first active goal with `type === "cadence"`
      - If no matching goal, the row shows in `PAPER.whisper` as "no matching goal — skipped" and is NOT written.
    - After save: clear text, call `onSaved`, close sheet.
- On close: sheet slides down (respects `prefers-reduced-motion`).

- [ ] **Step 1: Write failing tests**

Create `src/components/LogSheet.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LogSheet from "./LogSheet.jsx";

vi.mock("../data/store.js", () => ({
  listGoals: vi.fn(),
  appendLog: vi.fn().mockResolvedValue(undefined),
}));

import { listGoals, appendLog } from "../data/store.js";

beforeEach(() => {
  listGoals.mockReset();
  appendLog.mockReset().mockResolvedValue(undefined);
});

const WAKE_GOAL = {
  id: "wake-6am", name: "Wake at 6:00 AM", cat: "health", type: "wake",
  state: "active", rounds: [], currentRound: 1,
};
const CADENCE_GOAL = {
  id: "cadence-reset", name: "Cadence reset", cat: "relationships", type: "cadence",
  state: "active", rounds: [], currentRound: 1,
};

describe("LogSheet parse preview", () => {
  it("shows one row per parsed event with routing target", async () => {
    listGoals.mockResolvedValue([WAKE_GOAL, CADENCE_GOAL]);
    render(<LogSheet open onClose={() => {}} onSaved={() => {}} />);
    const ta = await screen.findByRole("textbox");
    fireEvent.change(ta, { target: { value: "woke 07:12\nsession 22:00 · 15min" } });
    await waitFor(() => {
      expect(screen.getByText(/woke 07:12/i)).toBeInTheDocument();
      expect(screen.getByText(/session 22:00/i)).toBeInTheDocument();
      expect(screen.getAllByText(/→\s*wake-6am/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/→\s*cadence-reset/i).length).toBeGreaterThan(0);
    });
  });

  it("marks a session as skipped when no cadence goal is active", async () => {
    listGoals.mockResolvedValue([WAKE_GOAL]);
    render(<LogSheet open onClose={() => {}} onSaved={() => {}} />);
    const ta = await screen.findByRole("textbox");
    fireEvent.change(ta, { target: { value: "session 22:00 · 15min" } });
    await waitFor(() => expect(screen.getByText(/no matching goal/i)).toBeInTheDocument());
  });
});

describe("LogSheet save", () => {
  it("appends only routable events and calls onSaved + onClose", async () => {
    listGoals.mockResolvedValue([WAKE_GOAL, CADENCE_GOAL]);
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<LogSheet open onClose={onClose} onSaved={onSaved} />);
    const ta = await screen.findByRole("textbox");
    fireEvent.change(ta, { target: { value: "woke 07:00\nrandom note\nsession 12 min" } });
    await waitFor(() => expect(screen.getByRole("button", { name: /looks right — save/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /looks right — save/i }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    // Two writes: wake + session. "random note" skipped by parser.
    expect(appendLog).toHaveBeenCalledTimes(2);
    const goalIds = appendLog.mock.calls.map(([, evt]) => evt.goalId);
    expect(goalIds.sort()).toEqual(["cadence-reset", "wake-6am"]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

Run: `npm test src/components/LogSheet.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/components/LogBlob.jsx`**

```jsx
import { PAPER, FONT, RADIUS } from "../tokens.js";

export default function LogBlob({ onClick }) {
  return (
    <>
      <style>{`
        @keyframes lb-breathe {
          0%,100% { border-radius: 58% 42% 55% 45% / 45% 55% 42% 58%; }
          50%     { border-radius: 45% 55% 42% 58% / 58% 42% 55% 45%; }
        }
        .log-blob { animation: lb-breathe 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .log-blob { animation: none; } }
      `}</style>
      <button
        aria-label="log your day"
        onClick={onClick}
        className="log-blob"
        style={{
          position: "fixed",
          right: 22,
          bottom: 22,
          width: 54,
          height: 54,
          borderRadius: RADIUS.blob,
          background: `linear-gradient(135deg, ${PAPER.card} 0%, ${PAPER.panel} 100%)`,
          border: `1px solid ${PAPER.line}`,
          boxShadow: "0 6px 20px rgba(85,80,92,0.10)",
          color: PAPER.ink,
          fontSize: 27,
          fontFamily: FONT.sans,
          fontWeight: 300,
          cursor: "pointer",
        }}
      >
        +
      </button>
    </>
  );
}
```

- [ ] **Step 4: Implement `src/components/LogSheet.jsx`**

```jsx
import { useEffect, useMemo, useState } from "react";
import { PAPER, FONT, TYPE, RADIUS, SPACE, CATS } from "../tokens.js";
import { parseLogText } from "../lib/logParser.js";
import { listGoals, appendLog } from "../data/store.js";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function catColor(cat) {
  return (CATS[cat] && CATS[cat].color) || PAPER.dim;
}

function routeEvent(evt, goals) {
  const wanted = evt.verb === "wake" ? "wake" : evt.verb === "session" ? "cadence" : null;
  if (!wanted) return null;
  return goals.find((g) => g.type === wanted && (g.state === "active" || g.state === "drift")) || null;
}

function payloadFor(evt) {
  if (evt.verb === "wake" && evt.time) return evt.time;
  if (evt.verb === "session") {
    if (evt.time && evt.durationMin != null) return `${evt.time} · ${evt.durationMin}min`;
    if (evt.durationMin != null) return `${evt.durationMin}min`;
  }
  return evt.raw;
}

export default function LogSheet({ open, onClose, onSaved }) {
  const [text, setText] = useState("");
  const [goals, setGoals] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    listGoals().then(setGoals).catch(() => setGoals([]));
    setText("");
    setError(null);
  }, [open]);

  const parsed = useMemo(() => parseLogText(text), [text]);
  const rows = parsed.map((evt) => {
    const goal = routeEvent(evt, goals);
    return { evt, goal };
  });

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const date = todayISO();
      for (const { evt, goal } of rows) {
        if (!goal) continue;
        await appendLog(date, {
          verb: evt.verb,
          time: evt.time,
          durationMin: evt.durationMin,
          payload: payloadFor(evt),
          goalId: goal.id,
        });
      }
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError("Couldn't save. Try again in a moment.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes ls-slide { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .ls-sheet { animation: ls-slide 220ms ease-out; }
        @media (prefers-reduced-motion: reduce) { .ls-sheet { animation: none; } }
      `}</style>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.12)", zIndex: 40,
        }}
      >
        <div
          className="ls-sheet"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", left: 0, right: 0, bottom: 0,
            background: PAPER.bg, color: PAPER.ink,
            borderTopLeftRadius: 26, borderTopRightRadius: 22,
            padding: "22px 24px 30px",
            boxShadow: "0 -10px 40px rgba(0,0,0,0.15)",
            fontFamily: FONT.sans,
            maxHeight: "85vh", overflowY: "auto",
          }}
        >
          <div style={{
            width: 38, height: 4, borderRadius: 999, background: PAPER.line,
            margin: "0 auto 14px",
          }} />
          <div style={{
            fontSize: 11, letterSpacing: "1.6px", textTransform: "uppercase",
            color: PAPER.faint, fontWeight: 500, marginBottom: 10,
          }}>
            LOG YOUR DAY — JUST WRITE
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="log your day — just write"
            rows={4}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "13px 15px", borderRadius: RADIUS.r2,
              border: `1px solid ${PAPER.line}`, background: PAPER.card,
              fontSize: 14.5, fontFamily: FONT.sans, color: PAPER.ink,
              lineHeight: 1.55, resize: "vertical",
            }}
          />

          {rows.length > 0 && (
            <>
              <div style={{ marginTop: 14, fontSize: 12, color: PAPER.dim }}>
                Understood — no forms, no tags:
              </div>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {rows.map(({ evt, goal }, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px",
                    borderRadius: i % 2 === 0 ? RADIUS.r1 : RADIUS.r2,
                    background: PAPER.card, border: `1px solid ${PAPER.line}`,
                  }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: 999,
                      background: goal ? catColor(goal.cat) : PAPER.faint,
                      display: "inline-block", flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 13.5, color: PAPER.ink, flex: 1 }}>
                      {evt.raw}
                    </span>
                    <span style={{ fontSize: 11.5, color: goal ? PAPER.dim : PAPER.whisper }}>
                      {goal ? `→ ${goal.id}` : "no matching goal — skipped"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {error && <div style={{ marginTop: 10, color: PAPER.whisper, fontSize: 12 }}>{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 16px", borderRadius: RADIUS.pill,
                border: `1px solid ${PAPER.line}`, background: "transparent",
                color: PAPER.dim, fontSize: 13, fontFamily: FONT.sans, cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || rows.length === 0}
              style={{
                padding: "9px 16px", borderRadius: RADIUS.pill,
                border: `1px solid ${PAPER.affirmLine}`,
                background: PAPER.affirm, color: PAPER.affirmInk,
                fontSize: 13, fontFamily: FONT.sans,
                cursor: rows.length === 0 ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              Looks right — save
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 5: Wire LogBlob + LogSheet into Home**

Read `/Users/munish/becoming/src/screens/Home.jsx`. Add imports:
```jsx
import { useState as useStateAlt } from "react"; // omit if useState already imported
import LogBlob from "../components/LogBlob.jsx";
import LogSheet from "../components/LogSheet.jsx";
```

Inside the `Home` component, add `const [sheetOpen, setSheetOpen] = useState(false);` alongside the existing goals state.

Below the existing footer JSX (after the `<Link to="/year">…`), add:
```jsx
{goals && goals.length > 0 && (
  <>
    <LogBlob onClick={() => setSheetOpen(true)} />
    <LogSheet
      open={sheetOpen}
      onClose={() => setSheetOpen(false)}
      onSaved={() => listGoals().then(setGoals)}
    />
  </>
)}
```

The LogBlob renders only when a real goal exists — matching design spec §7.1 rule "Log blob visible only when ≥1 goal exists". LogSheet mounts unconditionally (returns null when `open=false`) so state stays in the tree between opens.

- [ ] **Step 6: Run all tests to confirm pass**

Run: `npm test`
Expected: PASS — previous tests still green + 3 new LogSheet tests.

- [ ] **Step 7: Manual smoke — dev server**

Run: `npm run dev`
- Visit `/`. Log blob appears bottom-right.
- Click it. Sheet slides up. Textarea empty.
- Type: `woke 07:15` then `session 22:00 · 20min`. Two rows render with correct dots + `→ wake-6am` / `→ cadence-reset` routing.
- Click "Looks right — save". Sheet closes. Check `vault/logs/YYYY-MM-DD.md` — both lines present.
- Reopen sheet, same two lines, save again. Confirm idempotent (no duplicates in the file).

- [ ] **Step 8: Commit**

```bash
git add src/components/LogBlob.jsx src/components/LogSheet.jsx src/components/LogSheet.test.jsx src/screens/Home.jsx
git commit -m "feat: log sheet + log blob FAB

Log blob (FAB) on Home opens a bottom sheet. Sheet live-parses
free text into typed events, previews with category dots +
routing to matching active goals, and writes via appendLog on
confirm. Events with no matching goal are shown but skipped.
Blob visible only when ≥1 active goal exists."
```

---

### Task 4: Year screen — real adherence marks

**Files:**
- Modify: `src/screens/Year.jsx` — replace the synthetic `buildYear` with real adherence-driven day marks; drop the `buildYear` import; use `store.readLogsInRange` + `dailyAdherence` per goal.
- Modify: `src/data/mockLife.js` — remove the now-unused `buildYear` export and `MONTHS` (Year builds MONTHS from `["Jan","Feb",…]` inline).

**Interfaces:**
- Consumes:
  - `store.listGoals`, `store.readLogsInRange` from `src/data/store.js`
  - `dailyAdherence` from `src/data/adherence.js`
  - existing tokens
- Produces: no new exports; Year now displays real data.

Rendering rules (per design spec §8):
- `hit`: full opacity ellipse in category color (focus goal 0.85; unfocused 0.15).
- `soft`: same but opacity ×0.6.
- `off` (cadence off-plan): opacity 0.55 in `PAPER.whisper` regardless of category — signals off-plan without shaming.
- `clean`: no visible mark (a clean skip is neutral by design).
- `none`: no mark.
- The existing pen-chip filter + tap-to-toggle logic still applies to focus/day count. Tapping a day toggles a `wake` event for the pen-held goal (writes via `appendLog(date, { verb: "wake", time: "07:00", goalId })`) if wake type; toggles a `session` event with a default 10-minute duration for cadence type. This gives Year back its "spreadsheet ritual" behavior while producing real vault writes.

- [ ] **Step 1: Read the current Year.jsx**

Read `/Users/munish/becoming/src/screens/Year.jsx`. Note where `buildYear`, `MONTHS`, `isMonthDormant` are used and where pen-chip toggle logic lives.

- [ ] **Step 2: Draft the migration**

Replace `buildYear` with a real data path:
- On mount (or when goals change): `readLogsInRange({ from: yearStart, to: yearEnd })` → `logs`.
- For each goal, compute `dailyAdherence({ goal, logs, from: yearStart, to: yearEnd })`.
- Build a `year[monthIdx][dayIdx]` structure of `{ goalId, cat, status }[]` matching what the day-cell renderer already expects (mock had `{ cat, effort }[]`; new shape is `{ goalId, cat, status }[]`).
- Update the day-cell renderer to color/opacity per status. `off` uses `PAPER.whisper`.

Replace the tap-toggle:
- With pen held, on tap: check current day's log for the pen goal.
  - If no event for that goal today → `appendLog(date, { verb: goal.type === "wake" ? "wake" : "session", time: goal.type === "wake" ? "07:00" : undefined, durationMin: goal.type === "wake" ? undefined : 10, goalId: goal.id })` then re-fetch logs.
  - If event exists → do nothing (no delete API in Phase 3; note in ledger). Tapping again is a no-op today.

Local const:
```js
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
```
And drop the `mockLife` import.

- [ ] **Step 3: Update the day-cell status → visual mapping**

Inside the DayCell (or equivalent day render), add:
```js
function markStyleFor(status, catColor) {
  if (status === "none" || status === "clean") return null;
  const base = { width: 5.6, height: 4.6, borderRadius: 999, display: "inline-block" };
  if (status === "off") return { ...base, background: PAPER.whisper, opacity: 0.55 };
  const op = status === "soft" ? 0.55 : 0.85;
  return { ...base, background: catColor, opacity: op };
}
```
When rendering per-goal marks: iterate goals with a mark for that day; use `catColor(goal.cat)` (import from tokens) and the mapping above. Rotate ellipses per the existing rule (stable per (day, index)).

- [ ] **Step 4: Add a smoke test for the Year adherence path**

Since Year has no existing test file, add `src/screens/Year.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../data/store.js", () => ({
  listGoals: vi.fn(),
  readLogsInRange: vi.fn(),
  appendLog: vi.fn().mockResolvedValue(undefined),
}));

import Year from "./Year.jsx";
import { listGoals, readLogsInRange } from "../data/store.js";

const WAKE_GOAL = {
  id: "wake-6am", name: "Wake at 6:00 AM", cat: "health", type: "wake",
  state: "active", currentRound: 1,
  rounds: [{ n: 1, targetValue: "08:00", startDate: "2026-01-01", endDate: "2026-12-31" }],
};

function renderYear() {
  return render(<MemoryRouter><Year /></MemoryRouter>);
}

beforeEach(() => {
  listGoals.mockReset();
  readLogsInRange.mockReset();
});

describe("Year loads goals and log range", () => {
  it("fetches goals + log range on mount", async () => {
    listGoals.mockResolvedValue([WAKE_GOAL]);
    readLogsInRange.mockResolvedValue([]);
    renderYear();
    await waitFor(() => expect(listGoals).toHaveBeenCalled());
    expect(readLogsInRange).toHaveBeenCalled();
  });

  it("shows the pen chip for the goal", async () => {
    listGoals.mockResolvedValue([WAKE_GOAL]);
    readLogsInRange.mockResolvedValue([]);
    renderYear();
    await waitFor(() => expect(screen.getByText(/Wake at 6:00 AM/)).toBeInTheDocument());
  });
});
```

- [ ] **Step 5: Run all tests to confirm pass**

Run: `npm test`
Expected: all previous tests still pass + 2 new Year tests.

- [ ] **Step 6: Manual smoke — dev server**

Run: `npm run dev`
- Visit `/year`. Pen chips list real goals.
- Any real logs written by LogSheet appear as marks on today's cell.
- With a wake pen held, tap an empty day → a mark appears there (a wake event at 07:00 is written to `vault/logs/DATE.md`).
- Reload — marks persist.

- [ ] **Step 7: Commit**

```bash
git add src/screens/Year.jsx src/data/mockLife.js src/screens/Year.test.jsx
git commit -m "feat: Year renders real adherence marks

Replaces synthetic buildYear with dailyAdherence over real
vault logs. hit → full category color; soft → dimmed; off →
whisper (never red). Clean skips + none render blank. Tap
with pen held writes a default-value log event for that day."
```

---

### Task 5: Home momentum from real adherence

**Files:**
- Modify: `src/screens/Home.jsx` — replace the stubbed `momentum: 0` in the `enriched` mapping with `momentum({ goal, logs, asOf: today })`; fetch a 14-day log window on mount.

**Interfaces:**
- Consumes: `momentum` from `src/data/adherence.js`; `readLogsInRange` from `src/data/store.js`.
- Produces: nothing new.

- [ ] **Step 1: Read the current Home.jsx**

Read `/Users/munish/becoming/src/screens/Home.jsx`. Locate the `useEffect` that calls `listGoals().then(setGoals)` and the `enriched` mapping.

- [ ] **Step 2: Add a log-fetch alongside goals**

Extend the mount effect:
```js
useEffect(() => {
  Promise.all([
    listGoals(),
    (async () => {
      const end = new Date().toISOString().slice(0, 10);
      const start = (() => {
        const d = new Date(end + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() - 13);
        return d.toISOString().slice(0, 10);
      })();
      return readLogsInRange({ from: start, to: end });
    })(),
  ])
    .then(([g, l]) => { setGoals(g); setLogs(l); })
    .catch(() => { setGoals([]); setLogs([]); });
}, []);
```
Where `const [logs, setLogs] = useState([]);` is a new state slot.

- [ ] **Step 3: Feed real momentum into the enriched mapping**

Replace the existing `momentum: 0,` line inside `enriched` with:
```js
momentum: momentum({ goal: g, logs, asOf: new Date().toISOString().slice(0, 10) }),
```
And import `momentum` + `readLogsInRange` at the top of the file:
```js
import { listGoals, readLogsInRange } from "../data/store.js";
import { momentum } from "../data/adherence.js";
```

- [ ] **Step 4: Extend the LogSheet onSaved to refresh momentum too**

Where `onSaved={() => listGoals().then(setGoals)}` is set, change to:
```js
onSaved={async () => {
  const [g, l] = await Promise.all([listGoals(), readLogsInRange({ from: rangeStart(), to: rangeEnd() })]);
  setGoals(g);
  setLogs(l);
}}
```
Where `rangeStart()` / `rangeEnd()` are two tiny helpers inside the component; extract the range logic from Step 2 into these helpers to avoid duplication.

- [ ] **Step 5: Update the Home smoke test to mock readLogsInRange**

Read `/Users/munish/becoming/src/screens/Home.test.jsx`. Extend the `vi.mock` block:
```js
vi.mock("../data/store.js", () => ({
  listGoals: vi.fn(),
  readLogsInRange: vi.fn().mockResolvedValue([]),
}));
```
And import + reset `readLogsInRange` in `beforeEach`.

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: all tests pass, Home smoke tests included.

- [ ] **Step 7: Manual smoke — dev server**

Run: `npm run dev`
- Log a wake event via LogSheet at close to your goal's round target — Home orb grows slightly on refresh.
- Log 3 more strong wake events — orb keeps growing.
- Delete the log file, reload — orb shrinks back to zero.

- [ ] **Step 8: Commit**

```bash
git add src/screens/Home.jsx src/screens/Home.test.jsx
git commit -m "feat: Home momentum from real 14-day adherence

Reads a 14-day log window on mount + after LogSheet save.
Feeds momentum() into each goal's enriched shape so the Orb
sizes reflect real behavior instead of a stubbed 0."
```

---

### Task 6: Manual verification + PR

**Files:** none.

- [ ] **Step 1: Full test run**

Run: `npm test`
Expected: all green. Record total count in the ledger.

- [ ] **Step 2: End-to-end manual pass**

Run: `npm run dev`.
- Empty vault: Home renders empty state (log blob hidden).
- Onboard a wake goal via `/onboard`. Home shows the goal, log blob appears.
- Tap log blob. Type `woke 06:55`. Save. Sheet closes. Home orb has grown.
- `/year` shows a mark on today's cell in the goal's color.
- Reopen sheet, type the same line, save. `vault/logs/DATE.md` still has one wake line (idempotent).
- Type a nonsense line + a valid session line: nonsense skipped, session row shows `no matching goal` (no cadence goal yet).
- Onboard a cadence goal. Redo the session log: now it routes correctly.
- Reload: everything survives.

- [ ] **Step 3: Push + PR**

```bash
git push -u origin balboa-breakdown-phase-3
gh pr create --title "phase 3: log sheet + real adherence — momentum, marks, and the loop closed" --body "$(cat <<'EOF'
## Summary
Phase 3 closes the observation loop for Becoming.

- **Log parser** (`src/lib/logParser.js`): free-text → typed `ParsedEvent[]`. Regex-only, skips unrecognized lines silently.
- **Adherence engine** (`src/data/adherence.js`): pure walker turning goal rounds + vault logs into per-day statuses (`hit`/`soft`/`off`/`clean`/`none`) and a rolling 14-day momentum ratio.
- **LogSheet + LogBlob** (`src/components/`): bottom-sheet UI on Home. Live parse preview, category dots, routing meta, `PAPER.affirm` confirm pill. Blob visible only when ≥1 active goal exists.
- **Year screen**: replaces synthetic `buildYear` with real adherence marks. `hit` → full category color; `soft` → dimmed; `off` → `PAPER.whisper` (never red); `clean`/`none` render blank. Tap with pen held writes a default log event for that day.
- **Home momentum**: real 14-day rolling adherence feeds each Orb's size.

## Test plan
- [x] `npm test` — all green (log parser, adherence engine, LogSheet, Year smoke, Home smoke + previous phases)
- [x] `npm run dev` — log via sheet → Home orb grows → Year shows mark → reload persists → idempotent re-save
- [x] `npm run dev` — parser skips unrecognized lines; unroutable events show "no matching goal — skipped" and are not written

## Deferred to Phase 4
- Deleting a mark via tap-again on Year (no delete API today)
- LLM-refined log parsing (regex-only for v1)
- `/goal/:id` workspace with Rounds section + adherence timeline

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review (done inline)

**Spec coverage:**
- §4 goal-type adherence semantics → Task 2 (delegates to goalTypes) + Task 4 (rendering) ✓
- §8 momentum formula → Task 2 (implementation) + Task 5 (Home wiring) ✓
- §7.1 log blob visible only with ≥1 goal → Task 3 (conditional render in Home) ✓
- §7.6 Log sheet layout + parser v1 → Task 3 ✓
- §9 Phase 3 checklist (log parser, wake+cadence adherence, Year wired, Home momentum) — all four covered ✓

**Placeholder scan:** none.

**Type consistency:** `ParsedEvent { verb, time?, durationMin?, raw }` — Task 1. Turned into `LogEvent` for `appendLog` in Task 3 (`payload` derived via `payloadFor` matching Phase 1's `derivePayload` in logCodec). `dailyAdherence` return shape `Record<string, status>` used in Task 4. `momentum` returns `[0,1]` used in Task 5.

**Global-constraint traceability:** All new UI imports PAPER/CATS from tokens. Off-plan renders in `PAPER.whisper`, never red. No percentage-as-text (momentum feeds Orb size, never a rendered digit). `prefers-reduced-motion` covers LogBlob breathing + LogSheet slide.
