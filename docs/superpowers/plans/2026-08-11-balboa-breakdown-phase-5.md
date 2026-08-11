# Balboa Breakdown — Phase 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire the polish backlog. Every hex moves into `tokens.js`. Year tap-again unmarks. Goal workspace shows real momentum. Insights refresh on save and grow to include indicator-driven questions. Small cleanup items land.

**Architecture:** Additive token entries in `src/tokens.js` (`scrim`, `shadow`, `cardBorder`) unlock a mechanical hex-to-token migration across LogSheet, LogBlob, GoalCard, and Year. A new `store.deleteLogEvent(date, eventKey)` DELETE endpoint on the vault middleware plus a Year `onDayTap` branch closes the tap-to-unmark loop. Goal.jsx gets a real `momentum()` call. Home recomputes insights + re-advances rounds after every LogSheet save. `insights.js` gains an indicator-driven flavor that walks `goal.indicators.wrong` against recent adherence to emit questions in the user's own words.

**Tech Stack:** No new deps. Vitest 2, React 18, existing store/adherence/rounds/insights.

## Global Constraints

- Paper theme only — every new hex must land in `src/tokens.js`, not in a component. No hex outside tokens by the end of Phase 5.
- No red anywhere. Off-plan and drift keep `PAPER.whisper`.
- Accumulation-only copy.
- Category color = identity — one hue per goal across every surface.
- `prefers-reduced-motion` disables all animation.
- All new modules ESM.
- Log delete is idempotent (deleting a missing event is a no-op, returns 200).
- Insight rejection stays visually free — dismissed IDs persist in localStorage.
- Existing test count (114) must not decrease; new work adds tests.

---

### Task 1: Token additions + hex migration

**Files:**
- Modify: `src/tokens.js` — add `PAPER.scrim`, `PAPER.shadow`, `PAPER.cardBorder`.
- Modify: `src/components/LogSheet.jsx` — replace 2 `rgba()` literals with `PAPER.scrim` (overlay) + `PAPER.shadow` (sheet drop shadow).
- Modify: `src/components/LogBlob.jsx` — replace 1 `rgba()` literal with `PAPER.shadow` (button drop shadow).
- Modify: `src/components/GoalCard.jsx` — replace all `NIGHT.*` references with the equivalent `PAPER.*` (or `PAPER.cardBorder` for the `NIGHT.cardBorder` undefined field), remove `NIGHT` import.
- Modify: `src/screens/Year.jsx` — replace hardcoded `#FFFFFF` (twice: tooltip background, focus panel), `#ECE9F2` (tooltip border), `#7FA0D8` (blurb "ai" color), `#B79FD8` (blurb "reading" color) with `PAPER.card`, `PAPER.line`, `CATS.ai.color`, `CATS.reading.color`.
- Modify: `src/tokens.js` — mark `NIGHT` alias for deletion once GoalCard migrates (leave the alias in one more phase; add a `// TODO: delete after Phase 5` comment).

**Interfaces:**
- Consumes: none new.
- Produces: `PAPER.scrim: string`, `PAPER.shadow: string`, `PAPER.cardBorder: string`.

- [ ] **Step 1: Add tokens**

Read `/Users/munish/becoming/src/tokens.js`. Inside the `PAPER` object literal, add:
```js
  scrim: "rgba(0,0,0,0.12)",          // sheet overlay dim, brand-neutral black-alpha
  shadow: "0 6px 20px rgba(85,80,92,0.10)", // shadow token; RGB derives from PAPER.ink
  cardBorder: "#E7E2D5",              // matches PAPER.line — added so NIGHT.cardBorder no longer resolves undefined
```

Add a one-line comment above the block: `// Neutral scrim + shadow tokens — the only "off-palette" values are here so components stay hex-free.`

- [ ] **Step 2: Migrate LogSheet.jsx**

Read `/Users/munish/becoming/src/components/LogSheet.jsx`. Change:
- `background: "rgba(0,0,0,0.12)"` → `background: PAPER.scrim`.
- `boxShadow: "0 -10px 40px rgba(0,0,0,0.15)"` → since this is a top-facing shadow not covered by `PAPER.shadow` (which is bottom-facing), add a second token `PAPER.sheetShadow: "0 -10px 40px rgba(0,0,0,0.15)"` alongside `PAPER.shadow` and use it here. If the token feels over-specific, keep the literal but move both shadow values into `PAPER.sheetShadow` and `PAPER.shadow` so all shadows are tokenized.

