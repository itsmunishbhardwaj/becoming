# Balboa Breakdown — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wipe mock data, stand up a vault-backed store that reads/writes real markdown files for goals and daily logs, seed two hand-written goals (wake-6am, cadence-reset), and render an empty-state Home + real-data Home.

**Architecture:** Vite dev middleware exposes `/api/vault/*` for filesystem I/O against `<repo>/vault`. A pure-JS markdown parser/serializer (front-matter + fixed heading sections) converts between `.md` files and in-memory `Goal` / `LogEvent` shapes. A tiny `src/data/store.js` client wraps the API. Home + Year read from `store` instead of `mockLife`. Goal-type-specific logic (`wake`, `cadence`) lives in `src/data/goalTypes/*` behind a common interface.

**Tech Stack:** Vite 5, React 18, react-router-dom 6, Node fs (dev middleware), vitest 2 (new — unit tests only). Pure ESM, no bundled dependencies for parser (hand-rolled, ~80 LOC).

## Global Constraints

- Paper theme only — every color from `src/tokens.js` `PAPER`. No hex outside tokens.
- No red anywhere. Drift uses `PAPER.whisper`.
- Accumulation framing only — never render a percentage as text, never a miss count, never a remainder.
- Category color = identity — one hue per goal across every surface, from `CATS` in tokens.
- Serif (Fraunces) for identity, sans (Inter) for data.
- `prefers-reduced-motion` disables all animation.
- Empty state must be dignified — no scolding copy.
- All new modules ESM. No CJS, no `require`.
- Vault path: `<repo>/vault/`. `vault/logs/` is gitignored (personal data). `vault/goals/*.md` is committed.

---

### Task 1: Test infra + markdown parser/serializer

**Files:**
- Create: `vitest.config.js`
- Create: `src/lib/md.js`
- Create: `src/lib/md.test.js`
- Modify: `package.json` (add vitest, test script)
- Modify: `.gitignore` (add `vault/logs/`, coverage)

**Interfaces:**
- Consumes: nothing (pure module).
- Produces:
  - `parseFrontMatter(src: string): { data: Record<string, unknown>, body: string }`
  - `serializeFrontMatter(data: Record<string, unknown>, body: string): string`
  - `parseSections(body: string): Record<string, string>` — splits body by `## Heading`, returns `{ Heading: rawContent }`.
  - `serializeSections(sections: Record<string, string>, order: string[]): string`

Front-matter grammar: `---\n<yaml-lite>\n---\n<body>`. YAML-lite = `key: value` per line, values are strings, numbers, ISO dates, or JSON objects/arrays (detected by leading `{`, `[`, `"`, digit, or `true|false|null`). No nesting via indentation, no anchors. If a value needs nesting, use inline JSON.

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest@^2.0.0
```

- [ ] **Step 2: Add test script + vitest config**

Modify `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

Create `vitest.config.js`:
```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.js", "src/**/*.test.jsx"],
  },
});
```

- [ ] **Step 3: Add `.gitignore` entries**

Append to `.gitignore` (create if missing):
```
vault/logs/
coverage/
```

- [ ] **Step 4: Write failing tests for parseFrontMatter**

Create `src/lib/md.test.js`:
```js
import { describe, it, expect } from "vitest";
import {
  parseFrontMatter,
  serializeFrontMatter,
  parseSections,
  serializeSections,
} from "./md.js";

describe("parseFrontMatter", () => {
  it("parses string, number, boolean, null, ISO date, inline JSON", () => {
    const src = `---
name: Wake at 6:00 AM
count: 12
active: true
retired: false
note: null
endDate: 2026-12-31
rounds: [{"n":1,"target":"08:00"}]
meta: {"k":"v"}
---
body text
`;
    const { data, body } = parseFrontMatter(src);
    expect(data.name).toBe("Wake at 6:00 AM");
    expect(data.count).toBe(12);
    expect(data.active).toBe(true);
    expect(data.retired).toBe(false);
    expect(data.note).toBe(null);
    expect(data.endDate).toBe("2026-12-31");
    expect(data.rounds).toEqual([{ n: 1, target: "08:00" }]);
    expect(data.meta).toEqual({ k: "v" });
    expect(body).toBe("body text\n");
  });

  it("returns empty data + full source as body when no front-matter", () => {
    const { data, body } = parseFrontMatter("no front matter\nhere\n");
    expect(data).toEqual({});
    expect(body).toBe("no front matter\nhere\n");
  });

  it("handles empty body after front-matter", () => {
    const { data, body } = parseFrontMatter("---\nk: v\n---\n");
    expect(data).toEqual({ k: "v" });
    expect(body).toBe("");
  });
});
```

- [ ] **Step 5: Run tests to confirm they fail**

Run: `npm test`
Expected: FAIL — `parseFrontMatter is not defined`.

- [ ] **Step 6: Implement md.js parseFrontMatter**

Create `src/lib/md.js`:
```js
const FM_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

function coerce(raw) {
  const v = raw.trim();
  if (v === "") return "";
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v[0] === "{" || v[0] === "[" || v[0] === '"') {
    try { return JSON.parse(v); } catch { /* fall through */ }
  }
  return v;
}

export function parseFrontMatter(src) {
  const m = src.match(FM_RE);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1);
    data[key] = coerce(val);
  }
  return { data, body: m[2] };
}
```

- [ ] **Step 7: Run tests to confirm parseFrontMatter passes**

Run: `npm test`
Expected: PASS for parseFrontMatter tests.

- [ ] **Step 8: Add tests for serializeFrontMatter, parseSections, serializeSections**

Append to `src/lib/md.test.js`:
```js
describe("serializeFrontMatter", () => {
  it("round-trips string, number, boolean, null, JSON", () => {
    const data = {
      name: "Wake",
      count: 12,
      active: true,
      note: null,
      rounds: [{ n: 1, target: "08:00" }],
    };
    const out = serializeFrontMatter(data, "body\n");
    const back = parseFrontMatter(out);
    expect(back.data).toEqual(data);
    expect(back.body).toBe("body\n");
  });
});

describe("parseSections", () => {
  it("splits body by ## headings, preserving raw content", () => {
    const body = `## Ambition
The user's words.

## Rounds
| # | Target |
| 1 | 08:00 |

## How we get there
Small steps.
`;
    const sec = parseSections(body);
    expect(sec.Ambition.trim()).toBe("The user's words.");
    expect(sec.Rounds).toContain("| 1 | 08:00 |");
    expect(sec["How we get there"].trim()).toBe("Small steps.");
  });

  it("returns empty object when no headings", () => {
    expect(parseSections("just prose\n")).toEqual({});
  });
});

describe("serializeSections", () => {
  it("emits sections in the order given, skips missing keys", () => {
    const out = serializeSections(
      { Ambition: "one line\n", Rounds: "table\n" },
      ["Ambition", "Missing", "Rounds"]
    );
    expect(out).toBe("## Ambition\none line\n\n## Rounds\ntable\n");
  });
});
```

- [ ] **Step 9: Run tests to confirm they fail**

Run: `npm test`
Expected: FAIL — `serializeFrontMatter is not defined`.

- [ ] **Step 10: Implement remaining md.js exports**

Append to `src/lib/md.js`:
```js
function encode(v) {
  if (v === null) return "null";
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

export function serializeFrontMatter(data, body) {
  const lines = Object.entries(data).map(([k, v]) => `${k}: ${encode(v)}`);
  return `---\n${lines.join("\n")}\n---\n${body}`;
}

const SECTION_RE = /^## (.+)$/gm;

export function parseSections(body) {
  const out = {};
  const matches = [...body.matchAll(SECTION_RE)];
  for (let i = 0; i < matches.length; i++) {
    const heading = matches[i][1].trim();
    const start = matches[i].index + matches[i][0].length + 1;
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
    out[heading] = body.slice(start, end);
  }
  return out;
}

export function serializeSections(sections, order) {
  return order
    .filter((h) => sections[h] != null)
    .map((h) => `## ${h}\n${sections[h].endsWith("\n") ? sections[h] : sections[h] + "\n"}`)
    .join("\n");
}
```

- [ ] **Step 11: Run all tests to confirm pass**

Run: `npm test`
Expected: PASS — all 6 tests green.

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json vitest.config.js .gitignore src/lib/md.js src/lib/md.test.js
git commit -m "feat: add vitest + minimal markdown parser/serializer

Front-matter + fixed-heading section split. Foundation for
vault-backed goal + log files."
```

