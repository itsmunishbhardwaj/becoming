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

- [ ] M1 — Foundation
- [ ] M2 — Home (Life view)
- [ ] M3 — Natural language capture
- [ ] M4 — Goal page
- [ ] M5 — Calendar / zoom
- [ ] M6 — AI Chief of Staff
- [ ] M7 — Semantic search
- [ ] M8 — Polish pass

Ship each milestone as its own PR to `main`. No milestone is "done" until the "Done when" criterion is demonstrated with a screen recording in the PR description.