Add `PAPER.sheetShadow: "0 -10px 40px rgba(0,0,0,0.15)"` to tokens.js in the same step.

- [ ] **Step 3: Migrate LogBlob.jsx**

Read `/Users/munish/becoming/src/components/LogBlob.jsx`. Change:
- `boxShadow: "0 6px 20px rgba(85,80,92,0.10)"` → `boxShadow: PAPER.shadow`.

- [ ] **Step 4: Migrate GoalCard.jsx**

Read `/Users/munish/becoming/src/components/GoalCard.jsx`. Grep for `NIGHT.` — replace each:
- `NIGHT.card` → `PAPER.card`
- `NIGHT.dim` → `PAPER.dim`
- `NIGHT.faint` → `PAPER.faint`
- `NIGHT.text` → `PAPER.ink` (retired `text` alias mapped to `ink`)
- `NIGHT.whisper` → `PAPER.whisper`
- `NIGHT.cardBorder` → `PAPER.cardBorder`
- Any other `NIGHT.*` → the matching `PAPER.*`

Replace `import { NIGHT, … } from "../tokens.js";` with `import { PAPER, … }`.

- [ ] **Step 5: Migrate Year.jsx**

Read `/Users/munish/becoming/src/screens/Year.jsx`. Grep for `"#`:
- `background: "#FFFFFF"` (both occurrences) → `background: PAPER.card`
- `border: "1px solid #ECE9F2"` → `border: `1px solid ${PAPER.line}``
- Blurb inline `color: "#7FA0D8"` → `color: CATS.ai.color`
- Blurb inline `color: "#B79FD8"` → `color: CATS.reading.color`

Verify no other hex literals remain in Year.jsx.

- [ ] **Step 6: Run tests**

Run: `npm test` from `/Users/munish/becoming`.
Expected: all 114 tests pass. No new tests required — pure token substitution.

- [ ] **Step 7: Manual smoke**

Run: `npm run dev`. Load `/`, `/year`, `/goal/wake-6am`. Confirm no visual regression (colors identical; NIGHT.cardBorder previously rendered borderless — now borders render `PAPER.line` correctly).

- [ ] **Step 8: Commit**

```bash
git add src/tokens.js src/components/LogSheet.jsx src/components/LogBlob.jsx src/components/GoalCard.jsx src/screens/Year.jsx
git commit -m "refactor: hex-to-token migration + PAPER.scrim/shadow/cardBorder

Every remaining hex outside tokens.js moves into tokens as a
named PAPER key. GoalCard drops the NIGHT alias — cardBorder
now resolves to PAPER.line so borders render instead of
rendering \`1px solid undefined\`. Year tooltip + blurb colors
route through CATS.ai / CATS.reading."
```

---

### Task 2: Misc cleanups

**Files:**
- Modify: `src/screens/Onboard.jsx` — guard `?turn=<bogus>` (see Phase 4 Task 4 ledger).
- Modify: `src/components/LogSheet.jsx` — deduplicate placeholder copy vs. kicker (Phase 3 Task 3 ledger).
- Modify: `src/data/goalTypes/wake.js` — add `date` param to `adherenceForDay` signature for interface uniformity (Phase 1 Task 6 ledger).
- Modify: `src/screens/Onboard.jsx` — remove unused `SPACE` import (Phase 2 Task 5 ledger).
- Modify: `src/components/InsightCard.jsx` — remove unused `TYPE` import (Phase 4 Task 6 ledger).

**Interfaces:**
- No new signatures. `wake.adherenceForDay` now accepts `{ date, currentRound, events }` — matches `cadence.adherenceForDay`. `date` unused inside.

- [ ] **Step 1: Onboard bogus turn guard**

Read `/Users/munish/becoming/src/screens/Onboard.jsx`. Locate:
```js
const target = jumpTurn || TURNS[Object.keys(answers).length];
```
Change to:
```js
const validJump = jumpTurn && TURNS.includes(jumpTurn) ? jumpTurn : null;
const target = validJump || TURNS[Object.keys(answers).length];
```

