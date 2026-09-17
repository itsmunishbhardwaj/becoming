# Balboa Breakdown — Codify Plan

**Status:** draft — child doc of `2026-09-11-balboa-breakdown-soul-algorithm.md`
**Date:** 2026-09-17
**Scope:** turn the soul algorithm into a build plan against the current codebase.

Parent doc defines problem/principles/inputs/outputs. This doc says what code changes to make it real. Sibling doc `2026-09-17-balboa-breakdown-llm-api-design.md` defines the LLM contract this plan calls into.

---

## 1. What changes, file by file

### `src/onboard/turns.js`
- Keep: `TURNS` order (as UI scaffolding), `validate()`, `applyInput()`, `nextTurn()` state machine shape.
- Remove: `classifyCat()` regex keyword matcher — category becomes an LLM output (parent §4).
- Change: `finalize()` gains `horizonReason` (nullable) and each round gains `why`. `endDate` is no longer a raw user turn — see §2.

### `src/onboard/prompting.js`
- Remove: `extractType`, `extractHHMM`, `extractInterval`, `extractDate`, `defaultIndicators`, `CANNED` — all regex/template logic this doc replaces.
- Remove: the current `runTurn()` "reword the canned line" LLM call — it's decorative, not reasoning.
- Add: a single reasoning call per breakdown (not per turn) — see sibling LLM API doc for the contract. `prompting.js` becomes a thin caller: build request from conversation state → call `breakdownGoal()` → map response onto `turns.js` state.
- Keep: `scriptedTurn`'s *shape* as the no-LLM fallback path (§6.3 of the original design doc — "no key set → scripted wizard"). Fallback must still exist; it just won't produce `why`/`horizonReason` — mark those `null` and say so in the UI.

### `src/data/goalTypes/*.js`
- `wake.js` / `cadence.js`: expose the "safe max rate of change" heuristic as an exported function (`safeRateCeiling(baseline, target)` or similar) — parent §2.3 needs this to decide 3-vs-6-month deterministically. Currently this logic is implicit in `buildRounds`; pull it out so the LLM-facing layer can call it directly without regenerating rounds twice.
- `simple.js`: needs an equivalent ceiling concept or an explicit "no ceiling — always 3mo unless identity-level (§2.3 bucket 2)" default.

### `src/screens/Onboard.jsx`
- Turn count may shrink (parent principle: this doc doesn't fix turn count, but fewer turns falls out naturally once ambition+baseline+target are extracted in one reasoning pass instead of one turn each — see roadmap "Balboa breakdown refinement").
- Round preview UI needs to render `why` per round (currently just shows target/window).
- Add: if `horizonReason` present, show it — this is the "must justify the exception" principle made visible, not just internal.

### Vault schema (`vault/goals/<id>.md`)
- Front-matter: add optional `horizonReason` field.
- `## Rounds` table gains a `Why` column (parent §4 `rounds[].why`).
- Backward compat: existing goal files without these fields parse fine (fields are additive, optional).

---

## 2. Turn flow change

Today: 8 sequential turns, each independently regex-parsed (`ambition → type → baseline → target → endDate → roundsPreview → indicators → confirm`).

Proposed: collapse the *reasoning* into one call after the minimum viable input is collected (ambition + baseline + target — enough for the LLM to do real work), rather than one call per field. `endDate` stops being a user-entered turn — it's computed (§2.3 of parent) and shown for confirm/override, not asked as an open question. User can still override in the confirm step (skip button / edit inline, per parent design doc §5.2).

This directly serves the roadmap complaint ("feels like an interview") without touching visual design — fewer required turns is a data-flow change, not a UI reskin.

---

## 3. Testing

- `src/onboard/turns.test.js`, `prompting.test.js` — rewrite around the new `breakdownGoal()` contract; regex-specific tests (`extractType` etc.) get deleted, not adapted.
- New: fixture-based tests feeding real ambitions ("wake up earlier", "stop doomscrolling before bed", "read more") through the fallback (no-LLM) path — must still produce a valid, quarter-bound goal.
- New: `safeRateCeiling` unit tests per goal type — this is the deterministic core the 3-vs-6-month call depends on; needs to be right independent of the LLM.
- Existing 154+ suite must stay green (`bun run test`) per repo CLAUDE.md.

---

## 4. Rollout

1. Extract `safeRateCeiling` from `wake.js`/`cadence.js` (pure refactor, no behavior change) — own PR.
2. Build `breakdownGoal()` per sibling LLM API doc, with the scripted/no-LLM fallback as first-class (not an afterthought) — own PR.
3. Wire `prompting.js` + `turns.js` to the new call, delete dead regex extractors — own PR.
4. Update `Onboard.jsx` to render `why` / `horizonReason` — own PR.
5. Vault schema additive fields — can ship alongside step 3 or 4, whichever touches `saveGoal`.

Each step independently shippable and testable — matches repo's one-PR-per-logical-change rule.

---

## 5. Open questions carried from parent

- §2.3 safe-rate-ceiling heuristic needs your review before step 1 is more than a refactor.
- Whether round *size* (not just `why`) should vary is unresolved — affects whether `buildRounds` math changes or just gains annotation.
