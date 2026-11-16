# Balboa Breakdown — Soul Algorithm, Phase 1 (Codify + LLM API) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deterministic + LLM-reasoning core (`breakdownGoal()`) that will replace the regex extractors in `src/onboard/prompting.js`, per the soul-algorithm spec. This plan covers rollout steps 1–2 of the codify plan (safe-rate-ceiling extraction + the LLM API module). Wiring it into `turns.js`/`prompting.js`/`Onboard.jsx` is out of scope — that's rollout step 3+, a separate future plan.

**Architecture:** Three new small modules (`horizon.js`, `breakdownCalls.js`, `breakdown.js`) under `src/onboard/`, plus a `safeRateCeiling()` export added to each existing `src/data/goalTypes/*.js`. Deterministic logic (quarter math, safe-rate ceiling, round boundaries) never touches the LLM; the LLM is called exactly twice per breakdown — once to parse/classify, once to narrate rounds + draft indicators.

**Tech Stack:** Vanilla JS (ESM), Vitest for tests. No new dependencies.

**Spec:**
- `docs/superpowers/specs/2026-09-11-balboa-breakdown-soul-algorithm.md` (principles, inputs/outputs)
- `docs/superpowers/specs/2026-09-17-balboa-breakdown-codify-plan.md` (file-by-file plan, this covers its §1 goalTypes changes + rollout steps 1–2)
- `docs/superpowers/specs/2026-09-17-balboa-breakdown-llm-api-design.md` (the `breakdownGoal()` contract this plan implements exactly)

## Global Constraints

