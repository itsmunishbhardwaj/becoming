# Balboa Breakdown — LLM API Design

**Status:** draft — child doc of `2026-09-11-balboa-breakdown-soul-algorithm.md`
**Date:** 2026-09-17
**Scope:** the contract for `breakdownGoal()` — the single reasoning call that replaces the regex extractors in `src/onboard/prompting.js`.

Reuses the existing transport (`src/lib/llm.js` → `/api/llm` Vite middleware → OpenAI-compatible `/chat/completions`, per `2026-08-10-balboa-breakdown-design.md` §6). This doc does not change the transport — it defines what goes over it.

---

## 1. Function contract

```js
// src/onboard/breakdown.js (new)
async function breakdownGoal({ ambition, baseline, target, today, existingGoals, constraints }, { llmChat }) {
  // returns Breakdown | throws (caller falls back to scripted path)
}
```

Single call, not one per turn — matches parent principle 2.2 (reason about the whole shape, not field-by-field).

### Input (matches parent §3, minus fields not yet collected)

```ts
{
  ambition: string,          // required, verbatim
  baseline: string,          // required — free text, LLM parses shape
  target: string,            // required — free text
  today: string,             // ISO date
  existingGoals: Array<{ name, cat, state }>,  // for category balance, dedup awareness
  constraints?: string,      // optional, volunteered
  pastAttempts?: string,     // optional
}
```

### Output (matches parent §4 exactly)

```ts
{
  name: string,
  cat: "health" | "reading" | "career" | "relationships" | "finance" | "creativity",
  type: "wake" | "cadence" | "simple",       // dispatch key, matches goalTypes/index.js shape
  baseline: string | { intervalDays: number } | <type-specific>,
  target: string | { intervalDays: number } | <type-specific>,
  endDate: string,            // ISO, computed per parent §2.3
  horizonReason: string | null,
  rounds: Array<{
    n: number, from: string, to: string,
    startDate: string, endDate: string, targetValue: unknown,
    why: string,               // required, one line
  }>,
  indicators: { right: string[], wrong: string[], stall: string[] },
}
```

This is the same shape `turns.js#finalize()` produces today, plus `horizonReason` and `rounds[].why`. No new concepts beyond what parent doc already specified — this doc is just making it a real function signature.

---

## 2. Division of labor: LLM vs deterministic

Per parent §5 working assumption:

| Concern | Owner |
|---|---|
| Parse `baseline`/`target` free text into typed shape | LLM (replaces `extractHHMM`/`extractInterval`) |
| Classify `type` (wake/cadence/simple) | LLM (replaces `extractType` keyword match) |
| Classify `cat` | LLM (replaces `classifyCat` keyword match) |
| Safe-rate ceiling per type | **Deterministic** — `goalTypes/<type>.js#safeRateCeiling()` (codify-plan §1) |
| 3-vs-6-month decision | **Deterministic**, using the LLM's parsed baseline/target fed through `safeRateCeiling` — not the LLM's own judgment call, so it can't be talked into 6 months by a persuasive ambition |
| Round count + `endDate` per round (the math) | **Deterministic** — existing `buildRounds` logic, called with the (possibly extended) endDate |
| Round `why` (the reasoning) | LLM — given the deterministic round boundaries, explain what each one is building |
| Indicators | LLM |

Rationale: keep anything safety/consistency-critical (the horizon test, the round math) out of LLM hands — it can rationalize a wrong answer. Keep anything requiring real understanding of the person's words (parsing, categorization, narrative `why`) in the LLM, because regex demonstrably can't do it (that's the whole problem this replaces).

### Implementation shape

```
breakdownGoal(input, { llmChat }):
  1. call LLM once: parse ambition/baseline/target → { name, cat, type, baseline, target }
  2. deterministic: safeRateCeiling(type, baseline, target) → decide 3mo vs 6mo, set endDate + horizonReason
  3. deterministic: buildRounds(type, baseline, target, today, endDate) → round boundaries (no `why` yet)
  4. call LLM once: given ambition + round boundaries → fill `why` per round + indicators
  5. return assembled Breakdown
```

Two LLM calls, not eight. Both can be one round-trip each with structured output (see §3).

---

## 3. Prompting

### Call 1 — parse + classify

```
System: You are the reasoning core of Balboa Breakdown, a goal-onboarding ritual inside
a personal-goals app called Becoming. Given a person's own words about a goal, extract
structure without flattening their voice. Never rewrite their ambition — preserve it verbatim
in your response's `ambition` field.

User: Ambition: "<ambition>"
Baseline: "<baseline>"
Target: "<target>"
Existing goals: <existingGoals as compact list>

Return JSON: { name, cat, type, baseline: <typed>, target: <typed> }
cat must be one of: health, reading, career, relationships, finance, creativity.
type must be one of: wake, cadence, simple — wake if this is about a daily clock-time habit,
cadence if it's about widening/narrowing how often something happens, simple otherwise.
```

### Call 2 — round narrative + indicators

```
System: Same persona. You're given the deterministic round schedule already computed —
your job is to explain what each round is actually building (not restate the math) and
draft indicators of the person going right, wrong, or stalling.

User: Ambition: "<ambition>"
Rounds (boundaries already fixed): <rounds without `why`>
Horizon reason (if 6mo): "<horizonReason or 'none — 3mo default'>"

Return JSON: { rounds: [{ n, why }], indicators: { right[], wrong[], stall[] } }
Never scold. Never use emoji. Spare, warm voice — per docs/brand.md.
```

Both calls request JSON directly (no "rewrite this canned line" pattern like today's `runTurn`). `src/lib/llm.js#chat()` already returns raw string content — this doc's caller does `JSON.parse` with a schema check, not regex extraction on prose.

---

## 4. Failure modes

| Failure | Handling |
|---|---|
| No `LLM_API_KEY` configured (`isConfigured()` false) | Skip both LLM calls entirely. Fall back to `scriptedTurn` per-field flow (codify-plan §1, `prompting.js` keeps this path). `why`/`horizonReason`/LLM-drafted indicators become `null` / template defaults. Feature-flagged, not fatal — matches original design doc §6.3. |
| Call 1 succeeds, JSON malformed | One retry with "return valid JSON only" appended. Second failure → fall back to scripted extractors for that field only (regex isn't deleted from existence, just demoted to fallback — codify-plan §1 keeps `scriptedTurn` shape). |
| Call 2 fails | Rounds still exist (deterministic, from step 3) — just ship them with `why: null` and template indicators (today's `defaultIndicators`, kept as final fallback). Never block goal creation on the narrative call. |
| `safeRateCeiling` says target is unreachable even at 6 months | Not this doc's problem to solve silently — surface to the user in the confirm turn ("this pace may not be realistic by <date> — soften target or extend further?"). Needs a UI affordance; flagging for codify-plan / Onboard.jsx, not silently clamping. |

---

## 5. Open questions

- Structured output: does the configured provider (Groq/Llama per roadmap, or whatever's in `LLM_MODEL`) support JSON mode reliably, or do we need a more defensive parser than `JSON.parse`? Worth a spike before committing to this shape.
- Should call 1 and call 2 collapse into one call once round math is fast enough to compute *before* calling the LLM at all (i.e. do steps 2-3 first, always, then one LLM call for parse + why + indicators together)? Would cut to one round-trip. Deferred — get two-call version working first.