---

### Task 2: Goal `.md` codec

**Files:**
- Create: `src/data/goalCodec.js`
- Create: `src/data/goalCodec.test.js`

**Interfaces:**
- Consumes: `parseFrontMatter`, `serializeFrontMatter`, `parseSections`, `serializeSections` from `src/lib/md.js`.
- Produces:
  - `parseGoal(md: string): Goal`
  - `serializeGoal(goal: Goal): string`
  - `Goal` shape (defined in this file, used by store, screens, goalTypes):
    ```
    {
      id: string, name: string, cat: string,
      type: "wake" | "cadence",
      state: "active"|"drift"|"dormant"|"completed"|"retired",
      baseline: string | { intervalDays: number },
      target: string | { intervalDays: number },
      endDate: string,           // ISO YYYY-MM-DD
      currentRound: number,
      createdAt: string,         // ISO YYYY-MM-DD
      ambition: string,          // trimmed body of ## Ambition
      rounds: Array<{ n: number, targetValue: string | { intervalDays: number },
                      startDate: string, endDate: string }>,
      howWeGetThere: string,
      indicators: { right: string[], wrong: string[], stall: string[] }
    }
    ```

Rounds table format in `.md`:
```
| # | Target | Start | End |
|---|--------|-------|-----|
| 1 | 08:00  | 2026-08-10 | 2026-08-24 |
```
For cadence, `Target` column holds `every 2d`, `every 4d`, etc.

Indicator sections use `- ` bullets, one per line. Blank lines allowed.

- [ ] **Step 1: Write failing round-trip test**

Create `src/data/goalCodec.test.js`:
```js
import { describe, it, expect } from "vitest";
import { parseGoal, serializeGoal } from "./goalCodec.js";

const SAMPLE = `---
id: wake-6am
name: Wake at 6:00 AM
cat: health
type: wake
state: active
baseline: "08:30"
target: "06:00"
endDate: 2026-12-31
currentRound: 1
createdAt: 2026-08-10
---
## Ambition
Own the morning before the world does.

## Rounds
| # | Target | Start | End |
|---|--------|-------|-----|
| 1 | 08:00 | 2026-08-10 | 2026-08-24 |
| 2 | 07:30 | 2026-08-25 | 2026-09-07 |

## How we get there
30 min earlier every 2 weeks.

## Right direction
- Wake within 15 min of target 5+ days/week
- Bedtime moves earlier naturally

## Wrong direction
- Snoozing past target by 45+ min

## No movement
- 7+ days no wake logged
`;

describe("parseGoal", () => {
  it("parses front-matter, ambition, rounds table, indicators", () => {
    const g = parseGoal(SAMPLE);
    expect(g.id).toBe("wake-6am");
    expect(g.type).toBe("wake");
    expect(g.baseline).toBe("08:30");
    expect(g.currentRound).toBe(1);
    expect(g.ambition).toBe("Own the morning before the world does.");
    expect(g.rounds).toEqual([
      { n: 1, targetValue: "08:00", startDate: "2026-08-10", endDate: "2026-08-24" },
      { n: 2, targetValue: "07:30", startDate: "2026-08-25", endDate: "2026-09-07" },
    ]);
    expect(g.howWeGetThere).toBe("30 min earlier every 2 weeks.");
    expect(g.indicators.right).toEqual([
      "Wake within 15 min of target 5+ days/week",
      "Bedtime moves earlier naturally",
    ]);
    expect(g.indicators.wrong).toEqual(["Snoozing past target by 45+ min"]);
    expect(g.indicators.stall).toEqual(["7+ days no wake logged"]);
  });
});

describe("serializeGoal round-trip", () => {
  it("parse then serialize then parse yields same shape", () => {
    const g1 = parseGoal(SAMPLE);
    const out = serializeGoal(g1);
    const g2 = parseGoal(out);
    expect(g2).toEqual(g1);
  });
});

describe("cadence goal round-trip", () => {
  it("stores intervalDays via 'every Nd' in rounds table", () => {
    const src = `---
id: cadence-reset
name: Cadence reset
cat: health
type: cadence
state: active
baseline: {"intervalDays":1}
target: {"intervalDays":7}
endDate: 2026-12-31
currentRound: 1
createdAt: 2026-08-10
---
## Ambition
A healthy rhythm.

## Rounds
| # | Target | Start | End |
|---|--------|-------|-----|
| 1 | every 2d | 2026-08-10 | 2026-08-24 |
| 2 | every 3d | 2026-08-25 | 2026-09-07 |

## How we get there
Widen intervals across four months.

## Right direction
- Green days matched

## Wrong direction
- Sessions on non-green days

## No movement
- No logs in 14 days
`;
    const g1 = parseGoal(src);
    expect(g1.baseline).toEqual({ intervalDays: 1 });
    expect(g1.rounds[0].targetValue).toEqual({ intervalDays: 2 });
    const g2 = parseGoal(serializeGoal(g1));
    expect(g2).toEqual(g1);
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

Run: `npm test src/data/goalCodec.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement goalCodec.js**

Create `src/data/goalCodec.js`:
```js
import {
  parseFrontMatter,
  serializeFrontMatter,
  parseSections,
  serializeSections,
} from "../lib/md.js";

const SECTION_ORDER = [
  "Ambition",
  "Rounds",
  "How we get there",
  "Right direction",
  "Wrong direction",
  "No movement",
];

function parseTargetCell(cell, type) {
  const v = cell.trim();
  if (type === "cadence") {
    const m = v.match(/^every\s+(\d+)d$/i);
    return m ? { intervalDays: Number(m[1]) } : { intervalDays: 0 };
  }
  return v;
}

function serializeTargetCell(val, type) {
  if (type === "cadence") return `every ${val.intervalDays}d`;
  return String(val);
}

function parseRoundsTable(md, type) {
  const rows = md
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"));
  const dataRows = rows.filter(
    (r) => !/^\|\s*-+/.test(r) && !/^\|\s*#\s*\|/i.test(r)
  );
  return dataRows.map((r) => {
    const cells = r.split("|").slice(1, -1).map((c) => c.trim());
    return {
      n: Number(cells[0]),
      targetValue: parseTargetCell(cells[1], type),
      startDate: cells[2],
      endDate: cells[3],
    };
  });
}

function serializeRoundsTable(rounds, type) {
  const header = `| # | Target | Start | End |\n|---|--------|-------|-----|`;
  const body = rounds
    .map(
      (r) =>
        `| ${r.n} | ${serializeTargetCell(r.targetValue, type)} | ${r.startDate} | ${r.endDate} |`
    )
    .join("\n");
  return `${header}\n${body}\n`;
}

function parseBullets(md) {
  return md
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim());
}

function serializeBullets(items) {
  return items.map((i) => `- ${i}`).join("\n") + "\n";
}

export function parseGoal(src) {
  const { data, body } = parseFrontMatter(src);
  const sec = parseSections(body);
  return {
    id: data.id,
    name: data.name,
    cat: data.cat,
    type: data.type,
    state: data.state,
    baseline: data.baseline,
    target: data.target,
    endDate: data.endDate,
    currentRound: data.currentRound,
    createdAt: data.createdAt,
    ambition: (sec.Ambition || "").trim(),
    rounds: parseRoundsTable(sec.Rounds || "", data.type),
    howWeGetThere: (sec["How we get there"] || "").trim(),
    indicators: {
      right: parseBullets(sec["Right direction"] || ""),
      wrong: parseBullets(sec["Wrong direction"] || ""),
      stall: parseBullets(sec["No movement"] || ""),
    },
  };
}