- Round math is deterministic — the LLM is never asked to compute dates or step sizes, only to explain (`why`) and classify. (LLM API doc §2)
- LLM system prompts: "Never scold. Never use emoji. Spare, warm voice." (LLM API doc §3, brand.md)
- Ambition text is preserved verbatim wherever it's echoed back — never paraphrased into corporate-speak. (soul-algorithm doc §3)
- 3-month default, 6-month max, capped — no goal produced by this module may exceed a 180-day horizon. (soul-algorithm doc §2.3)
- Existing test suite (154+ tests) must stay green: `bun run test`. New code follows the same Vitest conventions as `src/data/goalTypes/index.test.js` and `src/lib/llm.test.js` (plain describe/it/expect, no test-only frameworks beyond what's already installed).
- Conventional commit subjects, lowercase, imperative, no trailing period (repo `CLAUDE.md`).

---

## Setup

- [ ] **Branch:** from `main`, run `git checkout -b feat/balboa-breakdown-soul-algorithm`.

---

### Task 1: `safeRateCeiling()` on each goal type

**Files:**
- Modify: `src/data/goalTypes/wake.js`
- Modify: `src/data/goalTypes/cadence.js`
- Modify: `src/data/goalTypes/simple.js`
- Modify: `src/data/goalTypes/index.test.js`

**Interfaces:**
- Produces: `safeRateCeiling(baseline, target) => { minDays: number } | null` — exported from each of `wake.js`, `cadence.js`, `simple.js` (dispatched via `getType(type)` from `src/data/goalTypes/index.js`, already exists). `simple.safeRateCeiling()` always returns `null` (no mechanical ceiling).

- [ ] **Step 1: Write the failing tests**

Append to `src/data/goalTypes/index.test.js` (after the existing `cadence.adherenceForDay` describe block):

```js
describe("wake.safeRateCeiling", () => {
  const wake = getType("wake");
  it("computes minimum safe days at 30min/week for a given delta", () => {
    // 08:30 -> 07:30 is a 60min delta; 60/30 * 7 = 14 days
    expect(wake.safeRateCeiling("08:30", "07:30")).toEqual({ minDays: 14 });
  });

  it("handles a large delta needing far more than a quarter", () => {
    // 23:00 -> 14:00 is a 540min delta; 540/30 * 7 = 126 days
    expect(wake.safeRateCeiling("23:00", "14:00")).toEqual({ minDays: 126 });
  });
});

describe("cadence.safeRateCeiling", () => {
  const cad = getType("cadence");
  it("computes minimum safe days as steps * MIN_DAYS_PER_ROUND", () => {
    // 1 -> 7 is 6 steps; 6 * 14 = 84 days
    expect(cad.safeRateCeiling({ intervalDays: 1 }, { intervalDays: 7 })).toEqual({ minDays: 84 });
  });

  it("returns zero minDays when target equals baseline", () => {
    expect(cad.safeRateCeiling({ intervalDays: 3 }, { intervalDays: 3 })).toEqual({ minDays: 0 });
  });
});

describe("simple.safeRateCeiling", () => {
  const simple = getType("simple");
  it("returns null — no mechanical ceiling for simple goals", () => {
    expect(simple.safeRateCeiling()).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run src/data/goalTypes/index.test.js`
Expected: FAIL — `wake.safeRateCeiling is not a function` (and same for `cadence`, `simple`).

- [ ] **Step 3: Implement `wake.js#safeRateCeiling`**

In `src/data/goalTypes/wake.js`, add after the `STEP_MIN` constant:

```js
const SAFE_MIN_PER_WEEK = 30; // conservative ceiling: circadian shift shouldn't exceed this per week

export function safeRateCeiling(baseline, target) {
  const delta = Math.abs(toMin(baseline) - toMin(target));
  const minDays = Math.ceil((delta / SAFE_MIN_PER_WEEK) * 7);
  return { minDays };
}
```

- [ ] **Step 4: Implement `cadence.js#safeRateCeiling`**

In `src/data/goalTypes/cadence.js`, add after the `MIN_DAYS_PER_ROUND` constant:

```js
export function safeRateCeiling(baseline, target) {
  const steps = Math.max(0, target.intervalDays - baseline.intervalDays);
  return { minDays: steps * MIN_DAYS_PER_ROUND };
}
```

- [ ] **Step 5: Implement `simple.js#safeRateCeiling`**

In `src/data/goalTypes/simple.js`, add at the end:

```js
export function safeRateCeiling() {
  // No mechanical ceiling for simple goals. A simple goal only extends past
  // 3 months via identity-level judgment (soul-algorithm doc §2.3 bucket 2),
  // never a computed rate — so there's nothing to return here.
  return null;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bunx vitest run src/data/goalTypes/index.test.js`
Expected: PASS, all tests including the five new ones.

- [ ] **Step 7: Commit**

```bash
git add src/data/goalTypes/wake.js src/data/goalTypes/cadence.js src/data/goalTypes/simple.js src/data/goalTypes/index.test.js
git commit -m "feat: add safeRateCeiling to goal type modules"
```

---

### Task 2: `horizon.js` — deterministic 3-vs-6-month decision

**Files:**
- Create: `src/onboard/horizon.js`
- Test: `src/onboard/horizon.test.js`

**Interfaces:**
- Consumes: `getType(type)` from `src/data/goalTypes/index.js`, and `.safeRateCeiling(baseline, target)` from Task 1.
- Produces: `addDays(iso: string, n: number) => string` and `decideHorizon(type: string, baseline, target, today: string) => { endDate: string, horizonReason: string | null }`. Task 5 consumes `decideHorizon`.

- [ ] **Step 1: Write the failing tests**

Create `src/onboard/horizon.test.js`:

```js
import { describe, it, expect } from "vitest";
import { addDays, decideHorizon } from "./horizon.js";

describe("addDays", () => {
  it("adds the given number of days", () => {
    const result = addDays("2026-09-17", 90);
    const days = (Date.parse(result) - Date.parse("2026-09-17")) / 86400000;
    expect(days).toBe(90);
  });
});

describe("decideHorizon", () => {
  it("defaults to a 90-day quarter when safe pace fits", () => {
    const result = decideHorizon("wake", "08:30", "07:30", "2026-09-17");
    expect(result.horizonReason).toBeNull();
    const days = (Date.parse(result.endDate) - Date.parse("2026-09-17")) / 86400000;
    expect(days).toBe(90);
  });

  it("extends past 90 days with a reason when the safe pace needs longer", () => {
    const result = decideHorizon("wake", "23:00", "14:00", "2026-09-17");
    expect(result.horizonReason).toMatch(/126 days/);
    const days = (Date.parse(result.endDate) - Date.parse("2026-09-17")) / 86400000;
    expect(days).toBe(126);
  });

  it("caps extension at 180 days even if the safe pace needs more", () => {
    // wake 23:00 -> 05:00 is a 1080min delta (23:00=1380, 05:00=300 => 1080)
    // 1080/30*7 = 252 days needed, capped to 180
    const result = decideHorizon("wake", "23:00", "05:00", "2026-09-17");
    const days = (Date.parse(result.endDate) - Date.parse("2026-09-17")) / 86400000;
    expect(days).toBe(180);
    expect(result.horizonReason).toMatch(/252 days/);
  });

  it("never extends for simple goals — no ceiling to trigger it", () => {
    const result = decideHorizon("simple", null, null, "2026-09-17");
    expect(result.horizonReason).toBeNull();
    const days = (Date.parse(result.endDate) - Date.parse("2026-09-17")) / 86400000;
    expect(days).toBe(90);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run src/onboard/horizon.test.js`
Expected: FAIL — `Cannot find module './horizon.js'`.

- [ ] **Step 3: Implement `horizon.js`**

Create `src/onboard/horizon.js`:

```js
import { getType } from "../data/goalTypes/index.js";

const QUARTER_DAYS = 90;
const HALF_YEAR_DAYS = 180;

export function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function decideHorizon(type, baseline, target, today) {
  const ceiling = getType(type).safeRateCeiling(baseline, target);
  if (ceiling && ceiling.minDays > QUARTER_DAYS) {
    const cappedDays = Math.min(ceiling.minDays, HALF_YEAR_DAYS);
    return {
      endDate: addDays(today, cappedDays),
      horizonReason: `Safe pace needs ${ceiling.minDays} days — closing this in one quarter would exceed a sane rate of change.`,
    };
  }
  return { endDate: addDays(today, QUARTER_DAYS), horizonReason: null };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run src/onboard/horizon.test.js`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/onboard/horizon.js src/onboard/horizon.test.js
git commit -m "feat: add deterministic 3-vs-6-month horizon decision"
```

---

### Task 3: `breakdownCalls.js` — LLM call 1 (parse + classify)

**Files:**
- Create: `src/onboard/breakdownCalls.js`
- Test: `src/onboard/breakdownCalls.test.js`

**Interfaces:**
- Consumes: an injected `llmChat(messages) => Promise<string>` (same shape as `src/lib/llm.js#chat`, minus options — caller decides model/temperature before injecting).
- Produces: `callParseClassify({ ambition, baseline, target, existingGoals, llmChat }) => Promise<{ name, cat, type, baseline, target }>`. Throws if the LLM never returns valid JSON after one retry. Task 5 consumes this.

- [ ] **Step 1: Write the failing tests**

Create `src/onboard/breakdownCalls.test.js`:

```js
import { describe, it, expect } from "vitest";
import { callParseClassify } from "./breakdownCalls.js";

describe("callParseClassify", () => {
  it("returns the parsed JSON on a clean response", async () => {
    const llmChat = async () => JSON.stringify({
      name: "Wake earlier", cat: "health", type: "wake", baseline: "08:30", target: "07:30",
    });
    const result = await callParseClassify({
      ambition: "wake up earlier", baseline: "08:30", target: "07:30",
      existingGoals: [], llmChat,
    });
    expect(result).toEqual({
      name: "Wake earlier", cat: "health", type: "wake", baseline: "08:30", target: "07:30",
    });
  });

  it("retries once with a stricter prompt when the first response isn't valid JSON", async () => {
    let calls = 0;
    const llmChat = async () => {
      calls += 1;
      if (calls === 1) return "sure, here's the goal: not json";
      return JSON.stringify({ name: "Wake earlier", cat: "health", type: "wake", baseline: "08:30", target: "07:30" });
    };
    const result = await callParseClassify({
      ambition: "wake up earlier", baseline: "08:30", target: "07:30",
      existingGoals: [], llmChat,
    });
    expect(calls).toBe(2);
    expect(result.type).toBe("wake");
  });

  it("throws when both attempts return invalid JSON", async () => {
    const llmChat = async () => "still not json";
    await expect(callParseClassify({
      ambition: "wake up earlier", baseline: "08:30", target: "07:30",
      existingGoals: [], llmChat,
    })).rejects.toThrow(/valid JSON/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run src/onboard/breakdownCalls.test.js`
Expected: FAIL — `Cannot find module './breakdownCalls.js'`.

- [ ] **Step 3: Implement `breakdownCalls.js` (call 1 only)**

Create `src/onboard/breakdownCalls.js`:

```js
const CATS = ["health", "reading", "career", "relationships", "finance", "creativity"];
const TYPE_KEYS = ["wake", "cadence", "simple"];

function parseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const PARSE_SYSTEM = "You are the reasoning core of Balboa Breakdown, a goal-onboarding ritual inside a personal-goals app called Becoming. Given a person's own words about a goal, extract structure without flattening their voice. Never rewrite their ambition — preserve it verbatim in your response's `ambition` field.";

function parseUserPrompt({ ambition, baseline, target, existingGoals }) {
  return [
    `Ambition: "${ambition}"`,
    `Baseline: "${baseline}"`,
    `Target: "${target}"`,
    `Existing goals: ${JSON.stringify(existingGoals || [])}`,
    "",
    `Return JSON: { "name": string, "cat": string, "type": string, "baseline": <typed>, "target": <typed> }`,
    `cat must be one of: ${CATS.join(", ")}.`,
    `type must be one of: ${TYPE_KEYS.join(", ")} — wake if this is about a daily clock-time habit, cadence if it's about widening/narrowing how often something happens, simple otherwise.`,
  ].join("\n");
}