- [ ] **Step 2: LogSheet placeholder dedup**

Read `/Users/munish/becoming/src/components/LogSheet.jsx`. The section kicker reads `LOG YOUR DAY — JUST WRITE`; the textarea `placeholder="log your day — just write"` duplicates it. Change the textarea placeholder to something instructive:
```js
placeholder="woke 07:12 · session 22:00 · 15min"
```

- [ ] **Step 3: wake.adherenceForDay signature**

Read `/Users/munish/becoming/src/data/goalTypes/wake.js`. Change:
```js
export function adherenceForDay({ currentRound, events }) {
```
To:
```js
export function adherenceForDay({ date, currentRound, events }) { // date unused for wake; kept for interface uniformity with cadence
```

- [ ] **Step 4: Remove unused imports**

- `src/screens/Onboard.jsx`: remove `SPACE` from the tokens import line.
- `src/components/InsightCard.jsx`: remove `TYPE` from the tokens import line.

- [ ] **Step 5: Run tests**

Run: `npm test`.
Expected: all 114 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/screens/Onboard.jsx src/components/LogSheet.jsx src/data/goalTypes/wake.js src/components/InsightCard.jsx
git commit -m "chore: onboard turn guard, log placeholder rewrite, unused imports

- Onboard rejects unknown ?turn values and falls back to the
  next unanswered turn instead of rendering an empty bubble.
- LogSheet placeholder becomes an example instead of echoing
  the kicker text.
- wake.adherenceForDay gains a \`date\` param for interface
  uniformity with cadence.
- Drop unused SPACE (Onboard) and TYPE (InsightCard) imports."
```

---

### Task 3: Log delete API + Year tap-again unmark

**Files:**
- Modify: `src/data/store.js` — add `deleteLogEvent(date, event): Promise<void>` that removes the matching event line from the log file (idempotent — no-op if absent).
- Modify: `src/dev/vaultMiddleware.js` — accept `DELETE /api/vault/logs/:date` with a JSON body `{ line: string }` that removes a single line from the file. If the file becomes empty after removal, keep the file with only its front-matter.
- Modify: `src/dev/vaultMiddleware.test.js` — add one test for DELETE.
- Modify: `src/data/store.test.js` — add one test for `deleteLogEvent`.
- Modify: `src/screens/Year.jsx` — extend `onDayTap` so that when the tapped day already has an event for the pen goal (status `hit` or `soft`), a tap deletes it. Non-green cadence taps still write (Phase 3 behavior); wake taps on `hit`/`soft` now unmark.

**Interfaces:**
- Consumes: existing `store.readLog`, `store.appendLog`.
- Produces:
  - `store.deleteLogEvent(date: string, event: { verb, payload?, time?, durationMin?, goalId }): Promise<void>` — reads the log, filters out the exact serialized line (using `logCodec.serializeEvent`), writes back if the file changed.
  - Middleware: `DELETE /api/vault/logs/:date` with body `{ line: string }` removes that exact line from the file. 200 on success, 404 if the file doesn't exist.

- [ ] **Step 1: Extend logCodec test coverage isn't necessary — deleteLogEvent is a store-level operation. Write the middleware test first.**

Add to `src/dev/vaultMiddleware.test.js`:
```js
describe("DELETE /api/vault/logs/:date", () => {
  it("removes exactly one matching line from the file", async () => {
    const initial = `---
date: 2026-08-11
---

- wake 07:12 → [[wake-6am]]
- session 22:00 · 15min → [[cadence-reset]]
`;
    await writeFile(path.join(dir, "logs", "2026-08-11.md"), initial);
    const body = JSON.stringify({ line: "- wake 07:12 → [[wake-6am]]" });
    const { req, res, done } = mock("DELETE", "/api/vault/logs/2026-08-11", body);
    mw(req, res, () => {});
    await done;
    const after = await readFile(path.join(dir, "logs", "2026-08-11.md"), "utf8");
    expect(after).not.toContain("wake 07:12");
    expect(after).toContain("session 22:00");
  });

  it("returns 404 when the file does not exist", async () => {
    const body = JSON.stringify({ line: "- wake 07:12 → [[wake-6am]]" });
    const { req, res, done } = mock("DELETE", "/api/vault/logs/2026-08-11", body);
    mw(req, res, () => {});
    await done;
    expect(res.statusCode).toBe(404);
  });

  it("is idempotent when the line is missing", async () => {
    const initial = `---
