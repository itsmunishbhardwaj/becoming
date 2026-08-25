# Migration Strategy — localhost React → SwiftUI + Web + Supabase

**Status:** Planned. Migration begins only after the localhost React prototype feels like a solid product.

**Date locked:** 2026-08-11

---

## The plan

1. **Now → until product feels solid:** keep iterating on the localhost React app (Vite + Node dev middleware + local `vault/` folder). Fast iteration, cheap mistakes, no rewrite tax until worth it.
2. **When ready:** migrate to production stack.

## Target architecture (post-migration)

```
┌──────────────┐          ┌──────────────┐
│  SwiftUI app │          │  React web   │
│   (iPhone)   │          │  (Next.js on │
│              │          │   Vercel)    │
└──────┬───────┘          └──────┬───────┘
       │                         │
       └──────────┬──────────────┘
                  ▼
         ┌─────────────────┐
         │    Supabase     │  ← source of truth
         │ Postgres + Auth │
         └────────┬────────┘
                  │
                  ▼ (periodic export from iOS)
         ┌─────────────────┐
         │  iCloud vault   │  ← materialized markdown mirror
         │  (markdown)     │     for the Second Brain
         └─────────────────┘
```

- **SwiftUI (iPhone)** — primary daily interface
- **Next.js on Vercel** — web companion, same data
- **Supabase Postgres** — single source of truth for goals, logs, insights
- **Supabase Auth** — Sign in with Apple
- **Vercel serverless functions** — LLM proxy (keeps API keys off-device)
- **iCloud Drive Obsidian vault** — one-way export from iOS, feeds the user's Second Brain LLM knowledge base

**Why Obsidian is not the source of truth:** web needs to read data too, and browsers cannot access iCloud. Two-way sync between markdown and Postgres is a conflict-resolution nightmare. Obsidian becomes an *output* of the app, not an *input*.

## Ground rules for localhost development

Everything built now should survive migration. Two invariants:

1. **`src/data/store.js` is the ONLY file that knows where data lives.** Keep the API surface stable: `listGoals`, `getGoal`, `saveGoal`, `readLog`, `readLogsInRange`, `appendLog`, `deleteLogEvent`. When Supabase replaces the vault middleware, one file changes; every screen keeps working.

2. **Business logic stays pure JS.** No DOM, no Node APIs, no browser-only globals. Files that must remain portable to Swift:
   - `src/data/adherence.js`
   - `src/data/insights.js`
   - `src/data/rounds.js`
   - `src/data/goalCodec.js`
   - `src/data/logCodec.js`
   - `src/data/goalTypes/*.js`

   These port structurally to Swift because they are math + string manipulation.

## Build freely

Anything visual, philosophical, or logic-only:

- Balboa breakdown refinement (prompts, flow, LLM chaining)
- Insight logic + new flavors
- Goal state controls (pause / wake / retire / complete + ceremonies)
- Habits, projects, sub-targets
- Design polish, tokens, motion
- Retro ceremonies, weekly reviews
- New goal types beyond simple / wake / cadence
- Onboarding variants
- Copy and voice work

## Avoid building

Features whose implementation strategy won't survive migration:

- Anything that scans the local filesystem outside `vault/`
- Node-only APIs (`child_process`, `worker_threads`, `fs.watch`) in server middleware
- Long-running background jobs in the Vite dev server — anything cron-like will need to move to a Vercel scheduled function later
- Features that assume the LLM proxy lives inline with the app (design LLM calls as if they already hit a remote serverless endpoint — they use `fetch("/api/llm", ...)` today; that URL just moves to Vercel in production)
- Any UI trick that relies on how Vite dev-server serves modules (no reliance on HMR side-effects, no `?raw` / `?url` imports for anything the client will need in production)

## What migration will actually cost

**Rewrites (structural):**
- All React screen components → SwiftUI views (for iOS) + reused/refactored React (for web)
- Vite + Node dev middleware → Vercel serverless functions + Supabase client
- `vaultMiddleware.js` → deleted; SwiftUI reads/writes Postgres directly
- JavaScript → TypeScript (do this as part of the Next.js rewrite, not before — see below)

**Ports (mechanical):**
- Design tokens → Swift `Color` / `Font` values
- Vault schema → Postgres schema (flat tables mirroring current front-matter + rounds + indicators)
- goalCodec / logCodec grammar → Swift structs + parsers (grammar unchanged)
- adherence / momentum / insights math → Swift, same algorithms

**TypeScript migration (do with step 3, not separately):**

Add TypeScript at the same time as the React → Next.js rewrite. Doing it earlier is churn; doing it later means typing an already-migrated codebase twice.

Priority order for types:

1. **`store.js` first** — Supabase SDK ships row types via `Database['public']['Tables']`. Wire these up before typing anything else; every screen's data shape flows from here.
2. **`src/data/*.js` business logic** — `adherence.js`, `rounds.js`, `insights.js`, `goalTypes/*.js` are pure functions; they type cleanly and the types will match what Swift gets later.
3. **`src/tokens.js`** — type `CATS`, `PAPER`, `FONT` as `const` objects so components get literal types for category keys and color strings.
4. **Components last** — prop interfaces for screens and components are mechanical once the data types exist.

What to keep clean *now* so TS migration is cheap:
- Never use `any`-shaped objects across module boundaries (already mostly true)
- Keep `store.js` API surface stable: `listGoals(): Goal[]`, `appendLog(date, entry): void` — these are the function signatures to type first
- Avoid dynamic property access (`obj[key]`) in business logic — it requires index signatures

**Survives verbatim:**
- Philosophy docs
- Brand rules
- UI spec
- All product decisions and copy

## Rough sequence when migration starts

1. Design Supabase schema. Mirror current vault shape: `goals`, `logs`, `events`, `insights_dismissed`.
2. Vercel + LLM proxy first (smallest scope, needed by both frontends).
3. Rewrite React web as Next.js on Vercel, backed by Supabase — **add TypeScript here** (Supabase SDK provides row types; wire them through `store.ts` first, then components).
4. SwiftUI app reading same Supabase.
5. iOS export writer: reads Supabase → writes markdown to iCloud Drive on a schedule.
6. Apple Developer Program ($99/yr ≈ ₹8,300) only when ready for TestFlight or App Store.

## The Second Brain integration

Motivation: user runs a separate project (a Karpathy-style personal LLM knowledge base — "the second brain"). Becoming data becomes essential context for it.

Integration = the iCloud vault export. Whenever iOS pushes markdown to the vault, the Second Brain re-indexes and Becoming's goal state + logs become queryable knowledge. Vault is generated output; Second Brain treats it as a live snapshot.

## What to re-read when migration starts

- `docs/philosophy.md` — the spec, unchanged across migrations
- `docs/brand.md` — visual + psychological rules, port to SwiftUI verbatim
- `docs/ui-spec.md` — screen-by-screen anatomy, port to SwiftUI verbatim
- `docs/architecture.md` — data model, translates to Postgres schema
- `docs/obsidian-backend.md` — the vault schema that becomes the iCloud export format
- This doc.
