# Obsidian as the database for Becoming

**Decision:** Becoming's source of truth becomes an Obsidian vault. Goals are
notes, marked days are lines in daily notes, and Obsidian **Bases** renders
the same data as Notion-style tables inside Obsidian. Becoming stays a React
app; only the data layer changes. `src/data/mockLife.js` stops being a
database and becomes an adapter.

**Why this fits** (not just convenience):

- The philosophy demands a knowledge graph where "everything connects." A
  vault *is* a knowledge graph — wikilinks are edges, backlinks are reverse
  edges. Goals → activities → days map onto notes + links with no impedance.
- Local-first, plain text, zero lock-in. `architecture.md` already promised
  local-first persistence; markdown is the most local-first format there is.
  Even Becoming itself can't hold the data hostage.
- The user's wider intent: one place for all personal intelligence. Becoming
  writes into that place instead of building a silo next to it.
- Bases means the "spreadsheet feeling" survives: the same goal notes render
  as a sortable, filterable table in Obsidian for free. Two front ends, one
  truth — Obsidian for tables and tinkering, Becoming for the calendar,
  orbs, and the psychology layer.

---

## 1. Vault layout

Everything Becoming touches lives under one folder in the vault, so it
coexists with whatever else the vault holds:

```
Vault/
  Becoming/
    Goals/
      Read 50 Books.md        ← one note per goal
      Health.md
      ...
    Bases/
      Goals.base              ← table views over Goals/
    (config: Becoming.md      ← app settings note, optional)
  Daily/                      ← the vault's existing daily notes folder
    2026-08-10.md             ← marks live here, next to everything else
```

Daily notes are deliberately **not** under `Becoming/` — they belong to the
whole vault. Becoming reads/writes specific list lines in them and leaves
everything else untouched.

## 2. Goal note schema (Bases-friendly)

One markdown file per goal. **Flat scalar properties only** in frontmatter —
Bases renders flat properties as columns; nested YAML doesn't work as a
column. The note body is the ambition, in the user's own voice, plus
milestones as a native checklist.

```markdown
---
becoming: goal            # marker property — Bases + adapter filter on this
category: reading         # must match a key in src/tokens.js CATS
state: active             # active | drift | dormant | completed | retired
created: 2026-01-01
reward: "A proper reading chair. The expensive one."
period_label: "This stretch (T3)"
period_target: "8 books"
headline_unit: "books"
dormant_note: ""          # filled when state: dormant
retro: ""                 # filled at completed/retired — the Result column
---

Fifty books. A book a week, near enough.

## Milestones
- [x] Pick the first 10
- [ ] 25 by June
- [ ] 50 by December
```

Derivation rules (adapter computes, never stored):

- `headline.n` — count of this goal's marks in daily notes (accumulation).
- project/milestone progress — checked vs total boxes under `## Milestones`.
- `momentum` — recency-weighted mark density (same math the orb uses now).
- drift — no marks for N days while `state: active`. **Drift is computed,
  never written to the file** — the file records intent (active), the app
  observes the gap and asks its one gentle question.

Identity: the filename is the display name; a rename in Obsidian is a rename
in Becoming. Wikilinks make renames safe vault-wide (Obsidian rewrites
links). The adapter keys goals by file path.

## 3. Marked days = lines in daily notes

The 2024 sheet's gesture — colour the cell on the day you moved the goal —
becomes one appended line:

```markdown
# 2026-08-10

- moved [[Read 50 Books]] — 20 pages of Deep Work
- moved [[Health]] — gym, push day, 55 min
- kept [[Health#Slept before 12]]
```

Grammar the adapter parses (defensively — ignore anything else):

- `- moved [[Goal Name]]` → a mark. Optional ` — free text` becomes the
  activity note (tooltip text, later the journal).
- `- kept [[Goal Name#Habit Name]]` → a habit day-kept. Avoid-polarity
  habits are still "kept" (clean day) — the format never encodes a miss.
- Unmarking (tap again in the app) deletes exactly that line.

This is the single most important property of the design: **a tap in
Becoming and a line typed by hand in Obsidian are the same write.** Neither
front end is privileged.

## 4. The Base (the Notion-style table)

`Becoming/Bases/Goals.base` ships as a starter file:

```yaml
filters:
  and:
    - becoming == "goal"
views:
  - type: table
    name: All goals
    order: [file.name, category, state, period_target, reward]
  - type: table
    name: In motion
    filters:
      and:
        - state == "active"
  - type: table
    name: Became real
    filters:
      and:
        - state == "completed"
    order: [file.name, category, retro]
```

The user gets sortable/filterable goal tables, editable inline, embeddable
in any note. No code on our side — this is why the frontmatter must stay
flat and typed.

