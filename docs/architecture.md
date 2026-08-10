# Architecture

Current prototype = static mock data (`src/data/mockLife.js`) rendered by two screens. This doc sketches where the data model goes. Nothing here is built yet — it's direction, not law.

## The graph

Philosophy demands a knowledge graph, not tables. Everything connects:

```
Goals → Projects → Activities → Journal → People → Places → Skills → Habits → Reflections → AI Insights
```

Upward inference is the point: an Activity resolves to a Project resolves to a Goal without manual tagging.

```
"Solved 3 Leetcode problems"
   → Activity(coding practice)
   → Project(Leetcode)
   → Goal(Become Google Engineer)
```

## A goal has three kinds of children (don't conflate them)

1. **Projects** — progress toward a finite target. Render as `done/total` bar. ("Leetcode 148/200")
2. **Activities** — timestamped events with effort. Feed the calendar circles. ("Gym, 55 min")
3. **Habits** — binary daily yes/no, tallied over the year. Render as `X/365` + streak + year strip. ("Slept before 12: 214/365")

Same day can produce all three: an Activity ("gym 55min") also satisfies a Habit ("Trained") and nudges a Project. One log → many edges.

## Entities (first pass)

- **Goal** — `{ id, name, category, mission, why, state, createdAt, momentum, projects[] }`
  - `state`: active | drift | dormant | completed | retired
  - dormant carries `{ since, note, snapshot }` so it wakes exactly where left
- **Project** — `{ id, goalId, name, milestones[], progress }`
- **Activity** — `{ id, ts, raw, effort, projectIds[], people[], skills[], place, source }`
  - `source`: manual | voice | calendar | github | health (passive capture, v2)
- **Habit** — `{ id, goalId, name, polarity: 'do'|'avoid', log: {date: bool} }`
  - binary daily yes/no attached to a goal (distinct from Project and Activity)
  - derived: `hits` (true days), `rate = hits/daysElapsed`, `current` streak, `best` streak
  - `polarity`: "do" (slept before 12, trained) vs "avoid" (no PMO, no doomscroll) — avoid habits count clean days
  - renders as **X/365 + %** and a 365-cell year strip (hit filled in category color, miss faint)
  - examples: "Slept before 12: 214/365", "No PMO: 180/365 🔥12"
- **Insight** — `{ id, kind: 'fact'|'pattern', text, status: 'open'|'confirmed'|'rejected', evidence[] }`
  - facts render plainly; patterns render as questions; confirmed patterns become edges

## Known modeling tension (flagged for v2, do not silently paper over)

Identity goals split into two kinds:
- **Achievements** — finite, have an end state (get hired, read 50 books). Progress % is meaningful.
- **Practices** — infinite (stay healthy, keep relationships). Progress % is a lie; use streak/momentum.

The prototype shows one % bar for both. Model should carry a `goalKind` and render progress differently. Decide before real data lands.

## Inference & trust

- Auto-mapping will misfire. Every inferred edge needs a confidence and a cheap correction path.
- Facts (counts, dates, gaps) are certain → state them.
- Patterns (correlations from noisy self-report) are uncertain → ask. n is small; most correlations are spurious. A wrong insight stated confidently destroys trust.

## Persistence (decided — Obsidian vault)

Local-first, via the user's Obsidian vault: goals are notes with flat
frontmatter, marked days are lines in daily notes, Obsidian Bases provides
Notion-style table views over the same files. Full plan, schema, adapter
interface, and phased migration: **`docs/obsidian-backend.md`**. The earlier
SQLite/kv sketch is superseded — markdown-in-vault won because the vault is
already the user's knowledge graph and the exit story is plain text.
Natural-language logging → LLM extraction → daily-note lines. Passive
integrations (calendar, GitHub, Apple Health) append the same lines — same
grammar as a human typing in Obsidian.
