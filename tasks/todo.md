# Life OS — Build Plan for Fable

> Companion doc: `philosophy.md` (read first — it is the north star, not a suggestion).
> This plan is written to be handed to a capable coding agent (Fable) and executed with minimal clarification.

---

## 0. Non-Negotiables

Before writing a line of code, internalize these. Every PR must pass this smell test.

- The app **does not open into a calendar**. It opens into Life (goal cards).
- Goals are the primary object. Everything else is a leaf on the goal tree.
- Input is **natural language first**. Forms are a fallback, not the default.
- Zoom is continuous (Google Maps metaphor). No page switches between year → day → activity.
- Visual language: calm, premium, spacious. Reference: Apple Health, Linear, Arc, Figma, Google Maps.
- Motion is morph, not appear/disappear.
- One question drives every decision: **"Does this help the user understand who they are becoming?"** If no → cut it.

---

## 1. Stack

Pick boring, fast, and AI-native. No exotic choices.

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript.
- **Styling:** Tailwind CSS v4 + shadcn/ui primitives. Custom motion via Framer Motion.
- **Canvas / zoom:** `react-zoom-pan-pinch` for the map-style zoom shell, custom SVG/Canvas for the year-view circle field.
- **State:** Zustand for UI state, TanStack Query for server state.
- **Backend:** Next.js Route Handlers + Server Actions. No separate service until scale forces it.
- **DB:** Postgres (Neon via Vercel Marketplace). Drizzle ORM.
- **Vector search:** pgvector on the same Postgres. One database, one bill.
- **Auth:** Clerk (Vercel Marketplace, one command).
- **LLM:** Anthropic SDK, `claude-opus-4-7` for extraction/insights, `claude-haiku-4-5-20251001` for cheap classification. Prompt caching on every call.
- **Deploy:** Vercel. Preview per PR, production on `main`.

Rationale: this stack lets Fable ship the MVP in one repo with no infra glue.

---

## 2. Data Model (the Knowledge Graph)

Everything hangs off this. Design it once, correctly.

```
User
 └─ Goal            (permanent identities: "Become Google Engineer")
     ├─ Mission     (why)
     ├─ Category    (color-coded: AI/Health/Career/Reading/Relationships/Creativity/…)
     ├─ Project     (e.g. "Leetcode", "Resume")
     │   ├─ Milestone
     │   └─ Activity  ← the atomic unit of progress
     │       ├─ duration, energy, mood, location
     │       ├─ People[]    (many-to-many)
     │       ├─ Skills[]    (many-to-many)
     │       └─ JournalEntry (optional, free text)
     ├─ Momentum    (derived: EMA of activity frequency × duration)
     ├─ Streak      (derived)
     └─ Insights[]  (AI-generated observations, cached)

Cross-cutting nodes: Person, Place, Skill, Habit, Reflection.
Every node has embeddings for semantic search.
```

Drizzle schema tables: `users`, `goals`, `projects`, `milestones`, `activities`, `journal_entries`, `people`, `places`, `skills`, `activity_people`, `activity_skills`, `activity_projects` (many-to-many, an activity can push multiple projects/goals), `insights`, `embeddings`.

Key invariant: an activity **can attach to multiple projects and multiple goals**. Do not force 1:1. The AI infers the fan-out.

---

## 3. Milestones (Ship in this Order)

Each milestone is a shippable slice. Do not skip ahead.

### M1 — Foundation (week 1)
- Repo scaffold, Vercel link, Clerk auth, Neon Postgres, Drizzle migrations.
- Schema from §2 migrated to prod.
- Seed script that inserts one demo user with 5 goals, 15 projects, 200 activities so the UI has something to render.
- **Done when:** signed-in user sees a raw list of their goals from the DB.

### M2 — Home Screen (Life view) (week 2)
- Route: `/` renders vertical stack of Goal Cards (see philosophy.md L165–210).
- Each card: title, progress bar (momentum score, not % of a fake plan), last-worked timestamp, one-sentence AI status line, category color band.
- No sidebar. No nav. No calendar link visible.
- Empty state prompts "What are you becoming?" → creates first goal via chat.
- **Done when:** opening the app answers "what matters, what has momentum, what is neglected" in <2s.