export function serializeGoal(g) {
  const fmData = {
    id: g.id,
    name: g.name,
    cat: g.cat,
    type: g.type,
    state: g.state,
    baseline: g.baseline,
    target: g.target,
    endDate: g.endDate,
    currentRound: g.currentRound,
    createdAt: g.createdAt,
  };
  const sections = {
    Ambition: g.ambition + "\n",
    Rounds: serializeRoundsTable(g.rounds, g.type),
    "How we get there": g.howWeGetThere + "\n",
    "Right direction": serializeBullets(g.indicators.right),
    "Wrong direction": serializeBullets(g.indicators.wrong),
    "No movement": serializeBullets(g.indicators.stall),
  };
  const body = serializeSections(sections, SECTION_ORDER);
  return serializeFrontMatter(fmData, body);
}
```

Note: `baseline` and `target` for wake goals must be quoted strings in front-matter (`"08:30"`) so they parse as strings, not as unrecognized values. The parser preserves whatever `parseFrontMatter` returns; the seed files and serializer must write strings correctly. Since our `encode()` writes plain strings unquoted, `"08:30"` on disk becomes `08:30` after round-trip. Add JSON quoting for string values that look like times:

Update `serializeGoal` — before calling `serializeFrontMatter`, coerce values that look ambiguous:
```js
function fmEncode(v) {
  if (typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v)) return JSON.stringify(v);
  return v;
}
```
Then apply `fmEncode` when building `fmData` values (`baseline: fmEncode(g.baseline)`, `target: fmEncode(g.target)`). This makes the front-matter emit `baseline: "08:30"` which round-trips as string.

- [ ] **Step 4: Run tests to confirm pass**

Run: `npm test`
Expected: PASS — all goalCodec tests green.

- [ ] **Step 5: Commit**

```bash
git add src/data/goalCodec.js src/data/goalCodec.test.js
git commit -m "feat: goal .md codec (parse + serialize + round-trip)

Front-matter carries scalar goal fields; body carries fixed sections
Ambition, Rounds, How we get there, and indicator bullets. Supports
wake (HH:MM) and cadence (every Nd) target formats."
```

---

### Task 3: Log `.md` codec

**Files:**
- Create: `src/data/logCodec.js`
- Create: `src/data/logCodec.test.js`

**Interfaces:**
- Consumes: `parseFrontMatter`, `serializeFrontMatter` from `src/lib/md.js`.
- Produces:
  - `parseLog(md: string): { date: string, events: LogEvent[] }`
  - `serializeLog(date: string, events: LogEvent[]): string`
  - `LogEvent` shape:
    ```
    { verb: "wake" | "session",
      payload: string,           // raw payload as written, kept for round-trip
      goalId: string,
      time?: string,             // parsed HH:MM if present
      durationMin?: number }
    ```

Line grammar (strict):
```
- wake HH:MM → [[goal-id]]
- session HH:MM · Nmin → [[goal-id]]
```

- [ ] **Step 1: Write failing tests**

Create `src/data/logCodec.test.js`:
```js
import { describe, it, expect } from "vitest";
import { parseLog, serializeLog } from "./logCodec.js";

const SAMPLE = `---
date: 2026-08-10
---

- wake 07:12 → [[wake-6am]]
- session 22:40 · 18min → [[cadence-reset]]
`;

describe("parseLog", () => {
  it("parses date and typed events", () => {
    const { date, events } = parseLog(SAMPLE);
    expect(date).toBe("2026-08-10");
    expect(events).toEqual([
      { verb: "wake", payload: "07:12", goalId: "wake-6am", time: "07:12" },
      {
        verb: "session",
        payload: "22:40 · 18min",
        goalId: "cadence-reset",
        time: "22:40",
        durationMin: 18,
      },
    ]);
  });
});