export async function callParseClassify({ ambition, baseline, target, existingGoals, llmChat }) {
  const messages = [
    { role: "system", content: PARSE_SYSTEM },
    { role: "user", content: parseUserPrompt({ ambition, baseline, target, existingGoals }) },
  ];
  const raw = await llmChat(messages);
  const parsed = parseJSON(raw);
  if (parsed) return parsed;

  const retry = await llmChat([
    ...messages,
    { role: "user", content: "Return valid JSON only — no prose, no markdown fences." },
  ]);
  const retried = parseJSON(retry);
  if (retried) return retried;

  throw new Error("callParseClassify: LLM did not return valid JSON after retry");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run src/onboard/breakdownCalls.test.js`
Expected: PASS, all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/onboard/breakdownCalls.js src/onboard/breakdownCalls.test.js
git commit -m "feat: add callParseClassify LLM call with retry-on-malformed-json"
```

---

### Task 4: `breakdownCalls.js` — LLM call 2 (round narrative + indicators)

**Files:**
- Modify: `src/onboard/breakdownCalls.js`
- Modify: `src/onboard/breakdownCalls.test.js`

**Interfaces:**
- Produces: `callRoundNarrative({ ambition, rounds, horizonReason, llmChat }) => Promise<{ rounds: [{ n, why }], indicators: { right, wrong, stall } } | null>` — returns `null` on malformed JSON, no retry (per LLM API doc §4: never block goal creation on the narrative call). Also produces `templateIndicators(type) => { right: string[], wrong: string[], stall: string[] }`. Task 5 consumes both.

- [ ] **Step 1: Write the failing tests**

Append to `src/onboard/breakdownCalls.test.js`:

```js
import { callRoundNarrative, templateIndicators } from "./breakdownCalls.js";

describe("callRoundNarrative", () => {
  const rounds = [{ n: 1, targetValue: "07:30", startDate: "2026-09-17", endDate: "2026-12-16" }];

  it("returns parsed rounds + indicators on a clean response", async () => {
    const llmChat = async () => JSON.stringify({
      rounds: [{ n: 1, why: "Shift the whole 30 minutes in one clean move." }],
      indicators: { right: ["x"], wrong: ["y"], stall: ["z"] },
    });
    const result = await callRoundNarrative({ ambition: "wake up earlier", rounds, horizonReason: null, llmChat });
    expect(result.rounds[0].why).toBe("Shift the whole 30 minutes in one clean move.");
    expect(result.indicators).toEqual({ right: ["x"], wrong: ["y"], stall: ["z"] });
  });

  it("returns null on malformed JSON — no retry", async () => {
    let calls = 0;
    const llmChat = async () => { calls += 1; return "not json"; };
    const result = await callRoundNarrative({ ambition: "wake up earlier", rounds, horizonReason: null, llmChat });
    expect(result).toBeNull();
    expect(calls).toBe(1);
  });
});

describe("templateIndicators", () => {
  it("returns the wake template", () => {
    expect(templateIndicators("wake").stall).toContain("7+ days no wake logged");
  });
  it("returns the cadence template", () => {
    expect(templateIndicators("cadence").stall).toContain("No logs at all for 14+ days");
  });
  it("returns a simple fallback for any other type", () => {
    expect(templateIndicators("simple").stall).toEqual(["7+ days with no log"]);
  });
});
```

Note: move the `import { callParseClassify } from "./breakdownCalls.js";` line at the top of the file to a single combined import: `import { callParseClassify, callRoundNarrative, templateIndicators } from "./breakdownCalls.js";` — don't leave two separate import lines for the same module.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run src/onboard/breakdownCalls.test.js`
Expected: FAIL — `callRoundNarrative is not a function` (and `templateIndicators`).

- [ ] **Step 3: Implement call 2 + template fallback**

Append to `src/onboard/breakdownCalls.js`:

```js
const NARRATIVE_SYSTEM = "You are the reasoning core of Balboa Breakdown. You're given the deterministic round schedule already computed — your job is to explain what each round is actually building (not restate the math) and draft indicators of the person going right, wrong, or stalling. Never scold. Never use emoji. Spare, warm voice.";

function narrativeUserPrompt({ ambition, rounds, horizonReason }) {
  return [
    `Ambition: "${ambition}"`,
    `Rounds (boundaries already fixed): ${JSON.stringify(rounds)}`,
    `Horizon reason: ${horizonReason || "none — 3mo default"}`,
    "",
    `Return JSON: { "rounds": [{ "n": number, "why": string }], "indicators": { "right": string[], "wrong": string[], "stall": string[] } }`,
  ].join("\n");
}

export async function callRoundNarrative({ ambition, rounds, horizonReason, llmChat }) {
  const raw = await llmChat([
    { role: "system", content: NARRATIVE_SYSTEM },
    { role: "user", content: narrativeUserPrompt({ ambition, rounds, horizonReason }) },
  ]);
  return parseJSON(raw);
}

export function templateIndicators(type) {
  if (type === "wake") {
    return {
      right: ["Wake within 15 min of round target 5+ days a week", "Bedtime moves earlier without effort"],
      wrong: ["Snoozing past round target by 45+ min two days in a row"],
      stall: ["7+ days no wake logged", "Same wake time held across 3 rounds"],
    };
  }
  if (type === "cadence") {
    return {
      right: ["Green days matched", "Non-green days clean"],
      wrong: ["Multiple sessions on non-green days across a week"],
      stall: ["No logs at all for 14+ days"],
    };
  }
  return {
    right: ["Logged consistently across the week"],
    wrong: [],
    stall: ["7+ days with no log"],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run src/onboard/breakdownCalls.test.js`
Expected: PASS, all 8 tests (3 from Task 3 + 5 new).

- [ ] **Step 5: Commit**

```bash
git add src/onboard/breakdownCalls.js src/onboard/breakdownCalls.test.js
git commit -m "feat: add callRoundNarrative LLM call and templateIndicators fallback"
```

---

### Task 5: `breakdown.js` — compose `breakdownGoal()`

**Files:**
- Create: `src/onboard/breakdown.js`
- Test: `src/onboard/breakdown.test.js`

**Interfaces:**
- Consumes: `decideHorizon` (Task 2), `callParseClassify` + `callRoundNarrative` + `templateIndicators` (Tasks 3–4), `getType` (existing, `src/data/goalTypes/index.js`).
- Produces: `breakdownGoal({ ambition, baseline, target, today, existingGoals }, { llmChat }) => Promise<Breakdown>` matching the shape in `docs/superpowers/specs/2026-09-17-balboa-breakdown-llm-api-design.md` §1. This is the function future work (rollout step 3) wires into `src/onboard/prompting.js`.

- [ ] **Step 1: Write the failing tests**

Create `src/onboard/breakdown.test.js`:

```js
import { describe, it, expect } from "vitest";
import { breakdownGoal } from "./breakdown.js";

function makeLlmChat(responses) {
  let i = 0;
  return async () => {
    const r = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return r;
  };
}

describe("breakdownGoal", () => {
  it("assembles a full breakdown on the happy path", async () => {
    const llmChat = makeLlmChat([
      JSON.stringify({ name: "Wake earlier", cat: "health", type: "wake", baseline: "08:30", target: "07:30" }),
      JSON.stringify({
        rounds: [{ n: 1, why: "Shift the whole 30 minutes in one clean move." }],
        indicators: { right: ["r"], wrong: ["w"], stall: ["s"] },
      }),
    ]);
    const result = await breakdownGoal(
      { ambition: "wake up earlier", baseline: "08:30", target: "07:30", today: "2026-09-17", existingGoals: [] },
      { llmChat }
    );
    expect(result.name).toBe("Wake earlier");
    expect(result.horizonReason).toBeNull();
    expect(result.rounds).toHaveLength(1);
    expect(result.rounds[0].why).toBe("Shift the whole 30 minutes in one clean move.");
    expect(result.indicators).toEqual({ right: ["r"], wrong: ["w"], stall: ["s"] });
  });

  it("sets horizonReason and a longer endDate when the safe pace needs it", async () => {
    const llmChat = makeLlmChat([
      JSON.stringify({ name: "Wake much earlier", cat: "health", type: "wake", baseline: "23:00", target: "14:00" }),
      JSON.stringify({ rounds: [], indicators: { right: [], wrong: [], stall: [] } }),
    ]);
    const result = await breakdownGoal(
      { ambition: "wake much earlier", baseline: "23:00", target: "14:00", today: "2026-09-17", existingGoals: [] },
      { llmChat }
    );
    expect(result.horizonReason).toMatch(/126 days/);
    const days = (Date.parse(result.endDate) - Date.parse("2026-09-17")) / 86400000;
    expect(days).toBe(126);
  });

  it("throws when classification never returns valid JSON", async () => {
    const llmChat = async () => "not json";
    await expect(breakdownGoal(
      { ambition: "wake up earlier", baseline: "08:30", target: "07:30", today: "2026-09-17", existingGoals: [] },
      { llmChat }
    )).rejects.toThrow(/valid JSON/);
  });

  it("falls back to why:null and template indicators when the narrative call fails", async () => {
    const llmChat = makeLlmChat([
      JSON.stringify({ name: "Wake earlier", cat: "health", type: "wake", baseline: "08:30", target: "07:30" }),
      "not json",
    ]);
    const result = await breakdownGoal(
      { ambition: "wake up earlier", baseline: "08:30", target: "07:30", today: "2026-09-17", existingGoals: [] },
      { llmChat }
    );
    expect(result.rounds[0].why).toBeNull();
    expect(result.indicators.stall).toContain("7+ days no wake logged");
  });

  it("throws immediately when no llmChat is provided", async () => {
    await expect(breakdownGoal(
      { ambition: "x", baseline: "08:30", target: "07:30", today: "2026-09-17", existingGoals: [] },
      {}
    )).rejects.toThrow(/requires an llmChat/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run src/onboard/breakdown.test.js`
Expected: FAIL — `Cannot find module './breakdown.js'`.

- [ ] **Step 3: Implement `breakdown.js`**

Create `src/onboard/breakdown.js`:

```js
import { getType } from "../data/goalTypes/index.js";
import { decideHorizon } from "./horizon.js";
import { callParseClassify, callRoundNarrative, templateIndicators } from "./breakdownCalls.js";

export async function breakdownGoal({ ambition, baseline, target, today, existingGoals }, { llmChat }) {
  if (typeof llmChat !== "function") {
    throw new Error("breakdownGoal requires an llmChat function");
  }

  const classified = await callParseClassify({ ambition, baseline, target, existingGoals, llmChat });
  const horizon = decideHorizon(classified.type, classified.baseline, classified.target, today);
  const type = getType(classified.type);
  const boundaries = type.buildRounds(classified.baseline, classified.target, today, horizon.endDate);

  const narrative = await callRoundNarrative({
    ambition, rounds: boundaries, horizonReason: horizon.horizonReason, llmChat,
  });

  const whyByRound = new Map((narrative?.rounds || []).map((r) => [r.n, r.why]));
  const rounds = boundaries.map((r) => ({ ...r, why: whyByRound.get(r.n) ?? null }));
  const indicators = narrative?.indicators ?? templateIndicators(classified.type);

  return {
    name: classified.name,
    cat: classified.cat,
    type: classified.type,
    baseline: classified.baseline,
    target: classified.target,
    endDate: horizon.endDate,
    horizonReason: horizon.horizonReason,
    rounds,
    indicators,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run src/onboard/breakdown.test.js`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Run the full suite**

Run: `bun run test`
Expected: PASS, all existing tests plus the new ones (154+ existing + ~21 new).

- [ ] **Step 6: Commit**

```bash
git add src/onboard/breakdown.js src/onboard/breakdown.test.js
git commit -m "feat: compose breakdownGoal from classify, horizon, and narrative"
```

---

## After this plan

- Push branch, open PR (per repo `CLAUDE.md` git workflow — title `feat: balboa breakdown soul algorithm (classify + horizon + narrative)`, summary + test plan checklist, CI must go green before merge).
- Not in this plan, deliberately: wiring `breakdownGoal()` into `src/onboard/prompting.js`/`turns.js` (codify-plan rollout step 3), `Onboard.jsx` UI changes for `why`/`horizonReason` (step 4), vault schema fields (step 5). Each is its own future plan per the codify doc's one-PR-per-step rollout.
- Open question carried forward: whether a real LLM provider's JSON mode is reliable enough, or `parseJSON`'s bare `try/catch` needs to get more defensive — flagged in the LLM API doc §5, worth a spike before wiring this into the live `/onboard` flow.
