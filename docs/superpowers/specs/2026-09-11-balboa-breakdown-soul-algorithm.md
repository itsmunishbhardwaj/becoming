# The Balboa Breakdown — Soul Algorithm

**Status:** draft, in progress — building this collaboratively before codifying
**Date started:** 2026-09-11
**Format:** Problem → Principles → Inputs → Outputs (the user's standard for defining any function at first principles)

> This doc precedes and supersedes the mechanics in `2026-08-10-balboa-breakdown-design.md` where they conflict. That doc describes the *current shipped implementation* (regex-driven wizard, `src/onboard/turns.js` + `prompting.js`). This doc defines what the algorithm should actually *be* — the reasoning core — before we rebuild it.

---

## 1. Problem

Balboa Breakdown exists to turn a vague ambition into a personally-calibrated, doable path toward a habit or goal.

Today's implementation fails this: `src/onboard/turns.js` and `prompting.js` are a fixed 8-turn regex/keyword form. The LLM is only used to reword canned lines — it never reasons about the person, the goal's shape, or how to pace it. Classification (`type`, `cat`), round generation, and indicators are all hardcoded pattern-matching or linear math. Result: it feels like filling out a form, not like being coached. (Roadmap: "feels extensive... like an interview.")

The soul algorithm is the actual decision-making core that should sit underneath the chat UI — the thing that takes a raw ambition and produces a real, personalized breakdown.

---

## 2. Principles

### 2.1 The quarter is the unit of time.

- Every goal set through Balboa Breakdown defaults to **one quarter (3 months)**.
- A goal may extend to **two quarters (6 months) max** — only if the goal/habit genuinely deserves that horizon. This is an exception, not a default, and the algorithm must be able to justify it when it happens (not just default to "give it more time").
- Reasoning: Parkinson's law — work expands to fill the time it's given. Shorter horizons force faster habit pickup. But too short and the user loses interest before the habit sticks. The quarter is the calibrated middle: long enough to build real behavior change, short enough to keep urgency and interest alive.
- Open question to resolve: what makes a goal "deserve" 6 months instead of 3? (e.g. physiological limits — you can't safely shift a wake time 2 hours in 3 months — vs. goals that are artificially dragged out.)

### 2.2 Decompose like a PRD.

- The core move of Balboa Breakdown is: understand the requirement (the ambition, in the user's own words), then break it into smaller steps — **rounds** — the same way a PRD breaks a big feature into shippable increments.
- Rounds are not just a linear math split (current implementation: evenly-spaced steps). They are the *gradual progression* — each round should be a real, winnable increment on its own, sequenced so completing them compounds toward the outcome.
- Framed as game theory: each round is a move that improves your position; the "big prize" is the habit being fully acquired. The algorithm should think in terms of what sequence of small wins gets someone to actually keep playing until they win, not just what math gets baseline to target on a straight line.

### 2.3 The 3-vs-6-month test.

*(proposed — flag if this isn't what you meant)*

Default is 3 months. Extend to 6 only if the algorithm can name a concrete reason in one of two buckets:

- **Physiological / mechanical ceiling** — the gap between baseline and target cannot safely or realistically close in 12 weeks at a sane pace (e.g. shifting wake time 3+ hours; a cadence reset from daily to weekly for a deeply compulsive pattern). The algorithm computes the safe max rate of change (already exists as a heuristic in wake/cadence round math) and checks whether 3 months' worth of rounds at that safe rate reaches target. If not, extend — and say why in the output.
- **Compounding/identity-level goal** — the ambition is itself a multi-stage build (e.g. "become a runner" implies base building before speed work) where the first quarter is necessarily prerequisite to the second, not just "more of the same." Rare; the algorithm should default to no before reaching for this.

If neither applies, 3 months, no exceptions — this is the guard against "give it more time" as a lazy default.

---

## 3. Inputs

*(proposed — flag anything wrong)*

| Input | Source | Notes |
|---|---|---|
| `ambition` | user, free text, turn 1 | Verbatim — never paraphrased into corporate-speak (origin-spreadsheets principle) |
| `today` | system | Anchors the quarter math |
| `existingGoals[]` | vault | Avoid duplicate/overloaded goal set; category balance awareness |
| `baseline` | user, free text | Where they are now — parsed by the LLM, not regex |
| `constraints` (optional) | user, free text | Anything volunteered — "I travel every other week," "mornings are rough for me" — the algorithm should ask for this, not just accept a bare number |
| `pastAttempts` (optional) | user or vault history | If this goal (or its category) has been tried before — informs pacing, not just "did it work" |

---

## 4. Outputs

*(proposed — flag anything wrong)*

| Output | Shape | Notes |
|---|---|---|
| `name` | string | Short, human |
| `cat` | enum (`CATS` in tokens.js) | Identity area |
| `baseline` / `target` | `"HH:MM"` or `{ intervalDays }` or type-specific | Same shape contract as today's `goalTypes/*.js` |
| `endDate` | ISO date | `today + 3mo` default, `today + 6mo` only if §2.3 test passes |
| `horizonReason` | string, only present if 6mo | The concrete justification — required whenever default is overridden, per §2.3 |
| `rounds[]` | `{ n, from, to, startDate, endDate, targetValue, why }` | `why` is new — one line on what this round is actually building, not just the math step |
| `indicators` | `{ right[], wrong[], stall[] }` | LLM-reasoned per the specific ambition + baseline, not templated per type |

---

## 5. Open questions

- §2.3 is a first draft — needs your review, especially the "safe max rate of change" heuristic per goal type.
- How does "PRD-style decomposition" differ mechanically from the current linear round-split, beyond adding `why`? Does round *size* also vary (not just label), or is evenly-spaced-but-justified enough?
- Where does the LLM's judgment enter vs. where should logic stay deterministic? Working assumption: quarter math and safe-rate ceiling are deterministic; ambition parsing, round `why`, and indicators are LLM.

---

## 6. Adjacent features (not the core algorithm)

Parked here so they don't get conflated with the soul algorithm itself — good ideas, but they're downstream of it (consume its output), not part of the reasoning core.

- **Signed contract at end of flow.** After the breakdown is confirmed, generate a contract: "I will do X. To achieve this, I accept trade-off on Y, Z." Digitally signed by the user. Reinforces commitment (Origin spreadsheets principle: "own words, own stakes"). Depends on the algorithm's output (ambition + rounds + trade-offs) — doesn't change what the algorithm computes.