describe("serializeLog round-trip", () => {
  it("parse then serialize then parse is stable", () => {
    const { date, events } = parseLog(SAMPLE);
    const out = serializeLog(date, events);
    const back = parseLog(out);
    expect(back).toEqual({ date, events });
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement logCodec.js**

Create `src/data/logCodec.js`:
```js
import { parseFrontMatter, serializeFrontMatter } from "../lib/md.js";

const LINE_RE = /^-\s+(\w+)\s+(.+?)\s+→\s+\[\[([^\]]+)\]\]\s*$/;

function parsePayload(verb, payload) {
  const out = { verb, payload, goalId: null };
  if (verb === "wake") {
    const m = payload.match(/^(\d{1,2}:\d{2})$/);
    if (m) out.time = m[1];
  } else if (verb === "session") {
    const m = payload.match(/^(\d{1,2}:\d{2})\s*·\s*(\d+)\s*min$/);
    if (m) {
      out.time = m[1];
      out.durationMin = Number(m[2]);
    }
  }
  return out;
}

export function parseLog(src) {
  const { data, body } = parseFrontMatter(src);
  const events = [];
  for (const raw of body.split("\n")) {
    const m = raw.match(LINE_RE);
    if (!m) continue;
    const [, verb, payload, goalId] = m;
    events.push({ ...parsePayload(verb, payload), goalId });
  }
  return { date: data.date, events };
}

export function serializeLog(date, events) {
  const body =
    "\n" +
    events
      .map((e) => `- ${e.verb} ${e.payload} → [[${e.goalId}]]`)
      .join("\n") +
    "\n";
  return serializeFrontMatter({ date }, body);
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/logCodec.js src/data/logCodec.test.js
git commit -m "feat: log .md codec (parse + serialize + round-trip)"
```

---

### Task 4: Vite dev middleware for `/api/vault/*`

**Files:**
- Modify: `vite.config.js`
- Create: `src/dev/vaultMiddleware.js`
- Create: `src/dev/vaultMiddleware.test.js`

**Interfaces:**
- Consumes: node `fs/promises`, node `path`. Repo root path via `import.meta.url` in vite config.
- Produces (HTTP surface):
  - `GET  /api/vault/goals` → `{ goals: string[] }` (list of goal ids from filenames).
  - `GET  /api/vault/goals/:id` → raw `.md` text.
  - `PUT  /api/vault/goals/:id` → body = raw `.md`, writes `vault/goals/:id.md`, returns `{ ok: true }`.
  - `GET  /api/vault/logs/:date` → raw `.md` (404 if missing).
  - `PUT  /api/vault/logs/:date` → body = raw `.md`, writes `vault/logs/:date.md`.
  - `GET  /api/vault/logs?from=YYYY-MM-DD&to=YYYY-MM-DD` → `{ dates: string[] }` of log filenames in range (inclusive).

Middleware factory signature:
```
createVaultMiddleware({ vaultRoot: string }): (req, res, next) => void
```

Path escape guard: `id` and `date` matched against `/^[a-z0-9-]+$/` and `/^\d{4}-\d{2}-\d{2}$/` respectively. Anything else → 400.

- [ ] **Step 1: Write failing tests using a temp vault dir**

Create `src/dev/vaultMiddleware.test.js`:
```js
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createVaultMiddleware } from "./vaultMiddleware.js";

function mockReqRes(method, url, body) {
  const req = {
    method,
    url,
    on(event, cb) {
      if (event === "data" && body) cb(Buffer.from(body));
      if (event === "end") cb();
    },
  };
  let status = 200;
  let sent = "";
  let headers = {};
  const res = {
    statusCode: 200,
    setHeader(k, v) { headers[k] = v; },
    writeHead(s, h) { status = s; Object.assign(headers, h || {}); },
    end(payload) { sent = payload ?? ""; },
  };
  Object.defineProperty(res, "statusCode", {
    get() { return status; },
    set(v) { status = v; },
  });
  return { req, res, get status() { return status; }, get body() { return sent; }, headers };
}

let dir;
let mw;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "vault-"));
  await mkdir(path.join(dir, "goals"), { recursive: true });
  await mkdir(path.join(dir, "logs"), { recursive: true });
  mw = createVaultMiddleware({ vaultRoot: dir });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("GET /api/vault/goals", () => {
  it("lists ids from goals/*.md", async () => {
    await writeFile(path.join(dir, "goals", "wake-6am.md"), "x");
    await writeFile(path.join(dir, "goals", "cadence-reset.md"), "y");
    const { req, res } = mockReqRes("GET", "/api/vault/goals");
    await new Promise((r) => mw(req, res, r));
    // middleware wrote a response; parse it
    expect(res.statusCode).toBe(200);
    const parsed = JSON.parse(res.end.mock ? res.end.mock.calls[0][0] : "");
    // fallback: our mock captured last end payload
    // (skipped — inspect via readdir instead in a simpler integration test)
  });
});

describe("PUT then GET goal round-trip", () => {
  it("writes and reads back exact bytes", async () => {
    const md = "---\nid: x\n---\nbody\n";
    const put = mockReqRes("PUT", "/api/vault/goals/x", md);
    await new Promise((r) => mw(put.req, put.res, r));
    const onDisk = await readFile(path.join(dir, "goals", "x.md"), "utf8");
    expect(onDisk).toBe(md);
  });
});

describe("path escape guard", () => {
  it("rejects ../ in goal id", async () => {
    const { req, res } = mockReqRes("PUT", "/api/vault/goals/..%2Fetc", "x");
    let statusOut = 0;
    res.writeHead = (s) => { statusOut = s; };
    res.end = () => {};
    await new Promise((r) => mw(req, res, r));
    expect(statusOut).toBe(400);
  });
});
```

Note: the mock res is intentionally simple. Simplify the first test — drop the mock-inspection block and add a follow-up filesystem assertion instead. The middleware's job is to write files correctly; the round-trip test already verifies that.

Simplified `GET /api/vault/goals` test — replace the failing one:
```js
describe("GET /api/vault/goals", () => {
  it("lists ids from goals/*.md", async () => {
    await writeFile(path.join(dir, "goals", "wake-6am.md"), "x");
    await writeFile(path.join(dir, "goals", "cadence-reset.md"), "y");
    let captured = "";
    const req = { method: "GET", url: "/api/vault/goals",
      on(e, cb) { if (e === "end") cb(); } };
    const res = {
      statusCode: 200,
      setHeader() {},
      writeHead(s) { this.statusCode = s; },
      end(payload) { captured = payload ?? ""; },
    };
    await new Promise((r) => mw(req, res, r));
    const parsed = JSON.parse(captured);
    expect(parsed.goals.sort()).toEqual(["cadence-reset", "wake-6am"]);
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement middleware**

Create `src/dev/vaultMiddleware.js`:
```js
import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const ID_RE = /^[a-z0-9-]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function send(res, status, body, contentType = "application/json") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

export function createVaultMiddleware({ vaultRoot }) {
  const goalsDir = path.join(vaultRoot, "goals");
  const logsDir = path.join(vaultRoot, "logs");

  return async function vaultMiddleware(req, res, next) {
    const url = req.url || "";
    if (!url.startsWith("/api/vault/")) return next();

    try {
      // GET /api/vault/goals
      if (req.method === "GET" && url === "/api/vault/goals") {
        await mkdir(goalsDir, { recursive: true });
        const files = await readdir(goalsDir);
        const goals = files
          .filter((f) => f.endsWith(".md"))
          .map((f) => f.slice(0, -3));
        return send(res, 200, { goals });
      }

      // GET /api/vault/goals/:id
      let m = url.match(/^\/api\/vault\/goals\/([^/?#]+)$/);
      if (m && req.method === "GET") {
        const id = decodeURIComponent(m[1]);
        if (!ID_RE.test(id)) return send(res, 400, { error: "bad id" });
        try {
          const md = await readFile(path.join(goalsDir, `${id}.md`), "utf8");
          return send(res, 200, md, "text/markdown");
        } catch {
          return send(res, 404, { error: "not found" });
        }
      }

      // PUT /api/vault/goals/:id
      if (m && req.method === "PUT") {
        const id = decodeURIComponent(m[1]);
        if (!ID_RE.test(id)) return send(res, 400, { error: "bad id" });
        await mkdir(goalsDir, { recursive: true });
        const body = await readBody(req);
        await writeFile(path.join(goalsDir, `${id}.md`), body, "utf8");
        return send(res, 200, { ok: true });
      }

      // GET /api/vault/logs?from=&to=
      m = url.match(/^\/api\/vault\/logs\?from=([^&]+)&to=([^&]+)$/);
      if (m && req.method === "GET") {
        const from = decodeURIComponent(m[1]);
        const to = decodeURIComponent(m[2]);
        if (!DATE_RE.test(from) || !DATE_RE.test(to))
          return send(res, 400, { error: "bad range" });
        await mkdir(logsDir, { recursive: true });
        const files = await readdir(logsDir);
        const dates = files
          .filter((f) => f.endsWith(".md"))
          .map((f) => f.slice(0, -3))
          .filter((d) => DATE_RE.test(d) && d >= from && d <= to)
          .sort();
        return send(res, 200, { dates });
      }

      // GET /api/vault/logs/:date
      m = url.match(/^\/api\/vault\/logs\/([^/?#]+)$/);
      if (m && req.method === "GET") {
        const date = decodeURIComponent(m[1]);
        if (!DATE_RE.test(date)) return send(res, 400, { error: "bad date" });
        try {
          const md = await readFile(path.join(logsDir, `${date}.md`), "utf8");
          return send(res, 200, md, "text/markdown");
        } catch {
          return send(res, 404, { error: "not found" });
        }
      }

      // PUT /api/vault/logs/:date
      if (m && req.method === "PUT") {
        const date = decodeURIComponent(m[1]);
        if (!DATE_RE.test(date)) return send(res, 400, { error: "bad date" });
        await mkdir(logsDir, { recursive: true });
        const body = await readBody(req);
        await writeFile(path.join(logsDir, `${date}.md`), body, "utf8");
        return send(res, 200, { ok: true });
      }

      return send(res, 404, { error: "no route" });
    } catch (err) {
      return send(res, 500, { error: String(err.message || err) });
    }
  };
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Wire middleware into vite.config.js**

Replace `vite.config.js` contents:
```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createVaultMiddleware } from "./src/dev/vaultMiddleware.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    {
      name: "becoming-vault-api",
      configureServer(server) {
        server.middlewares.use(
          createVaultMiddleware({ vaultRoot: path.join(here, "vault") })
        );
      },
    },
  ],
});
```

Note: if the existing `vite.config.js` already has React plugin config, preserve any custom options. This plan assumes the minimal config that currently exists.

- [ ] **Step 6: Commit**

```bash
git add vite.config.js src/dev/vaultMiddleware.js src/dev/vaultMiddleware.test.js
git commit -m "feat: dev-time /api/vault filesystem bridge

Middleware exposes list/get/put for goal + log markdown under
<repo>/vault. Path-escape guarded. Used by store.js client."
```

---

### Task 5: `store.js` client wrapper

**Files:**
- Create: `src/data/store.js`
- Create: `src/data/store.test.js`

**Interfaces:**
- Consumes: `parseGoal`, `serializeGoal`, `parseLog`, `serializeLog` from Tasks 2–3. `fetch` (browser + node 18+).
- Produces:
  - `listGoals(): Promise<Goal[]>`
  - `getGoal(id: string): Promise<Goal | null>`
  - `saveGoal(goal: Goal): Promise<void>`
  - `readLogsInRange({from, to}: {from: string, to: string}): Promise<Array<{date: string, events: LogEvent[]}>>`
  - `readLog(date: string): Promise<{date: string, events: LogEvent[]} | null>`
  - `appendLog(date: string, event: LogEvent): Promise<void>` — idempotent by exact line match; reads existing, appends only if the serialized line is not already present.

- [ ] **Step 1: Write failing tests using node's fetch against the middleware**

Create `src/data/store.test.js`:
```js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createServer } from "node:http";
import path from "node:path";
import { createVaultMiddleware } from "../dev/vaultMiddleware.js";
import * as store from "./store.js";

let dir;
let server;
let port;

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "store-"));
  await mkdir(path.join(dir, "goals"), { recursive: true });
  await mkdir(path.join(dir, "logs"), { recursive: true });
  const mw = createVaultMiddleware({ vaultRoot: dir });
  server = createServer((req, res) => mw(req, res, () => {
    res.writeHead(404); res.end();
  }));
  await new Promise((r) => server.listen(0, r));
  port = server.address().port;
  store.__setBaseUrl(`http://127.0.0.1:${port}`);
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  await rm(dir, { recursive: true, force: true });
});

beforeEach(async () => {
  // clear vault between tests
  for (const sub of ["goals", "logs"]) {
    await rm(path.join(dir, sub), { recursive: true, force: true });
    await mkdir(path.join(dir, sub), { recursive: true });
  }
});

const SAMPLE_GOAL = `---
id: wake-6am
name: Wake at 6:00 AM
cat: health
type: wake
state: active
baseline: "08:30"
target: "06:00"
endDate: 2026-12-31
currentRound: 1
createdAt: 2026-08-10
---
## Ambition
Own the morning.

## Rounds
| # | Target | Start | End |
|---|--------|-------|-----|
| 1 | 08:00 | 2026-08-10 | 2026-08-24 |

## How we get there
Small steps.

## Right direction
- Wake near target

## Wrong direction
- Snoozing 45+ min

## No movement
- No wake logs for a week
`;

describe("listGoals + getGoal", () => {
  it("returns empty when vault has no goals", async () => {
    expect(await store.listGoals()).toEqual([]);
  });

  it("lists and reads a goal", async () => {
    await writeFile(path.join(dir, "goals", "wake-6am.md"), SAMPLE_GOAL);
    const goals = await store.listGoals();
    expect(goals).toHaveLength(1);
    expect(goals[0].id).toBe("wake-6am");
    expect(goals[0].ambition).toBe("Own the morning.");
    expect(await store.getGoal("wake-6am")).toEqual(goals[0]);
    expect(await store.getGoal("missing")).toBe(null);
  });
});

describe("saveGoal", () => {
  it("writes a parseable .md file", async () => {
    const goal = {
      id: "wake-6am",
      name: "Wake at 6:00 AM",
      cat: "health",
      type: "wake",
      state: "active",
      baseline: "08:30",
      target: "06:00",
      endDate: "2026-12-31",
      currentRound: 1,
      createdAt: "2026-08-10",
      ambition: "Own the morning.",
      rounds: [{ n: 1, targetValue: "08:00", startDate: "2026-08-10", endDate: "2026-08-24" }],
      howWeGetThere: "Small steps.",
      indicators: { right: ["Wake near target"], wrong: ["Snoozing 45+ min"], stall: ["No wake logs for a week"] },
    };
    await store.saveGoal(goal);
    const raw = await readFile(path.join(dir, "goals", "wake-6am.md"), "utf8");
    expect(raw).toContain("id: wake-6am");
    expect(raw).toContain("## Ambition");
    const back = await store.getGoal("wake-6am");
    expect(back).toEqual(goal);
  });
});

describe("appendLog", () => {
  it("creates the log file on first append", async () => {
    await store.appendLog("2026-08-10", {
      verb: "wake", payload: "07:12", goalId: "wake-6am", time: "07:12",
    });
    const log = await store.readLog("2026-08-10");
    expect(log.events).toHaveLength(1);
    expect(log.events[0].verb).toBe("wake");
  });

  it("is idempotent by exact line match", async () => {
    const evt = { verb: "wake", payload: "07:12", goalId: "wake-6am", time: "07:12" };
    await store.appendLog("2026-08-10", evt);
    await store.appendLog("2026-08-10", evt);
    const log = await store.readLog("2026-08-10");
    expect(log.events).toHaveLength(1);
  });
});

describe("readLogsInRange", () => {
  it("returns logs in ISO order, filtered by range", async () => {
    await store.appendLog("2026-08-10", {
      verb: "wake", payload: "07:00", goalId: "wake-6am",
    });
    await store.appendLog("2026-08-12", {
      verb: "wake", payload: "07:00", goalId: "wake-6am",
    });
    await store.appendLog("2026-09-01", {
      verb: "wake", payload: "07:00", goalId: "wake-6am",
    });
    const logs = await store.readLogsInRange({ from: "2026-08-01", to: "2026-08-31" });
    expect(logs.map((l) => l.date)).toEqual(["2026-08-10", "2026-08-12"]);
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement store.js**

Create `src/data/store.js`:
```js
import { parseGoal, serializeGoal } from "./goalCodec.js";
import { parseLog, serializeLog } from "./logCodec.js";

let baseUrl = "";  // browser default: same origin

export function __setBaseUrl(u) { baseUrl = u; }

async function req(path, opts = {}) {
  const r = await fetch(`${baseUrl}${path}`, opts);
  return r;
}

export async function listGoals() {
  const r = await req("/api/vault/goals");
  if (!r.ok) return [];
  const { goals } = await r.json();
  const results = await Promise.all(goals.map((id) => getGoal(id)));
  return results.filter(Boolean);
}

export async function getGoal(id) {
  const r = await req(`/api/vault/goals/${encodeURIComponent(id)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`getGoal ${id}: ${r.status}`);
  const md = await r.text();
  return parseGoal(md);
}

export async function saveGoal(goal) {
  const md = serializeGoal(goal);
  const r = await req(`/api/vault/goals/${encodeURIComponent(goal.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "text/markdown" },
    body: md,
  });
  if (!r.ok) throw new Error(`saveGoal ${goal.id}: ${r.status}`);
}

export async function readLog(date) {
  const r = await req(`/api/vault/logs/${encodeURIComponent(date)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`readLog ${date}: ${r.status}`);
  const md = await r.text();
  return parseLog(md);
}

export async function readLogsInRange({ from, to }) {
  const r = await req(
    `/api/vault/logs?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
  if (!r.ok) throw new Error(`readLogsInRange: ${r.status}`);
  const { dates } = await r.json();
  const results = await Promise.all(dates.map((d) => readLog(d)));
  return results.filter(Boolean);
}

export async function appendLog(date, event) {
  const existing = (await readLog(date)) || { date, events: [] };
  const line = `- ${event.verb} ${event.payload} → [[${event.goalId}]]`;
  const already = existing.events.some(
    (e) => `- ${e.verb} ${e.payload} → [[${e.goalId}]]` === line
  );
  if (already) return;
  const merged = { date, events: [...existing.events, event] };
  const md = serializeLog(date, merged.events);
  const r = await req(`/api/vault/logs/${encodeURIComponent(date)}`, {
    method: "PUT",
    headers: { "Content-Type": "text/markdown" },
    body: md,
  });
  if (!r.ok) throw new Error(`appendLog ${date}: ${r.status}`);
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `npm test`
Expected: PASS — all store tests green.

- [ ] **Step 5: Commit**

```bash
git add src/data/store.js src/data/store.test.js
git commit -m "feat: store.js — vault-backed client for goals + logs

Wraps /api/vault middleware. Idempotent appendLog by line match.
Range reads filter server-side. Exposed __setBaseUrl for tests."
```

---

### Task 6: Goal type modules (`wake`, `cadence`)

**Files:**
- Create: `src/data/goalTypes/wake.js`
- Create: `src/data/goalTypes/cadence.js`
- Create: `src/data/goalTypes/index.js`
- Create: `src/data/goalTypes/index.test.js`

**Interfaces:**
- Consumes: Goal + LogEvent shapes from Tasks 2, 3.
- Produces (each type module exports the same interface):
  - `buildRounds(baseline, target, startDate, endDate): Round[]` — heuristic used when LLM off.
  - `adherenceForDay({ date, currentRound, events }): "hit" | "soft" | "off" | "clean" | "none"` — semantics per §4 of the design spec.
- `index.js` exports `getType(type: string): TypeModule`.

- [ ] **Step 1: Write failing tests**

Create `src/data/goalTypes/index.test.js`:
```js
import { describe, it, expect } from "vitest";
import { getType } from "./index.js";

describe("wake.buildRounds", () => {
  const wake = getType("wake");
  it("divides baseline→target into 30-min steps across timeline", () => {
    const rounds = wake.buildRounds("08:30", "06:00", "2026-08-10", "2026-12-31");
    expect(rounds[0].targetValue).toBe("08:00");
    expect(rounds[rounds.length - 1].targetValue).toBe("06:00");
    // 2h30m / 30min = 5 steps
    expect(rounds).toHaveLength(5);
    expect(rounds[0].startDate).toBe("2026-08-10");
    expect(rounds[rounds.length - 1].endDate).toBe("2026-12-31");
  });
});

describe("wake.adherenceForDay", () => {
  const wake = getType("wake");
  const round = { n: 1, targetValue: "08:00", startDate: "2026-08-10", endDate: "2026-08-24" };

  it("hit when wake ≤ target + 15min", () => {
    expect(wake.adherenceForDay({
      date: "2026-08-11", currentRound: round,
      events: [{ verb: "wake", time: "08:12", goalId: "wake-6am" }],
    })).toBe("hit");
  });

  it("soft when 15 < delta ≤ 45", () => {
    expect(wake.adherenceForDay({
      date: "2026-08-11", currentRound: round,
      events: [{ verb: "wake", time: "08:30", goalId: "wake-6am" }],
    })).toBe("soft");
  });

  it("off when > 45min late", () => {
    expect(wake.adherenceForDay({
      date: "2026-08-11", currentRound: round,
      events: [{ verb: "wake", time: "09:15", goalId: "wake-6am" }],
    })).toBe("off");
  });

  it("none when no wake event", () => {
    expect(wake.adherenceForDay({
      date: "2026-08-11", currentRound: round, events: [],
    })).toBe("none");
  });
});

describe("cadence.buildRounds", () => {
  const cad = getType("cadence");
  it("widens intervalDays linearly across timeline", () => {
    const rounds = cad.buildRounds(
      { intervalDays: 1 }, { intervalDays: 7 },
      "2026-08-10", "2026-12-31"
    );
    expect(rounds[0].targetValue).toEqual({ intervalDays: 2 });
    expect(rounds[rounds.length - 1].targetValue).toEqual({ intervalDays: 7 });
    expect(rounds.length).toBeGreaterThanOrEqual(3);
  });
});

describe("cadence.adherenceForDay", () => {
  const cad = getType("cadence");
  const round = { n: 1, targetValue: { intervalDays: 2 }, startDate: "2026-08-10", endDate: "2026-08-24" };

  it("hit when green day (multiple of intervalDays from startDate) with session", () => {
    // 2026-08-10 is start (day 0). Green days at 0, 2, 4, ...
    // 2026-08-12 is day 2 → green
    expect(cad.adherenceForDay({
      date: "2026-08-12", currentRound: round,
      events: [{ verb: "session", time: "22:00", durationMin: 15, goalId: "cadence-reset" }],
    })).toBe("hit");
  });

  it("clean skip on non-green day with no session", () => {
    // 2026-08-11 = day 1 → not green
    expect(cad.adherenceForDay({
      date: "2026-08-11", currentRound: round, events: [],
    })).toBe("clean");
  });

  it("off plan on non-green day with session (never red)", () => {
    expect(cad.adherenceForDay({
      date: "2026-08-11", currentRound: round,
      events: [{ verb: "session", time: "22:00", durationMin: 15, goalId: "cadence-reset" }],
    })).toBe("off");
  });

  it("none on green day with no session (no penalty)", () => {
    expect(cad.adherenceForDay({
      date: "2026-08-12", currentRound: round, events: [],
    })).toBe("none");
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement wake.js**

Create `src/data/goalTypes/wake.js`:
```js
function toMin(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function fromMin(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const STEP_MIN = 30;

export function buildRounds(baseline, target, startDate, endDate) {
  const b = toMin(baseline);
  const t = toMin(target);
  const totalSteps = Math.max(1, Math.round((b - t) / STEP_MIN));
  const totalDays = Math.max(1, daysBetween(startDate, endDate));
  const perRound = Math.max(10, Math.floor(totalDays / totalSteps));
  const rounds = [];
  for (let i = 0; i < totalSteps; i++) {
    const start = addDays(startDate, i * perRound);
    const end = i === totalSteps - 1 ? endDate : addDays(startDate, (i + 1) * perRound - 1);
    rounds.push({
      n: i + 1,
      targetValue: fromMin(b - STEP_MIN * (i + 1)),
      startDate: start,
      endDate: end,
    });
  }
  return rounds;
}

export function adherenceForDay({ currentRound, events }) {
  const wake = events.find((e) => e.verb === "wake" && e.time);
  if (!wake) return "none";
  const delta = toMin(wake.time) - toMin(currentRound.targetValue);
  if (delta <= 15) return "hit";
  if (delta <= 45) return "soft";
  return "off";
}
```

- [ ] **Step 4: Implement cadence.js**

Create `src/data/goalTypes/cadence.js`:
```js
function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const MIN_DAYS_PER_ROUND = 14;

export function buildRounds(baseline, target, startDate, endDate) {
  const b = baseline.intervalDays;
  const t = target.intervalDays;
  const steps = Math.max(1, t - b);
  const totalDays = Math.max(1, daysBetween(startDate, endDate));
  const perRound = Math.max(MIN_DAYS_PER_ROUND, Math.floor(totalDays / steps));
  const rounds = [];
  for (let i = 0; i < steps; i++) {
    const start = addDays(startDate, i * perRound);
    const end = i === steps - 1 ? endDate : addDays(startDate, (i + 1) * perRound - 1);
    rounds.push({
      n: i + 1,
      targetValue: { intervalDays: b + i + 1 },
      startDate: start,
      endDate: end,
    });
  }
  return rounds;
}

export function adherenceForDay({ date, currentRound, events }) {
  const dayIdx = daysBetween(currentRound.startDate, date);
  const isGreen = dayIdx >= 0 && dayIdx % currentRound.targetValue.intervalDays === 0;
  const hasSession = events.some((e) => e.verb === "session");
  if (isGreen && hasSession) return "hit";
  if (!isGreen && !hasSession) return "clean";
  if (!isGreen && hasSession) return "off";
  return "none"; // green with no session — no penalty
}
```

- [ ] **Step 5: Implement index.js**

Create `src/data/goalTypes/index.js`:
```js
import * as wake from "./wake.js";
import * as cadence from "./cadence.js";

const TYPES = { wake, cadence };

export function getType(type) {
  const t = TYPES[type];
  if (!t) throw new Error(`Unknown goal type: ${type}`);
  return t;
}
```

- [ ] **Step 6: Run tests to confirm pass**

Run: `npm test`
Expected: PASS — all goalType tests green.

- [ ] **Step 7: Commit**

```bash
git add src/data/goalTypes/
git commit -m "feat: wake + cadence goal-type modules

Common interface: buildRounds() for LLM-off fallback,
adherenceForDay() for Home + Year rendering."
```

---

### Task 7: Seed markdown files

**Files:**
- Create: `vault/goals/wake-6am.md`
- Create: `vault/goals/cadence-reset.md`
- Create: `vault/.gitkeep`
- Create: `vault/goals/.gitkeep`

**Interfaces:**
- Consumes: goal `.md` format from Task 2.
- Produces: two committed goal files that parse cleanly via `parseGoal`.

- [ ] **Step 1: Create vault directories and gitkeep**

```bash
mkdir -p vault/goals vault/logs
touch vault/.gitkeep vault/goals/.gitkeep
```

- [ ] **Step 2: Write wake-6am.md**

Create `vault/goals/wake-6am.md`:
```markdown
---
id: wake-6am
name: Wake at 6:00 AM
cat: health
type: wake
state: active
baseline: "08:30"
target: "06:00"
endDate: 2026-12-31
currentRound: 1
createdAt: 2026-08-10
---
## Ambition
Wake at 6:00 AM every day. Own the morning before the world does.

## Rounds
| # | Target | Start | End |
|---|--------|-------|-----|
| 1 | 08:00 | 2026-08-10 | 2026-09-08 |
| 2 | 07:30 | 2026-09-09 | 2026-10-08 |
| 3 | 07:00 | 2026-10-09 | 2026-11-07 |
| 4 | 06:30 | 2026-11-08 | 2026-12-07 |
| 5 | 06:00 | 2026-12-08 | 2026-12-31 |

## How we get there
30 minutes earlier every 30 days. Bedtime shifts with the wake time — non-negotiable.

## Right direction
- Wake within 15 min of round target 5+ days a week
- Bedtime moves earlier without effort
- Morning energy above 3 of 5

## Wrong direction
- Snoozing past round target by 45+ min two days in a row
- Bedtime drifting later than round target + 8 hours

## No movement
- 7+ days no wake logged
- Same wake time held across 3 rounds
```

- [ ] **Step 3: Write cadence-reset.md**

Create `vault/goals/cadence-reset.md`:
```markdown
---
id: cadence-reset
name: Cadence reset
cat: relationships
type: cadence
state: active
baseline: {"intervalDays":1}
target: {"intervalDays":7}
endDate: 2026-12-31
currentRound: 1
createdAt: 2026-08-10
---
## Ambition
Find a healthy rhythm. Not zero, not compulsive — a cadence that lets me lead my life instead of the other way around.

## Rounds
| # | Target | Start | End |
|---|--------|-------|-----|
| 1 | every 2d | 2026-08-10 | 2026-09-04 |
| 2 | every 3d | 2026-09-05 | 2026-09-30 |
| 3 | every 4d | 2026-10-01 | 2026-10-26 |
| 4 | every 5d | 2026-10-27 | 2026-11-21 |
| 5 | every 6d | 2026-11-22 | 2026-12-17 |
| 6 | every 7d | 2026-12-18 | 2026-12-31 |

## How we get there
Widen the interval by one day roughly every four weeks. Sessions on green days are the plan; sessions on non-green days are noticed, never scolded.

## Right direction
- Green days matched
- Non-green days clean
- Length of sessions steady or shorter

## Wrong direction
- Multiple sessions on non-green days across a week
- Sessions creeping longer

## No movement
- No logs at all for 14+ days
- Same interval held across 3 rounds
```

- [ ] **Step 4: Write parse test for seeded files**

Create `vault/goals/seeds.test.js` (placed alongside seed files so tests run against the real vault):

Wait — vitest config only globs `src/**`. Move the test to `src/data/seedFiles.test.js`:

Create `src/data/seedFiles.test.js`:
```js
import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseGoal } from "./goalCodec.js";
import { getType } from "./goalTypes/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const vault = path.join(here, "..", "..", "vault", "goals");

describe("seed vault/goals/wake-6am.md", () => {
  it("parses and matches expected shape", async () => {
    const md = await readFile(path.join(vault, "wake-6am.md"), "utf8");
    const g = parseGoal(md);
    expect(g.type).toBe("wake");
    expect(g.baseline).toBe("08:30");
    expect(g.target).toBe("06:00");
    expect(g.rounds).toHaveLength(5);
    const t = getType(g.type);
    expect(t.adherenceForDay({
      date: g.rounds[0].startDate,
      currentRound: g.rounds[0],
      events: [{ verb: "wake", time: "08:05", goalId: g.id }],
    })).toBe("hit");
  });
});

describe("seed vault/goals/cadence-reset.md", () => {
  it("parses and matches expected shape", async () => {
    const md = await readFile(path.join(vault, "cadence-reset.md"), "utf8");
    const g = parseGoal(md);
    expect(g.type).toBe("cadence");
    expect(g.baseline).toEqual({ intervalDays: 1 });
    expect(g.target).toEqual({ intervalDays: 7 });
    expect(g.rounds[0].targetValue).toEqual({ intervalDays: 2 });
    const t = getType(g.type);
    expect(t.adherenceForDay({
      date: g.rounds[0].startDate,   // day 0 of round 1 → green
      currentRound: g.rounds[0],
      events: [{ verb: "session", time: "22:00", durationMin: 12, goalId: g.id }],
    })).toBe("hit");
  });
});
```

- [ ] **Step 5: Run tests to confirm all seed files parse**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add vault/ src/data/seedFiles.test.js
git commit -m "feat: seed vault with wake-6am + cadence-reset goals

Both hand-written markdown files parse via goalCodec and produce
correct adherence signals via goalTypes. Real starting state
for Becoming; replaces mockLife.js at runtime once screens wire up."
```

---

### Task 8: Home screen — empty state + real data

**Files:**
- Modify: `src/screens/Home.jsx` (full rewrite)
- Modify: `src/data/mockLife.js` (reduce to empty exports; keep file so nothing else breaks yet)
- Create: `src/screens/Home.test.jsx` — smoke render only (jsdom).
- Modify: `vitest.config.js` — add jsdom env for `.jsx` tests.
- Modify: `package.json` — add `jsdom`, `@testing-library/react`.

**Interfaces:**
- Consumes: `listGoals` from `store.js`, `CATS`, `PAPER`, `FONT`, `TYPE`, `RADIUS`, `SPACE` from `tokens.js`, existing `GoalCard`.
- Produces: nothing new for other tasks; final screen.

- [ ] **Step 1: Install jsdom + testing library**

```bash
npm install -D jsdom@^25.0.0 @testing-library/react@^16.0.0 @testing-library/jest-dom@^6.5.0
```

- [ ] **Step 2: Split vitest config into node + jsdom projects**

Replace `vitest.config.js`:
```js
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.js"],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: ["src/**/*.test.jsx"],
          globals: true,
        },
      },
    ],
  },
});
```

- [ ] **Step 3: Reduce mockLife.js to empty exports**

Replace `src/data/mockLife.js` contents entirely:
```js
// mockLife.js is retired. Real data lives in vault/goals/*.md and is loaded
// via src/data/store.js. This file remains only to satisfy old imports until
// every screen has been migrated; the exports below are empty on purpose.
export const GOALS = [];
export const QUESTIONS = [];
export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function buildYear() { return Array.from({ length: 12 }, () => []); }
export function isMonthDormant() { return false; }
```

- [ ] **Step 4: Write failing smoke test for Home**

Create `src/screens/Home.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "./Home.jsx";

vi.mock("../data/store.js", () => ({
  listGoals: vi.fn(),
}));
import { listGoals } from "../data/store.js";

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

beforeEach(() => {
  listGoals.mockReset();
});

describe("Home empty state", () => {
  it("shows the CTA when no goals exist", async () => {
    listGoals.mockResolvedValue([]);
    renderHome();
    await waitFor(() =>
      expect(screen.getByText(/set your first goal/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/no goals yet/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /who are you becoming/i })).toBeInTheDocument();
  });
});

describe("Home populated state", () => {
  it("renders one GoalCard per goal", async () => {
    listGoals.mockResolvedValue([
      { id: "wake-6am", name: "Wake at 6:00 AM", cat: "health", state: "active",
        ambition: "", type: "wake", baseline: "08:30", target: "06:00",
        rounds: [], currentRound: 1, indicators: { right: [], wrong: [], stall: [] },
        headline: { n: 0, unit: "days marked" } },
      { id: "cadence-reset", name: "Cadence reset", cat: "relationships", state: "active",
        ambition: "", type: "cadence", baseline: { intervalDays: 1 }, target: { intervalDays: 7 },
        rounds: [], currentRound: 1, indicators: { right: [], wrong: [], stall: [] },
        headline: { n: 0, unit: "days marked" } },
    ]);
    renderHome();
    await waitFor(() => {
      expect(screen.getByText("Wake at 6:00 AM")).toBeInTheDocument();
      expect(screen.getByText("Cadence reset")).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 5: Run tests to confirm fail**

Run: `npm test`
Expected: FAIL — Home still uses `GOALS` from mockLife (now empty) but also references retired `NIGHT.bgGradient`.

- [ ] **Step 6: Rewrite Home.jsx**

Replace `src/screens/Home.jsx`:
```jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PAPER, FONT, TYPE, RADIUS, SPACE, CATS } from "../tokens.js";
import { listGoals } from "../data/store.js";
import GoalCard from "../components/GoalCard.jsx";

export default function Home() {
  const [goals, setGoals] = useState(null); // null = loading

  useEffect(() => {
    listGoals().then(setGoals).catch(() => setGoals([]));
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: PAPER.bg,
        color: PAPER.ink,
        fontFamily: FONT.sans,
        padding: "36px 26px 96px",
      }}
    >
      <style>{`
        @keyframes breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        .breathe { animation: breathe 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .breathe { animation: none; } }
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <header style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11.5, letterSpacing: "1.8px", textTransform: "uppercase",
            color: PAPER.faint, marginBottom: 8, fontWeight: 500,
          }}>
            {today}
          </div>
          <h1 style={{
            fontFamily: FONT.serif, fontWeight: 400, fontSize: TYPE.h1,
            lineHeight: 1.25, margin: 0, color: PAPER.ink,
          }}>
            Who are you becoming?
          </h1>
          {goals && goals.length > 0 && (
            <p style={{ color: PAPER.dim, fontSize: TYPE.body, margin: "10px 0 0" }}>
              {goals.filter((g) => g.state === "active" || g.state === "drift").length} goals in motion
            </p>
          )}
        </header>

        {goals === null && (
          <p style={{ color: PAPER.faint, fontSize: TYPE.body }}>Reading your vault…</p>
        )}

        {goals && goals.length === 0 && <EmptyHome />}

        {goals && goals.length > 0 && (
          <>
            <div style={{ display: "grid", gap: SPACE.md }}>
              {goals.map((g) => <GoalCard key={g.id} goal={g} />)}
            </div>
            <div style={{ marginTop: SPACE.xl, textAlign: "center" }}>
              <Link to="/onboard" style={ctaStyle}>+ New goal</Link>
            </div>
          </>
        )}

        <footer style={{ marginTop: 36, textAlign: "center", fontSize: 13 }}>
          <Link to="/year" style={{ color: PAPER.dim, textDecoration: "none" }}>
            Zoom out — see your year ↓
          </Link>
        </footer>
      </div>
    </div>
  );
}

const ctaStyle = {
  display: "inline-block",
  background: PAPER.card,
  border: `1px solid ${PAPER.line}`,
  borderRadius: RADIUS.pill,
  padding: "10px 22px",
  color: PAPER.ink,
  fontSize: TYPE.body,
  textDecoration: "none",
  fontFamily: FONT.sans,
};

function EmptyHome() {
  return (
    <div style={{
      background: PAPER.card,
      border: `1px solid ${PAPER.line}`,
      borderRadius: RADIUS.r1,
      padding: "40px 28px",
      textAlign: "center",
    }}>
      <p style={{
        fontFamily: FONT.serif, fontStyle: "italic",
        fontSize: TYPE.ambition, color: PAPER.ink, margin: "0 0 8px",
      }}>
        "One step, one punch, one round at a time."
      </p>
      <p style={{ color: PAPER.dim, fontSize: TYPE.body, margin: "0 0 24px" }}>
        No goals yet. Start with one.
      </p>
      <Link to="/onboard" style={ctaStyle}>+ Set your first goal</Link>
    </div>
  );
}
```

Note on `GoalCard`: existing component reads `goal.headline.n`, `goal.momentum`, etc. Our real goals from `store.js` don't populate those. Two options — pick the minimal one:

**Option chosen:** normalize inside Home before passing to GoalCard so GoalCard remains untouched this phase.

Add before mapping:
```jsx
const enriched = goals.map((g) => ({
  ...g,
  momentum: 0,        // Phase 3 fills real momentum from logs
  last: "—",
  lastDetail: "no logs yet",
  streak: null,
  headline: { n: 0, unit: "days marked" },
  period: g.rounds && g.rounds[g.currentRound - 1]
    ? { label: `Round ${g.currentRound}`, target: renderTargetLabel(g) }
    : null,
  projects: [],
  habits: [],
}));
```

And a helper at bottom of file (before `EmptyHome`):
```jsx
function renderTargetLabel(g) {
  const r = g.rounds[g.currentRound - 1];
  if (g.type === "wake") return `wake by ${r.targetValue} until ${r.endDate}`;
  if (g.type === "cadence") return `every ${r.targetValue.intervalDays}d until ${r.endDate}`;
  return "";
}
```

Replace `goals.map((g) => <GoalCard ...` with `enriched.map(...)`.

- [ ] **Step 7: Add setup for @testing-library/jest-dom**

Create `src/test-setup.js`:
```js
import "@testing-library/jest-dom/vitest";
```

Modify `vitest.config.js` jsdom project:
```js
{
  extends: true,
  test: {
    name: "jsdom",
    environment: "jsdom",
    include: ["src/**/*.test.jsx"],
    globals: true,
    setupFiles: ["src/test-setup.js"],
  },
},
```

- [ ] **Step 8: Run tests to confirm pass**

Run: `npm test`
Expected: PASS on Home smoke tests + all previous tests still green.

- [ ] **Step 9: Manual smoke — run dev server**

Run: `npm run dev`
- Visit `http://localhost:5173/` — expect two goal cards (wake-6am, cadence-reset).
- Delete vault/goals/*.md temporarily (or rename dir) → reload → expect empty state with Rocky quote + CTA.
- Restore files.

Expected: both states render, no console errors, no red anywhere.

- [ ] **Step 10: Commit**

```bash
git add src/screens/Home.jsx src/data/mockLife.js src/screens/Home.test.jsx src/test-setup.js vitest.config.js package.json package-lock.json
git commit -m "feat: Home reads from store — empty state + real goals

Home migrates to PAPER theme. Empty state shows Rocky quote and
CTA to /onboard. Populated state pulls goals from vault via
listGoals(); normalizes shape to what GoalCard expects (momentum
+ headline stubbed to 0 pending Phase 3 log adherence)."
```

---

### Task 9: Year screen — reads from store, no more mocks

**Files:**
- Modify: `src/screens/Year.jsx`

**Interfaces:**
- Consumes: `listGoals` from `store.js`, `CATS`, `PAPER`, `FONT`, `TYPE` from tokens.
- Produces: nothing.

Year screen currently imports `GOALS`, `MONTHS`, `buildYear`, `isMonthDormant` from mockLife. Phase 1 goal: replace `GOALS` with real store data; keep the synthetic `buildYear` render for now (real log-driven marks come in Phase 3). Pen chips list real goals only.

- [ ] **Step 1: Read current Year.jsx to identify import points**

Run: `cat src/screens/Year.jsx | head -20`
Note the imports referencing `GOALS`.

- [ ] **Step 2: Modify Year.jsx to load goals from store**

Add near top of `src/screens/Year.jsx`:
```jsx
import { useEffect, useState } from "react";
import { listGoals } from "../data/store.js";
```

Replace direct `GOALS` usage: introduce a state variable populated from the store. Wherever the component reads `GOALS`, read `goals` from state. If `goals === null`, render a "Reading your vault…" placeholder matching Home. If `goals.length === 0`, render:
```jsx
<div style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
  <p style={{ color: PAPER.dim }}>
    Nothing to look back on yet — set your first goal on{" "}
    <Link to="/" style={{ color: PAPER.ink }}>Life</Link>.
  </p>
</div>
```

Keep `buildYear` seeded from mockLife for now (Phase 3 replaces it with real adherence). This makes the year visually render even without logs.

- [ ] **Step 3: Verify with dev server**

Run: `npm run dev`
- Visit `/year` — expect two pen chips (Wake at 6:00 AM, Cadence reset). Selecting each highlights its color blobs and fades others per existing overlap logic.
- Delete vault/goals/*.md → reload → expect the empty message.
- Restore.

Expected: pen chips render real goals, overlap+highlight still works.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Year.jsx
git commit -m "feat: Year reads goals from store

Pen chips list real vault goals; synthetic year blobs stay
for one more phase until log-driven adherence lands."
```

---

### Task 10: Manual verification + Phase 1 close

**Files:** none.

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: all green.

- [ ] **Step 2: Manual end-to-end walkthrough**

Run: `npm run dev`
- Home shows both real goals.
- Click a card → currently jumps to `/goal/:id` if wired (may 404 in Phase 1; that's expected — Phase 4 builds it).
- Year lists both goals as pen chips; overlap+highlight works.
- Delete `vault/goals/wake-6am.md` → reload Home → shows only cadence-reset.
- Delete both → reload → empty state renders with Rocky quote.
- Restore files (git checkout).
- Open `vault/goals/wake-6am.md` in a text editor — edit `currentRound: 1` → `currentRound: 2`. Reload Home. Period label reads "Round 2" and shows round 2's target.

Expected: everything above holds. If not, do not close Phase 1.

- [ ] **Step 3: Open PR for Phase 1**

```bash
git push -u origin balboa-breakdown
gh pr create --title "phase 1: vault-backed store + empty-state Home + two real goals" --body "$(cat <<'EOF'
## Summary
- Adds vitest + tiny hand-rolled markdown codec (front-matter + fixed-section body).
- Introduces `vault/` as the source of truth: `vault/goals/*.md` committed, `vault/logs/*.md` gitignored.
- Vite dev middleware `/api/vault/*` bridges filesystem read/write with a `store.js` client.
- Wake and cadence goal-type modules provide `buildRounds` + `adherenceForDay`.
- Seeds two real goals (wake-6am, cadence-reset) that parse cleanly and render on Home + Year.
- Home migrates to PAPER theme with a dignified empty state (Rocky quote + CTA to `/onboard`).
- mockLife.js reduced to empty exports until Year/Goal workspace migrate fully.

## Test plan
- [ ] `npm test` — all green (md, goalCodec, logCodec, vaultMiddleware, store, goalTypes, seeds, Home smoke)
- [ ] `npm run dev` — Home renders both goals; deleting vault files renders empty state; editing `currentRound` in .md reflects on reload
- [ ] `/year` — pen chips list real goals; overlap+highlight still works

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR opens.

---

## Self-review (done inline)

**Spec coverage check:**
- §3.1 vault layout → Tasks 4, 7 ✓
- §3.2 Goal shape → Task 2 ✓
- §3.3 Log shape → Task 3 ✓
- §3.4 store interface → Task 5 ✓
- §4.1/4.2 goal-type modules → Task 6 ✓
- §6 LLM adapter → Phase 2 (not this plan) ✓ (deferred correctly)
- §7.1 empty Home → Task 8 ✓
- §7.5 Year unchanged rendering → Task 9 ✓
- §9 Phase 1 list — all items covered ✓

**Type consistency:** `Goal.rounds[i].targetValue` is string for wake, `{intervalDays}` for cadence — used consistently in codec, goalTypes, seeds, Home helper. `LogEvent` shape { verb, payload, goalId, time?, durationMin? } consistent across logCodec, store, goalTypes.

**Placeholder scan:** none. Every step has runnable code or a specific manual check.

**Global constraint traceability:** no red anywhere (Home rewrite verified), tokens sourced from `src/tokens.js`, accumulation-only copy on Home empty state, `prefers-reduced-motion` handled in Home stylesheet.

---