date: 2026-08-11
---

- session 22:00 · 15min → [[cadence-reset]]
`;
    await writeFile(path.join(dir, "logs", "2026-08-11.md"), initial);
    const body = JSON.stringify({ line: "- wake 07:12 → [[wake-6am]]" });
    const { req, res, done } = mock("DELETE", "/api/vault/logs/2026-08-11", body);
    mw(req, res, () => {});
    await done;
    expect(res.statusCode).toBe(200);
    const after = await readFile(path.join(dir, "logs", "2026-08-11.md"), "utf8");
    expect(after).toContain("session 22:00");
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

Run: `npm test src/dev/vaultMiddleware.test.js`
Expected: FAIL — DELETE not handled.

- [ ] **Step 3: Implement DELETE in vaultMiddleware.js**

Read `/Users/munish/becoming/src/dev/vaultMiddleware.js`. Add before the fall-through:
```js
// DELETE /api/vault/logs/:date
m = url.match(/^\/api\/vault\/logs\/([^/?#]+)$/);
if (m && req.method === "DELETE") {
  const date = decodeURIComponent(m[1]);
  if (!DATE_RE.test(date)) return send(res, 400, { error: "bad date" });
  const file = path.join(logsDir, `${date}.md`);
  let src;
  try {
    src = await readFile(file, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return send(res, 404, { error: "not found" });
    throw err;
  }
  const body = await readBody(req);
  const { line } = JSON.parse(body || "{}");
  if (typeof line !== "string") return send(res, 400, { error: "line required" });
  const lines = src.split("\n");
  const filtered = lines.filter((l) => l !== line);
  const next = filtered.join("\n");
  if (next !== src) await writeFile(file, next, "utf8");
  return send(res, 200, { ok: true });
}
```

- [ ] **Step 4: Run tests**

Run: `npm test src/dev/vaultMiddleware.test.js`
Expected: PASS.

- [ ] **Step 5: Add store.deleteLogEvent test**

Add to `src/data/store.test.js`:
```js
describe("deleteLogEvent", () => {
  it("removes the matching event and leaves others intact", async () => {
    await store.appendLog("2026-08-11", {
      verb: "wake", time: "07:12", goalId: "wake-6am",
    });
    await store.appendLog("2026-08-11", {
      verb: "session", time: "22:00", durationMin: 15, goalId: "cadence-reset",
    });
    await store.deleteLogEvent("2026-08-11", {
      verb: "wake", time: "07:12", goalId: "wake-6am",
    });
    const log = await store.readLog("2026-08-11");
    expect(log.events).toHaveLength(1);
    expect(log.events[0].verb).toBe("session");
  });

  it("is idempotent when event is missing", async () => {
    await store.appendLog("2026-08-11", {
      verb: "session", time: "22:00", durationMin: 15, goalId: "cadence-reset",
    });
    await store.deleteLogEvent("2026-08-11", {
      verb: "wake", time: "07:12", goalId: "wake-6am",
    });
    const log = await store.readLog("2026-08-11");
    expect(log.events).toHaveLength(1);
  });
});
```

- [ ] **Step 6: Implement deleteLogEvent in store.js**

Read `/Users/munish/becoming/src/data/store.js`. Add:
```js
import { serializeEvent } from "./logCodec.js";  // already imported? if not, add

export async function deleteLogEvent(date, event) {
  const line = serializeEvent(event);
  const r = await req(`/api/vault/logs/${encodeURIComponent(date)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ line }),
  });
  if (r.status === 404) return; // idempotent — nothing to delete
  if (!r.ok) throw new Error(`deleteLogEvent ${date}: ${r.status}`);
}
```

- [ ] **Step 7: Run tests**

Run: `npm test`
Expected: all previous tests + 5 new (3 middleware + 2 store).

- [ ] **Step 8: Wire tap-again into Year.jsx**

Read `/Users/munish/becoming/src/screens/Year.jsx`. Locate `onDayTap`. Modify to check current status and delete when tapping a `hit`/`soft`:

```jsx
async function onDayTap({ dateISO, status }) {
  if (!pen) return;
  const goal = pen;

  // If the day already has a hit/soft for this goal, tapping unmarks it.
  if (status === "hit" || status === "soft") {
    if (goal.type === "wake") {
      // Delete the wake event on this day for this goal — pick the first
      // wake event for this goal from the day's log.
      const log = logs.find((l) => l.date === dateISO);
      const wakeEvt = log?.events.find((e) => e.goalId === goal.id && e.verb === "wake");
      if (wakeEvt) {
        await deleteLogEvent(dateISO, wakeEvt);
        await refreshLogs();
      }
      return;
    }
    if (goal.type === "cadence") {
      const log = logs.find((l) => l.date === dateISO);
      const sessionEvt = log?.events.find((e) => e.goalId === goal.id && e.verb === "session");
      if (sessionEvt) {
        await deleteLogEvent(dateISO, sessionEvt);
        await refreshLogs();
      }
      return;
    }
  }

  // Existing write path for empty days
  if (goal.type === "wake") {
    await appendLog(dateISO, { verb: "wake", time: "07:00", goalId: goal.id });
  } else if (goal.type === "cadence") {
    await appendLog(dateISO, { verb: "session", durationMin: 10, goalId: goal.id });
  }
  await refreshLogs();
}
```

Import `deleteLogEvent` from `../data/store.js`. Pass `status` into the DayCell's `onToggle` handler wherever it calls `onDayTap` — you may need to add `status={status}` prop plumbing.

- [ ] **Step 9: Run full test suite**

Run: `npm test`
Expected: all previous tests pass + new middleware/store tests.

- [ ] **Step 10: Manual smoke — dev server**

Run: `npm run dev`.
- Hold wake pen. Tap an empty day → mark appears.
- Tap the same day → mark disappears. Reload → still gone.
- Hold cadence pen. Tap a green day → session hit appears. Tap again → gone.

- [ ] **Step 11: Commit**

```bash
git add src/data/store.js src/data/store.test.js src/dev/vaultMiddleware.js src/dev/vaultMiddleware.test.js src/screens/Year.jsx
git commit -m "feat: log delete API + Year tap-again unmarks

New DELETE /api/vault/logs/:date removes exactly one line
by content. store.deleteLogEvent is idempotent. Year DayCell
now toggles: tap empty → write; tap hit/soft → delete."
```

---

### Task 4: Goal orb real momentum + Home post-save refresh

**Files:**
- Modify: `src/screens/Goal.jsx` — pass a real `momentum({ goal, logs, asOf })` to Orb instead of the hardcoded `0.5`.
- Modify: `src/screens/Home.jsx` — after LogSheet `onSaved`, recompute insights + re-run `advanceGoal` on each goal so intra-session round crossings + insight staleness are handled.

**Interfaces:**
- Consumes: `momentum` from `src/data/adherence.js` (already imported by Home).
- Produces: none.

- [ ] **Step 1: Wire momentum into Goal.jsx**

Read `/Users/munish/becoming/src/screens/Goal.jsx`. Import:
```js
import { momentum } from "../data/adherence.js";
import { todayLocalISO } from "../lib/date.js"; // already imported
```

Compute inside the render body after `goal` and `logs` are loaded:
```js
const goalMomentum = momentum({ goal, logs, asOf: todayLocalISO() });
```

Replace `<Orb cat={goal.cat} momentum={0.5} still={…} />` with:
```jsx
<Orb cat={goal.cat} momentum={goalMomentum} still={…} />
```

- [ ] **Step 2: Refresh insights + re-advance in Home LogSheet onSaved**

Read `/Users/munish/becoming/src/screens/Home.jsx`. Locate the `onSaved={async () => { … }}` block. It currently does:
```js
const [g, l] = await Promise.all([listGoals(), readLogsInRange(...)]);
setGoals(g);
setLogs(l);
```

Extend to apply auto-advance + regenerate insights, matching the mount effect:
```js
const [gRaw, l] = await Promise.all([listGoals(), readLogsInRange({ from: rangeStart(), to: rangeEnd() })]);
const today = todayLocalISO();
const g = [];
for (const goal of gRaw) {
  const { goal: next, changed } = advanceGoal(goal, today);
  if (changed) saveGoal(next).catch(() => {});
  g.push(next);
}
setGoals(g);
setLogs(l);
setInsights(generateInsights({ goals: g, logs: l, today }));
```

- [ ] **Step 3: Add a Goal.jsx test asserting momentum is computed from logs**

Update `src/screens/Goal.test.jsx`. Extend `readLogsInRange.mockResolvedValue([...])` in one test to include real hit-band events. Import `momentum` too, but the assertion can be indirect: verify the Orb receives a non-0.5 prop by rendering to string and checking there's an SVG with the goal's category color... actually a simpler test: extract `momentum` value via a hidden `data-testid` on the Orb wrapper, e.g.:

Simpler: add a `data-momentum` attribute to the Orb wrapper `<div>` in Goal.jsx displaying `goalMomentum.toFixed(2)`. Then:
```jsx
it("passes real momentum to Orb based on logs", async () => {
  getGoal.mockResolvedValue({ …WAKE_GOAL, currentRound: 1,
    rounds: [{ n: 1, targetValue: "08:00", startDate: "2026-08-01", endDate: "2026-08-31" }],
  });
  readLogsInRange.mockResolvedValue([
    { date: "2026-08-15", events: [{ verb: "wake", time: "08:05", goalId: "wake-6am" }] },
  ]);
  renderGoal();
  const orbWrap = await screen.findByTestId("goal-orb-wrap");
  expect(Number(orbWrap.dataset.momentum)).toBeGreaterThan(0);
});
```

Add `data-testid="goal-orb-wrap"` and `data-momentum={goalMomentum.toFixed(2)}` to the Orb wrapper div in Goal.jsx.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all previous tests pass + the new Goal momentum test.

- [ ] **Step 5: Manual smoke**

Run: `npm run dev`.
- Visit `/goal/wake-6am`. Orb size reflects real momentum.
- On Home, log an event via LogSheet — insights refresh in the same session (no page reload needed).

- [ ] **Step 6: Commit**

```bash
git add src/screens/Goal.jsx src/screens/Goal.test.jsx src/screens/Home.jsx
git commit -m "feat: Goal orb real momentum + Home post-save refresh

Goal workspace Orb now sizes from momentum() over the 30-day
log window instead of a hardcoded 0.5. Home's LogSheet
onSaved re-runs auto-advance and regenerates insights so
intra-session round crossings and drift resolutions don't
wait for a reload."
```

---

### Task 5: Indicator-driven insights

**Files:**
- Modify: `src/data/insights.js` — add a third insight flavor: for each active goal with `indicators.wrong.length > 0`, if the goal has been showing sustained soft or off statuses over the last 7 days (≥3 off + soft combined), emit an indicator-echo question using the goal's own `wrong` indicator language.
- Modify: `src/data/insights.test.js` — add tests.

**Interfaces:**
- Consumes: `dailyAdherence` from `src/data/adherence.js`, `addDaysLocalISO` from `src/lib/date.js`, existing `momentum` import.
- Produces: new `InsightQuestion` id prefix `wrong-echo-<goalId>-<today>`.

Rule (Phase 5 flavor):
- Count `off` + `soft` in last 7 days via `dailyAdherence`.
- If count ≥ 3 AND `goal.indicators.wrong.length > 0`:
  - Kicker: `"A pattern I'm noticing"`.
  - Text: `"{goal.name} has hit the '{first wrong indicator}' signal more than once this week. Is that something you're watching?"`.
  - yes = `{label: "Yes, I see it", response: "Named. I'll keep watching too."}`.
  - no = `{label: "Not a real pattern", response: "Fair. I'll trust the noise."}`.

Priority: drift → wrong-echo → low-momentum.

- [ ] **Step 1: Write failing tests**

Add to `src/data/insights.test.js`:
```js
describe("generateInsights — indicator echo", () => {
  const goalWithWrong = {
    id: "wake-6am", name: "Wake at 6:00 AM", type: "wake",
    state: "active", currentRound: 1,
    rounds: [{ n: 1, targetValue: "08:00", startDate: "2026-07-01", endDate: "2026-12-31" }],
    indicators: { right: [], wrong: ["Snoozing past target by 45+ min two days in a row"], stall: [] },
  };

  it("emits wrong-echo when 3+ off/soft days in last 7", () => {
    const logs = [
      // last 7 days ending 2026-08-15: 2026-08-09..2026-08-15
      { date: "2026-08-10", events: [{ verb: "wake", time: "08:30", goalId: "wake-6am" }] }, // soft
      { date: "2026-08-12", events: [{ verb: "wake", time: "09:15", goalId: "wake-6am" }] }, // off
      { date: "2026-08-14", events: [{ verb: "wake", time: "08:30", goalId: "wake-6am" }] }, // soft
    ];
    const insights = generateInsights({ goals: [goalWithWrong], logs, today: "2026-08-15" });
    const echo = insights.find((i) => i.id.startsWith("wrong-echo-"));
    expect(echo).toBeTruthy();
    expect(echo.kicker.toLowerCase()).toContain("pattern");
    expect(echo.text).toContain("Snoozing past target");
  });

  it("does not emit wrong-echo when goal has no wrong indicators", () => {
    const bare = { ...goalWithWrong, indicators: { right: [], wrong: [], stall: [] } };
    const logs = [
      { date: "2026-08-10", events: [{ verb: "wake", time: "08:30", goalId: "wake-6am" }] },
      { date: "2026-08-12", events: [{ verb: "wake", time: "09:15", goalId: "wake-6am" }] },
      { date: "2026-08-14", events: [{ verb: "wake", time: "08:30", goalId: "wake-6am" }] },
    ];
    const insights = generateInsights({ goals: [bare], logs, today: "2026-08-15" });
    expect(insights.some((i) => i.id.startsWith("wrong-echo-"))).toBe(false);
  });

  it("orders drift before wrong-echo before low-momentum", () => {
    // drift-eligible: 7 silent days
    // wrong-echo-eligible: also 7 silent days AND we add older off/soft — but silent 7 means no adherence data,
    // so wrong-echo needs off/soft counts in the last 7 which requires logs.
    // Construct: 3 soft/off events in last 7 (still <7 silent — drift NOT eligible).
    // Plus low momentum + 3 events in 30d → low-mom eligible.
    const logs = [
      { date: "2026-08-10", events: [{ verb: "wake", time: "09:15", goalId: "wake-6am" }] },
      { date: "2026-08-12", events: [{ verb: "wake", time: "09:20", goalId: "wake-6am" }] },
      { date: "2026-08-14", events: [{ verb: "wake", time: "09:25", goalId: "wake-6am" }] },
    ];
    const insights = generateInsights({ goals: [goalWithWrong], logs, today: "2026-08-15" });
    const kinds = insights.map((i) => i.id.split("-")[0]);
    // wrong-echo present; low-mom present (momentum=0 < 0.25, 3+ events in 30d)
    // Order: wrong-echo before low-mom
    const echoIdx = kinds.indexOf("wrong");
    const lowIdx = kinds.indexOf("low");
    expect(echoIdx).toBeGreaterThan(-1);
    expect(lowIdx).toBeGreaterThan(-1);
    expect(echoIdx).toBeLessThan(lowIdx);
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

Run: `npm test src/data/insights.test.js`
Expected: FAIL — wrong-echo insight not implemented.

- [ ] **Step 3: Implement wrong-echo in insights.js**

Read `/Users/munish/becoming/src/data/insights.js`. Import `dailyAdherence`:
```js
import { momentum, dailyAdherence } from "./adherence.js";
```

Add the helper:
```js
function wrongEchoQuestion(goal, today) {
  const wrong = goal.indicators.wrong[0];
  return {
    id: `wrong-echo-${goal.id}-${today}`,
    kicker: "A pattern I'm noticing",
    text: `${goal.name} has hit the '${wrong}' signal more than once this week. Is that something you're watching?`,
    yes: { label: "Yes, I see it", response: "Named. I'll keep watching too." },
    no: { label: "Not a real pattern", response: "Fair. I'll trust the noise." },
  };
}
```

In `generateInsights`, after the drift check + before the low-momentum check:
```js
// Wrong-echo: soft + off in last 7 days
if (goal.indicators.wrong.length > 0) {
  const per = dailyAdherence({ goal, logs, from: from7, to: today });
  let count = 0;
  for (const s of Object.values(per)) {
    if (s === "off" || s === "soft") count++;
  }
  if (count >= 3) wrongEchoes.push(wrongEchoQuestion(goal, today));
}
```

Track a new `const wrongEchoes = []` at the top of the function. Merge in order:
```js
out.push(...drifts, ...wrongEchoes, ...lowMoms);
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all previous tests pass + 3 new wrong-echo tests.

- [ ] **Step 5: Manual smoke**

Run: `npm run dev`. If your wake goal has soft/off wake times logged recently, a "A pattern I'm noticing" card appears on Home. Otherwise it doesn't — that's correct.

- [ ] **Step 6: Commit**

```bash
git add src/data/insights.js src/data/insights.test.js
git commit -m "feat: indicator-echo insights

Third insight flavor: when a goal's soft+off days cross 3 in
a week, the goal's own wrong-direction indicator becomes the
question text. Renders after drift and before low-momentum
in the insight priority order."
```

---

### Task 6: Manual verification + PR

**Files:** none.

- [ ] **Step 1: Full test run**

Run: `npm test`
Expected: all green. Ledger the total.

- [ ] **Step 2: End-to-end pass**

Run: `npm run dev`.
- Home renders — no color regressions after token migration.
- Log via sheet → insight refreshes without reload.
- Year with pen → tap empty day marks; tap again unmarks.
- `/goal/:id` orb size reflects real momentum.
- Log 3+ soft wake times → indicator-echo insight appears on next load.

- [ ] **Step 3: Push + PR**

```bash
git push -u origin balboa-breakdown-phase-5
gh pr create --title "phase 5: polish — tokens, tap-unmark, real momentum, indicator insights" --body "$(cat <<'EOF'
## Summary
Phase 5 retires the polish backlog and closes the last of the ledger's deferred items.

- **Token migration**: `PAPER.scrim`, `PAPER.shadow`, `PAPER.sheetShadow`, `PAPER.cardBorder` added. LogSheet, LogBlob, GoalCard, Year all migrated off raw hex. `NIGHT` alias now unused (kept one phase for safety with a delete note).
- **Log delete + Year tap-again**: new `DELETE /api/vault/logs/:date` middleware + `store.deleteLogEvent` client. Year tap toggles — write on empty, delete on hit/soft.
- **Goal workspace Orb**: real 30-day momentum instead of the Phase 4 placeholder 0.5.
- **Home post-save refresh**: LogSheet `onSaved` now re-runs `advanceGoal` and regenerates insights so intra-session drift resolutions and round crossings render immediately.
- **Indicator-echo insights**: `generateInsights` gains a third flavor — 3+ soft/off days in a week for a goal with `indicators.wrong` triggers a question in the user's own words.
- **Small cleanups**: Onboard `?turn=<bogus>` guarded; LogSheet placeholder rewritten to example copy; `wake.adherenceForDay` gains `date` for interface uniformity; unused imports removed.

## Test plan
- [x] `npm test` — all green
- [x] Visual: no color regression after token migration; NIGHT.cardBorder borders now render (previously colorless)
- [x] Year tap-again on any hit/soft removes the mark from vault
- [x] Goal orb reflects real momentum
- [x] Insight cards refresh after LogSheet save
- [x] Indicator-echo appears for a goal with 3+ soft/off days in a week

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review (done inline)

**Spec coverage:**
- Ledger deferred items across Phases 1–4 → Tasks 1 + 2 (all token + import + signature cleanups) ✓
- Log delete API (Phase 3 note) → Task 3 ✓
- Optimistic UI on tap-again (Phase 3 note) — NOT covered here; still deferred. Not merge-blocking.
- Goal orb real momentum (Phase 4 minor) → Task 4 ✓
- Home post-save refresh (Phase 4 minor) → Task 4 ✓
- Onboard bogus turn guard (Phase 4 minor) → Task 2 ✓
- Indicator-driven insights (Phase 4 deferred) → Task 5 ✓

**Placeholder scan:** none.

**Type consistency:** `deleteLogEvent(date, event)` uses the same event shape as `appendLog`. `serializeEvent` is the single line-format authority for both. `wrong-echo-<goalId>-<today>` id prefix unique — Home's `activeInsight = insights.find(...)` handles it identically. `wake.adherenceForDay` signature change is backward compatible (existing call sites already pass `date`).

**Global-constraint traceability:** No hex outside tokens after Task 1. No red. Log delete is idempotent. Insight rejection stays visually free (identical pill styling — untouched).