### M3 — Natural Language Capture (week 2–3)
- Persistent input at bottom of screen: "What did you do today?"
- On submit → Claude Opus extraction call with structured output (Zod schema): activities[], people[], skills[], durations, inferred projects, inferred goals, confidence per field.
- Save extracted rows in a transaction. Show a diff-style confirmation ("I logged 4 activities across 3 goals — undo?").
- Cache the system prompt (it's long and static — huge cost win).
- **Done when:** the sentence in philosophy.md L484 produces the correct fan-out with zero follow-up questions.

### M4 — Goal Page (week 3–4)
- Route: `/goal/[id]`.
- Sections: Mission, Projects (with progress), Momentum sparkline, Calendar strip (last 90 days), Insights feed, Journal.
- Everything editable inline. No modal dialogs.
- **Done when:** clicking a Home card morphs (not navigates) into its Goal page.

### M5 — Calendar Visualization (week 4–5)
- Year view: 365 tiles, each rendering the day's activities as translucent overlapping circles. Color = category, size = duration, opacity = 0.6.
- Hover reveals activity list. Click zooms in.
- Zoom levels: Life → Year → Month → Week → Day → Activity → Journal. **All one continuous transform.**
- Implement with a single normalized coordinate space; each level is a CSS transform + LOD swap, not a route change.
- **Done when:** scrolling out from a single activity smoothly reveals the year without a page flash.

### M6 — AI Chief of Staff (week 5–6)
- Nightly cron (Vercel Cron): for each user, run an Opus pass over the last 7/30/90 days of activity + prior insights → generate 3–5 fresh observations.
- Surface top 1 on the Home screen as ambient text under the title.
- Insight examples in philosophy.md L582–590 are the tone target — thoughtful, not analytical.
- Store insights with `valid_until` so stale ones fade out.
- **Done when:** a user who ignored a goal for 12 days sees an unprompted, well-phrased nudge on Home.

### M7 — Semantic Search (week 6)
- Command palette (Cmd-K) → natural language query → hybrid search (BM25 + pgvector) → results as morphing calendar overlays, not a list.
- Query examples from philosophy.md L600–610 must all work.
- **Done when:** "show every workout before an interview" returns correct results in <500ms.

### M8 — Polish Pass (week 7)
- Motion audit: every transition uses Framer Motion `layoutId` or shared-element morphs. No fades on structural changes.
- Type ramp, spacing scale, and color tokens locked in a design tokens file.
- Empty states, loading states, error states — all designed, not stubbed.
- Lighthouse ≥95 on `/`. First paint <1s on 4G.
- **Done when:** a designer friend says "this feels like Linear crossed with Apple Health" without prompting.

---

## 4. Key Implementation Notes for Fable

- **Extraction prompt:** system prompt describes the graph schema; user turn is raw text; response is JSON matching a Zod schema. Turn on prompt caching for the system block. Fall back to Haiku on retries only.
- **Momentum score:** EMA over daily activity minutes per goal, half-life 14 days. Rendered as progress bar width and as the number under the title. Not a % of a fake target.
- **Categories & colors:** define once in `lib/categories.ts`. Never let users pick raw hex — pick from the fixed palette (philosophy.md L287–298).
- **Zoom shell:** one `<ViewportProvider>` context holds `zoomLevel` and `focusId`. Every view reads from it. No route changes when zooming.
- **AI cost control:** batch nightly insights, cache aggressively, use Haiku for classification-shaped tasks (which project does this activity belong to?), Opus only for extraction and insights.
- **Do not build:** habit checkboxes, task lists with due dates, a scheduler, notifications for missed habits. Those are anti-features.

---

## 5. Success Metric (the Only One)

A user opens the app and, within 5 seconds, without reading a chart or table, can answer:
- Who am I becoming?
- Which goals are gaining momentum?
- Which have been neglected?

If a change makes any of those slower or less obvious → revert it.

---

## 6. Checklist for Fable

- [x] M1 — Foundation *(delivered on a different stack: Vite + React 18 + iCloud vault, no Clerk/Neon/Drizzle)*
- [x] M2 — Home (Life view) — `src/screens/Home.jsx`; goal cards, momentum orbs, drift indicators
- [~] M3 — Natural language capture — `LogSheet.jsx` + `logParserLLM.js` do LLM extraction; single-goal routing, not the full multi-goal Zod fan-out
- [~] M4 — Goal page — `src/screens/Goal.jsx` exists (routed navigation, not the shared-element morph the spec calls for)
- [~] M5 — Calendar / zoom — `Year.jsx` with 365 cells + weekday header + per-goal blobs; still route-based, no continuous zoom transform yet
- [ ] M6 — AI Chief of Staff — `insights.js` scaffolded, no nightly cron
- [ ] M7 — Semantic search — not started
- [~] M8 — Polish pass — design tokens locked (`src/tokens.js`), watercolor palette, orb unification; no Framer Motion / Lighthouse audit

Legend: `[x]` done · `[~]` partial · `[ ]` not started. Live roadmap for what's next lives in `docs/roadmap-live.md`.

Ship each milestone as its own PR to `main`. No milestone is "done" until the "Done when" criterion is demonstrated with a screen recording in the PR description.

---

## Feature: Per-Goal Notes (branch `feat-per-goal-notes`)

### Intent
On any day's page (`/day/:date`), user can write a **separate note per goal** — a free-form paragraph capturing what happened / how it felt for that goal, that day. Notes aggregate on the goal detail page (`/goal/:id`) as a chronological timeline (ascending), and the latest snippet appears on the Home GoalCard.

### Storage (decision)
Notes live in the **daily log frontmatter**, keyed by goalId:

```yaml
---
date: 2026-08-18
notes:
  wake-6am: |
    felt tired, still made it
  meditate: |
    10 min, quiet
---
- wake 07:12 → [[wake-6am]]
```

Why: one file per day matches the "log your day" mental model, reuses existing atomic PUT path via `vaultMiddleware`, and goal-view aggregation is one `readLogsInRange` scan (already used for adherence). Empty/missing note = key omitted.

### Tasks
- [ ] **1. Codec** — extend `src/data/logCodec.js`
  - `parseLog` reads `notes` map from frontmatter (safe when absent → `{}`)
  - `serializeLog(date, events, notes)` writes `notes:` block when non-empty; omits when all keys empty
  - Tests in `logCodec.test.js`: round-trip with/without notes, empty-string note dropped, unicode preserved
- [ ] **2. Store** — extend `src/data/store.js`
  - `saveNote(date, goalId, text)` — reads existing log, updates note, PUTs merged markdown; deletes key when text is empty/whitespace
  - Tests in `store.test.js` if network mocks exist; else lean on codec tests
- [ ] **3. Day page** — `src/screens/Day.jsx`
  - New "NOTES" section below "LOGGED"
  - Renders one editor block per active/drift goal (same goals as ADD row)
  - Each block: goal dot + name, textarea prefilled with current note, autosave on blur (debounced) via `saveNote`
  - Subtle saved/saving indicator per block
- [ ] **4. Goal detail** — `src/screens/Goal.jsx`
  - New "NOTES" section: read all logs, filter entries where `notes[goalId]` present, render ascending by date
  - Each row: date header (localized), then note text (preserve newlines)
  - Empty state: "No notes yet — write one from a day."
- [ ] **5. Home surface** — `src/components/GoalCard.jsx`
  - Latest note snippet (truncated ~90 chars) with date, styled with `PAPER.faint`
  - Only shows when a note exists; card layout unchanged otherwise
  - Requires GoalCard to receive `latestNote` prop (compute in Home.jsx from same log scan already used for momentum)
- [ ] **6. Verify** — dev server up, walk the full flow in browser: write note on day → see on goal page → see snippet on Home; refresh → persisted in vault; delete note (empty textarea) → removed everywhere.

### Non-goals (deferred)
- Note editing on the goal detail page (read-only there for v1 — user asked to view chronologically, not edit)
- Note search
- Notes per day *not* tied to a goal (day-level journal)
- Rich text / markdown rendering beyond newlines

### Guardrails
- **Never touch files outside the vault** (memory rule). All writes go through existing `PUT /api/vault/logs/:date`.
- Follow tokens (`src/tokens.js`) — no new colors, no hardcoded hex.
- No guilt UI. Missing note = silent.

---

## Feature: Month view, Week view, Today marker (branch `feat-calendar-zoom-views`)

### Intent
Zoom levels on the calendar: **Year (existing) → Month → Week**. Each level owns the full viewport at that zoom. Add a **Today** control on the Year view that scrolls to and marks today with a subtle white halo behind (not over) the day's blobs.

Longer-term this becomes the Google-Maps continuous zoom (roadmap risk item). This ticket ships the three levels as routes with swipe/button nav — the transform-based morph comes later.

### Routes
- `/year` — existing
- `/month/:yyyymm` — e.g. `/month/2026-08`
- `/week/:yyyymmdd` — anchored on the **Sunday** that starts the visible week (matches `DAY_LETTERS` starting `S`)

### 1. Month view — `src/screens/Month.jsx`
- One month fills the viewport. Header: month name + year (serif, large), prev/next arrow buttons, "Year ↑" back link.
- Reuses `DayCell` semantics: pen chip row, tap-to-mark, double-click → `/day/:iso`. All existing pen state carried in `?pen=...` query param.
- Grid: 7-col, larger cells (~clamp 44–64px) than Year. Weekday header row.
- Loads logs for month range only (`readLogsInRange({from: firstOfMonth, to: lastOfMonth})`).
- Nav:
  - Buttons: `‹` prev, `›` next (top-right of header)
  - Keyboard: `←` / `→`
  - Touch swipe: horizontal swipe (>60px, faster than 0.3s) → nav prev/next. Use pointer events, no library.
  - Month-to-month transition: 180ms slide + fade; respect `prefers-reduced-motion` (no motion).
- Boundary: December → next = `/month/{year+1}-01`; January → prev = `/month/{year-1}-12`.
- **No new tokens.** Same paper bg, same category colors.

### 2. Week view — `src/screens/Week.jsx`
- One week fills the viewport. Header: "Week of Aug 10 – 16, 2026" (or the ISO range), prev/next.
- 7 day cells in a single row, each cell **much larger** (~clamp 88–140px) — enough to show weekday letter + day number + blobs at comfortable size.
- Same pen chip row, tap-to-mark, double-click → `/day/:iso`.
- Nav (same idioms as Month): prev/next buttons, `←`/`→` keys, horizontal swipe. Boundary crosses month/year cleanly (advance by 7 days from the Sunday anchor).
- Blob sizing: reuse `<Blob>` but with larger cell viewBox so blobs read at ~2× the Year size. Add a `scale` prop to `Blob` (default 1) so DayCell can reuse it across zoom levels without a fork.
- Optional (nice-to-have, not required): show event count / note snippet below each day cell if space allows. **Deferred** if it complicates layout.

### 3. Today button + halo — Year view
- Button placement: in the Year header row (right of title), styled as a pill — `padding: 4px 12px`, matches pen chips visually.
- Click behavior:
  - Compute today's ISO from local date (use existing `todayLocalISO` from `src/lib/date.js`).
  - Scroll today's `DayCell` into view (smooth, block: center). Cell needs a stable ref/id keyed by iso.
  - Set a Year-scoped `todayMarked` state (persists during session; cleared on unmount). Toggle off if button clicked again on the same day.
- Halo rendering:
  - Inside `DayCell` SVG, when `isToday && showHalo`, render `<circle>` **as the first SVG child** (behind blobs and behind text).
  - `cx=13, cy=13, r=12` (fits inside the 26×26 viewBox, ~92% of cell).
  - `fill="#FFFFFF"`, `opacity=0.6`.
  - Rationale: paper bg (`PAPER.bg` is a warm off-white); pure white at 0.6 brightens the cell into a soft disc that reads as "today" without overpowering the pastel blobs (0.78–0.85 opacity). Because it sits behind the ellipses, blobs stay legible on top.
  - Optional subtle scale-in: 200ms `transform: scale(0.85 → 1)` on first mount; opacity 0 → 0.6. Skipped under `prefers-reduced-motion`.
- Pass-through: `DayCell` gains `isToday` and `showHalo` props. Year computes `todayISO` once, forwards to the matching cell.

### Tasks
- [ ] **1. Shared cell** — extract `DayCell` and `Blob` from `Year.jsx` into `src/components/DayCell.jsx` and `src/components/Blob.jsx`. Add `scale` prop on `Blob`. Add `isToday`, `showHalo` props on `DayCell` (halo renders as first SVG child). No behavior change on Year.
- [ ] **2. Today button** — add pill button to Year header. Wire scroll-into-view + halo toggle. Refs map: `Record<iso, HTMLElement>` populated by DayCell via `ref` callback prop.
- [ ] **3. Month screen** — `src/screens/Month.jsx` + route `/month/:yyyymm` in `App.jsx`. Reuse `DayCell`, `Blob`, pen chip row (extract into `src/components/PenChips.jsx` if it stays clean). Add prev/next + keyboard + swipe.
- [ ] **4. Week screen** — `src/screens/Week.jsx` + route `/week/:yyyymmdd`. Anchor = Sunday of visible week. Same nav idioms. Larger cells, `scale=2` on blobs.
- [ ] **5. Cross-linking**
  - Year: click month name → `/month/:yyyymm`
  - Month: click "Week N" mini-label (or a small "week" pill on each row) → `/week/:sundayISO`
  - Week: click day → `/day/:iso` (single-click, since cells are large enough; double-click reserved for future zoom morph)
- [ ] **6. Tests**
  - Unit: swipe detection helper (pure function, threshold + velocity)
  - Snapshot / render: `DayCell` with `isToday && showHalo` includes the circle as first child
  - Boundary: Month prev from Jan crosses year; Week prev crosses months
- [ ] **7. Verify** — dev server, walk each level: Year → Today → halo appears + scroll; Year → click month → Month view swipes work; Month → click week → Week view swipes work; back navigation returns to correct zoom.

### Pinch-to-zoom navigation (mobile)
Native multi-touch pinch bridges zoom levels. Complements the swipe (siblings) + button (explicit) nav already spec'd.

- **Pinch out / spread → zoom in** = go one level deeper:
  - Year → Month (lands on the month under the pinch centroid)
  - Month → Week (lands on the week under the pinch centroid — the row containing the centroid's Y)
- **Pinch in / squeeze → zoom out** = go one level up:
  - Week → Month (parent month of the current week anchor)
  - Month → Year
  - Year → no-op
- **Detection** — native `pointerdown`/`pointermove` with pointerType `touch`, track two active pointers:
  - Compute initial distance between the two pointers on second `pointerdown`.
  - On each move, compute current distance. Scale ratio = current / initial.
  - **Trigger threshold**: ratio ≥ 1.35 → zoom-in fires; ratio ≤ 0.75 → zoom-out fires.
  - **Debounce**: fire once per gesture (lock until both pointers lift). No repeats mid-gesture.
  - **Centroid**: midpoint of the two pointers → hit-test the DayCell refs map to find target iso → derive month/week.
- **Feedback during pinch** (before threshold trip): CSS `transform: scale(ratio)` on the calendar shell, clamped to `[0.8, 1.4]`, so gesture feels physical. Reset on release (whether it fired or not).
- **Animation on route change**: 200ms cross-fade + slight scale toward pinch centroid (in) / away (out). Skipped under `prefers-reduced-motion`.
- **Guards**:
  - Ignore pinch on `<button>` / textareas / any tappable inside cells (check `event.target` closest interactive ancestor).
  - Prevent default browser page-zoom during gesture (`touch-action: none` on calendar shell).
  - Don't trip on accidental two-finger scroll: require ratio move within 400ms window and pointer displacement < 40px per pointer (mostly zoom, not swipe).
- **Extract**: put pinch logic in `src/lib/pinchGesture.js` (pure functions: `centroidOf(pts)`, `distanceOf(pts)`, `classifyPinch({ratio, elapsed})`) + a `usePinchZoom` hook in `src/hooks/usePinchZoom.js`. Unit tests for the pure helpers.

### Task additions (append to Tasks list above)
- [ ] **8. Pinch gesture lib + hook** — `src/lib/pinchGesture.js`, `src/hooks/usePinchZoom.js`, unit tests
- [ ] **9. Wire pinch** into `Year.jsx`, `Month.jsx`, `Week.jsx`. Each screen owns its zoom-in/out target derivation from centroid.
- [ ] **10. Verify on device** — real iPhone via local network. Golden path: Year → pinch out on August cell → lands on `/month/2026-08` → pinch out on second row → lands on `/week/2026-08-09`. Reverse pinches back up.

### Deferred (v2 / roadmap risk item)
- Continuous Google-Maps zoom morph between levels. This ticket ships them as separate routes so the mental model + data is proven first. Pinch above is a discrete threshold-triggered route change, not the continuous transform morph — that's the v2 target.
- Persisting `todayMarked` across reloads (session-only is fine).
- Note snippets per day in Week view.
- Trackpad pinch (desktop) — Safari fires `gesturestart`/`gesturechange`; Chromium uses `wheel` with `ctrlKey`. Cross-browser is fiddly; ship touch first, add desktop later if used.

### Guardrails
- No hardcoded colors except the explicit `#FFFFFF` for the today halo (justified: it's not a category color; it's a neutral highlight against paper bg). If tokens grow a `PAPER.today` later, swap.
- All new components pass `prefers-reduced-motion` unchanged.
- No new deps for swipe (native pointer events).