## 5. The adapter (the only code that knows about markdown)

New file `src/data/store.js` defining the interface; everything else keeps
importing the same shapes it gets today:

```js
loadGoals()            → [{ id, name, cat, state, ambition, reward,
                            period, retro, headline, projects, habits,
                            momentum, last, lastDetail }]
loadMarks(year)        → { "monthIdx-day": [goalId, ...] }
markDay(goalId, date, note?)   → appends the daily-note line
unmarkDay(goalId, date)        → removes the line
setGoalState(goalId, state, note?) → edits frontmatter (dormant_note / retro)
```

Two implementations behind one flag:

- `mockStore` — wraps today's `mockLife.js` + localStorage. Default when no
  vault is connected, and the permanent demo/"example year" source.
- `vaultStore` — talks to the vault.

Screens import `store`, never a concrete implementation. This lands first
and is worth doing even if Obsidian never happens.

## 6. Transport: how a browser app reaches the vault

Phased — each phase is independently shippable:

**Phase A — Obsidian Local REST API plugin** *(recommended start)*.
Community plugin exposes the vault over `https://127.0.0.1:27124` with an
API key. `vaultStore` does plain `fetch` for read/append/patch. Zero build
changes, works with the existing Vite dev server. Setup cost for the user:
install one plugin, paste the key into Becoming once (stored in
localStorage).

**Phase B — File System Access API** *(fallback, no plugin)*. "Connect your
vault" button → browser folder picker → adapter reads/writes files
directly. Chromium-only; permission re-prompts after restart. Ship only if
the REST dependency chafes.

**Phase C — Becoming as an Obsidian plugin** *(the endgame, optional)*.
Obsidian plugins are TS + can mount React views. The screens (GoalCard,
Year, Orb — all plain React with inline styles) port as-is; the router and
Vite shell are replaced by a plugin view. Wins: native vault access, mobile
via Obsidian mobile, Obsidian Sync. Decide after Phase A proves the schema.

## 7. Migration plan (ordered, each step verifiable)

1. **Extract the store interface** (`store.js`, screens switch to it,
   mockStore passes the existing SSR probes unchanged). No behavior change.
2. **Vault conventions doc + starter kit**: a `vault-template/` folder in
   this repo with `Goals/` samples and `Goals.base`, copyable into a real
   vault. (Sample goals are neutral placeholders — the user writes their
   own goals in their own voice; we never ship pre-filled ambitions.)
3. **vaultStore, read-only** (Phase A transport): goals + marks render from
   the vault; writes still disabled. Feature flag: `?vault=1` or a settings
   toggle. Verify: edit a goal note in Obsidian → reload Becoming → change
   visible.
4. **Writes**: tap-to-mark appends/removes daily-note lines; "resting for
   now" (drift question) writes `state: dormant` + `dormant_note`;
   completing writes `retro`. Verify round-trip from both ends.
5. **Migrate localStorage marks**: one-time import of `becoming.marks.v1`
   into daily notes, then retire the key.
6. **Natural-language capture** (roadmap item) targets the same grammar:
   one sentence → parsed → `- moved [[...]]` lines. The vault format is
   already the capture format.

## 8. Risks & honest tradeoffs

- **No transactions.** Concurrent edits (Obsidian open + Becoming writing)
  can race. Mitigation: writes are line-level appends/removals, re-read
  before write, last-write-wins is acceptable at personal scale.
- **Parsing is trust.** Frontmatter will be hand-edited and sometimes
  malformed. The adapter must default every missing/broken field and never
  crash on a weird note. A goal note with only `becoming: goal` and a title
  must still render as a valid goal.
- **Renames.** File path = id, so a rename mid-session can orphan in-memory
  state. Mitigation: re-resolve by path on every write; Obsidian keeps
  wikilinks consistent on its side.
- **REST plugin dependency** (Phase A): one more moving part, self-signed
  cert quirk on first connect. Acceptable for a personal tool; Phase B/C
  remove it.
- **Bases schema drift.** Bases is young and its `.base` format may evolve;
  keep the starter Base trivial and the frontmatter conservative (flat
  strings/dates only).
- **What we give up vs SQLite:** query speed (irrelevant at this scale) and
  schema enforcement (replaced by defensive parsing). What we gain: the
  user's whole intelligence in one greppable place, editable by hand, alive
  in two front ends. For this product, that trade is right.

## 9. What this unlocks later

Weekly/yearly AI reviews read the vault directly (it's just text). Passive
capture (GitHub, calendar) appends the same daily-note lines. Journal
entries, people, and reflections become notes and links — the rest of the
philosophy's graph — without ever designing another database.
