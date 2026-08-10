# The Balboa Breakdown — Design Spec

> "One step, one punch, one round at a time." — Rocky Balboa, *Creed* (2015)

**Date:** 2026-08-10
**Status:** Approved, phased build
**Scope:** Onboarding ritual + first two real goals + provider-agnostic LLM + vault-backed persistence

---

## 1. Intent

Turn any goal into a set of **rounds** — comfortable, LLM-guided intervals from where the user is today to where they want to land, by a specific end date. This is step zero of Becoming. Every goal enters the app through this ritual.

Two real goals seed the app; six mocks are removed.

1. **Wake at 6:00 AM** — monotonic time reduction from current wake to 06:00 by year end.
2. **Cadence reset** (masturbation) — widen sessions from compulsive/daily to a scheduled healthy cadence. Not zero. Not shame. Just rhythm.

---

## 2. Non-negotiables (inherit from `docs/philosophy.md` + `docs/brand.md`)

- Paper theme, no red, accumulation framing.
- No guilt UI. Off-plan sessions render in `whisper`, never red.
- Insights = questions with equal-weight answers.
- Category color = identity. Wake and cadence get distinct hues from `CATS`.
- Empty is dignified — empty Home welcomes; empty logs don't scold.

---

## 3. Data model

### 3.1 Files

```
vault/
  goals/
    wake-6am.md
    cadence-reset.md
  logs/
    YYYY-MM-DD.md
```

Vault lives at repo root. Real markdown files. Openable in Obsidian.

### 3.2 Goal shape (from `.md` front-matter + body)

```yaml
---
id: wake-6am
name: Wake at 6:00 AM
cat: health
type: wake          # wake | cadence
state: active       # active | drift | dormant | completed | retired
baseline: "08:30"   # wake: HH:MM · cadence: { intervalDays: 1 }
target:   "06:00"   # wake: HH:MM · cadence: { intervalDays: 7 }
endDate:  2026-12-31
currentRound: 1
createdAt: 2026-08-10
---
```

Body sections (fixed order — parser reads by heading):
- `## Ambition` — user's own words, verbatim.
- `## Rounds` — markdown table, one row per round: `# | Target | Window`.
- `## How we get there` — 1–3 sentences.
- `## Right direction` — bulleted indicators of progress.
- `## Wrong direction` — bulleted indicators of drift.
- `## No movement` — bulleted indicators of stall.

### 3.3 Log shape

```yaml
---
date: 2026-08-10
---

- wake 07:12 → [[wake-6am]]
- session 22:40 · 18min → [[cadence-reset]]
```

Line grammar: `- <verb> <payload> → [[<goal-id>]]`. Payload parsed per goal type.

### 3.4 In-memory model

`store.js` exposes:
```
listGoals(): Goal[]
getGoal(id): Goal
saveGoal(goal): void            // rewrites .md
appendLog(date, line): void     // idempotent by content hash
readLogs(range): LogEvent[]
```

Goal type:
```
{ id, name, cat, ambition, type, baseline, target, endDate,
  rounds: [{ n, from, to, startDate, endDate, targetValue }],
  currentRound, state,
  indicators: { right: string[], wrong: string[], stall: string[] },
  createdAt }
```

---

## 4. Goal types

### 4.1 `wake`
- `targetValue`: `"HH:MM"` per round, decreasing.
- Log event: `{ type: "wake", time: "HH:MM" }`.
- Adherence per day:
  - `wake ≤ target + 15min` → **hit** (full opacity mark).
  - `wake > target + 45min` → **off** (whisper mark).
  - otherwise → **soft hit** (0.55 opacity).
  - no log → faint dot.

### 4.2 `cadence`
- `targetValue`: `{ intervalDays: N }` per round, increasing.
- Schedule = every Nth day from round start; those days are "green" (allowed).
- Log event: `{ type: "session", time, durationMin }`.
- Adherence per day:
  - green day + session → **hit** (full mark).
  - non-green + no session → **clean skip** (soft hit).
  - non-green + session → **off plan** (whisper mark, never red).
  - green day + no session → neutral (no penalty).

### 4.3 Extending later
New type = new module in `src/data/goalTypes/<type>.js` exporting `{ classify, buildRounds, adherence, parseLogLine }`. Onboarding + Year + Home dispatch on `goal.type`.

---

## 5. The Balboa Breakdown flow

Route: `/onboard` (new) or `/onboard/:goalId` (edit rounds).

Screen: paper, ~560 wide, chat panel above, sticky input below. Right rail on desktop shows live markdown preview.

### 5.1 Turns

| # | LLM prompt | User input | Writes to state |
|---|-----------|-----------|-----------------|
| 1 | "What's the goal, in your words?" | free text | `ambition`, infers `name` + `cat` |
| 2 | (silent) LLM classifies `type` | — | `type` |
| 3 | Type-specific baseline probe | value | `baseline` |
| 4 | "Where do you want to land?" | value | `target` |
| 5 | "By when feels doable?" | date | `endDate` |
| 6 | LLM proposes step size + rounds preview | confirm / soften | `rounds[]` |
| 7 | LLM drafts right/wrong/stall indicators | edit inline | `indicators` |
| 8 | Confirm → write `.md` → redirect to `/goal/:id` | — | file on disk |

Each turn is idempotent and resumable — partial state persists to `vault/goals/<id>.draft.md`. If user bails, next visit reopens the draft.

### 5.2 Skip button
Every turn has "skip — use a sensible default". Defaults per turn are hard-coded (no LLM cost). Prevents lock-in.

### 5.3 Round generation heuristic (fallback if LLM off)
- Wake: divide `(baseline − target)` into equal 30-min steps, evenly spaced across `now → endDate`, minimum 10 days per round.
- Cadence: linear widening of `intervalDays` from baseline to target across timeline, minimum 14 days per round.

LLM is asked to refine, not required.

---

## 6. LLM adapter

`src/lib/llm.js`:
```js
chat(messages, { model, temperature }): Promise<string>
```

Speaks **OpenAI-compatible** `POST /chat/completions`. One shape, all providers.

### 6.1 Config (`.env.local`)
```
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=sk-or-...
LLM_MODEL=anthropic/claude-3.5-sonnet
```

Any OpenRouter model works. Swap `LLM_BASE_URL` for OpenAI, Groq, Together, local Ollama.

### 6.2 Proxy
Vite dev middleware `/api/llm` — reads env, forwards to `${LLM_BASE_URL}/chat/completions`, streams response. **Key never touches the browser.**

Prod later = same route as serverless function.

### 6.3 Failure mode
No key set → onboarding falls back to scripted wizard using round heuristic (§5.3). Feature-flagged, not fatal.

---

## 7. Screens

### 7.1 Empty Home
- H1: "Who are you becoming?"
- Sub: "No goals yet. Start with one."
- Paper pill CTA: `+ Set your first goal` → `/onboard`.
- No log blob (nothing to log against).

### 7.2 Onboard (`/onboard`)
- New screen. Reuses paper theme.
- Chat bubbles: user right-aligned card fill; assistant left-aligned gradient (rose→lavender→sage at 3% opacity).
- Sticky input: same textarea as Log sheet.
- Live markdown preview panel (desktop) or `Show what we're writing` accordion (mobile).

### 7.3 Home with goals
- Existing GoalCard renders each real goal.
- Footer adds `+ New goal` paper pill → `/onboard`.
- Log blob visible.

### 7.4 Goal workspace (`/goal/:id`)
- Follows `docs/ui-spec.md` §4.
- New **Rounds** section between Period chip and Projects:
  - Current round: category color chip, `Round {n} of {total} · target {targetValue}, until {endDate}`.
  - Past rounds: greyed timeline dots.
  - Future rounds: faint outline dots.
  - Link: `Adjust rounds →` reopens onboarding at turn 6.

### 7.5 Year (`/year`)
- Unchanged rendering. Pen chips list real goals only. Overlap-and-highlight already matches Figma.

### 7.6 Log sheet
- Existing spec §5.
- Regex parser v1:
  - `/^woke?\s+(\d{1,2}:\d{2})/i` → wake event on `wake-6am`.
  - `/^(session|jerked?|masturbat\w*)\s*(\d{1,2}:\d{2})?\s*·?\s*(\d+)\s*min/i` → session event on `cadence-reset`.
- LLM parser is Phase 4.

---

## 8. Adherence → momentum

Home orb momentum per goal = rolling 14-day adherence ratio.

- Wake: `hits / logged_days` (soft hits count 0.5).
- Cadence: `(hits + clean_skips) / 14` (off-plan counts 0).

Feeds existing `<Orb momentum={0..1} />`. No new component.

---

## 9. Build phasing

Ship each phase before starting next. Verify with real markdown roundtrip.

### Phase 1 — Foundation
- Delete `mockLife.js` contents (keep file, export empty `GOALS`, `QUESTIONS`).
- Create `vault/` directory, `.gitignore` `vault/logs/` (personal data).
- `src/data/store.js`: `listGoals`, `getGoal`, `saveGoal`, `appendLog`, `readLogs`.
- Vite dev middleware for `/api/vault/*` (read/write files under `/vault`).
- `src/data/goalTypes/wake.js` + `cadence.js`.
- Hand-write `vault/goals/wake-6am.md` + `cadence-reset.md` to verify pipeline.
- Home renders empty state when no goals.

### Phase 2 — Balboa Breakdown
- `src/lib/llm.js` OpenAI-compat adapter.
- Vite middleware `/api/llm` proxy to OpenRouter.
- `/onboard` route with chat UI.
- Turn state machine per §5.
- Fallback scripted wizard when no key.

### Phase 3 — Logging + adherence
- Log sheet with regex parser.
- Wake + cadence adherence renderers.
- Year screen wired to real logs.
- Home momentum from real adherence.

### Phase 4 — Workspace + polish
- `/goal/:id` route with Rounds section.
- Round auto-advance on `endDate`.
- LLM parser upgrade for log sheet.
- Indicators surfaced as insight questions on Home.

---

## 10. Definition of done (whole feature)

- User with no goals lands on empty Home, taps CTA, completes Balboa Breakdown for both goals via LLM chat, sees them on Home + Year.
- Both `.md` files exist in `/vault/goals/`, hand-editable in Obsidian, and app re-reads them on reload with no data loss.
- Logging via sheet writes to `vault/logs/YYYY-MM-DD.md`; Home momentum reflects within one render.
- LLM adapter works against OpenRouter with any model; swapping `LLM_MODEL` env var requires no code change.
- No red anywhere. No percentage rendered as text. No guilt string ever printed.
- `prefers-reduced-motion` disables all animation.

---

## 11. Out of scope (explicit)

- Google-Maps zoom transition (still deferred per `docs/roadmap.md`).
- Multi-user, auth, sync.
- Mobile install / PWA.
- Additional goal types beyond `wake` and `cadence` (framework supports them; not seeded).
- Insight generation (Phase 4 only).
