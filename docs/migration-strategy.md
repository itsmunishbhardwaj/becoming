# Migration Strategy — localhost React → SwiftUI + Angular Web + Supabase

**Status:** Planned. Migration begins only after the localhost React prototype feels like a solid product.

**Date locked:** 2026-08-11. **Web stack updated:** 2026-11-17 (React/Next.js → Angular + Angular Material; TypeScript migration dropped, TS comes free with Angular).

---

## The plan

1. **Now → until product feels solid:** keep iterating on the localhost React app (Vite + Node dev middleware + local `vault/` folder). Fast iteration, cheap mistakes, no rewrite tax until worth it.
2. **When ready:** migrate to production stack.

## Target architecture (post-migration)

```
┌──────────────┐          ┌────────────────────┐
│  SwiftUI app │          │   Angular web      │
│   (iPhone)   │          │ (Angular Material  │
│              │          │   on Vercel)       │
└──────┬───────┘          └──────────┬─────────┘
       │                             │
       └──────────┬──────────────────┘
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
- **Angular + Angular Material on Vercel** — web companion, same data
- **Supabase Postgres** — single source of truth for goals, logs, insights
- **Supabase Auth** — Sign in with Apple
- **Vercel serverless functions** — LLM proxy (keeps API keys off-device)
- **iCloud Drive Obsidian vault** — one-way export from iOS, feeds the user's Second Brain LLM knowledge base

**Why Obsidian is not the source of truth:** web needs to read data too, and browsers cannot access iCloud. Two-way sync between markdown and Postgres is a conflict-resolution nightmare. Obsidian becomes an *output* of the app, not an *input*.

## Ground rules for localhost development

Everything built now should survive migration. Two invariants:

1. **`src/data/store.js` is the ONLY file that knows where data lives.** Keep the API surface stable: `listGoals`, `getGoal`, `saveGoal`, `readLog`, `readLogsInRange`, `appendLog`, `deleteLogEvent`. When Supabase replaces the vault middleware, one file changes; every screen keeps working. In Angular this becomes an `@Injectable` `StoreService` with the same method signatures.

2. **Business logic stays pure JS.** No DOM, no Node APIs, no browser-only globals. Files that must remain portable to Swift AND to Angular (TypeScript):
   - `src/data/adherence.js`
   - `src/data/insights.js`
   - `src/data/rounds.js`
   - `src/data/goalCodec.js`
   - `src/data/logCodec.js`
   - `src/data/goalTypes/*.js`

   These port structurally to Swift because they are math + string manipulation. They port to TypeScript trivially (rename `.js` → `.ts`, add type annotations).

## Build freely

Anything visual, philosophical, or logic-only:

- Coach Carter breakdown refinement (prompts, flow, LLM chaining)
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
- Features that assume the LLM proxy lives inline with the app (design LLM calls as if they already hit a remote serverless endpoint — they use `fetch("/api/llm", ...)` today; that URL just moves to Vercel in production, called from Angular via `HttpClient` identically)
- Any UI trick that relies on how Vite dev-server serves modules (no reliance on HMR side-effects, no `?raw` / `?url` imports for anything the client will need in production)
- Framer-motion / lenis animation tricks that don't translate to `@angular/animations` — prefer CSS transitions and keyframes which port cleanly

## What migration will actually cost

**Rewrites (structural):**
- All React screen components → SwiftUI views (for iOS) + Angular standalone components (for web)
- Vite + Node dev middleware → Vercel serverless functions + Supabase client
- `vaultMiddleware.js` → deleted; SwiftUI and Angular both read/write Postgres directly
- React hooks (`useState`, `useMemo`, `useEffect`) → Angular Signals (`signal`, `computed`, `effect`)
- React Router → Angular Router
- Inline styles + `tokens.js` → SCSS theme + Material custom palette
- `motion` + `lenis` → `@angular/animations` + CDK scrolling
- Custom nav shell / sidebar / sheets → Material components (`MatSidenav`, `MatBottomSheet`, `MatDialog`, `MatMenu`)

**Ports (mechanical):**
- Design tokens → Swift `Color` / `Font` values AND Angular SCSS vars + custom Material palette
- Vault schema → Postgres schema (flat tables mirroring current front-matter + rounds + indicators)
- goalCodec / logCodec grammar → Swift structs + parsers AND TypeScript types (grammar unchanged)
- adherence / momentum / insights math → Swift AND TypeScript, same algorithms
- All `*.test.js` → `*.spec.ts` under Vitest (via `@analogjs/vitest-angular`) for the web app

**TypeScript migration — subsumed into Angular rewrite:**

No separate TS migration step. Angular projects are TypeScript-native; the `.js → .ts` conversion happens as files move into the Angular app. No "type the existing React codebase, then migrate" two-step. Priority order for types inside the Angular app:

1. **`StoreService` first** — Supabase SDK ships row types via `Database['public']['Tables']`. Wire these up before typing anything else; every screen's data shape flows from here.
2. **`src/app/core/*.ts` business logic** — `adherence`, `rounds`, `insights`, `goalTypes/*` port 1:1 from the existing JS; they type cleanly and the types match what Swift gets later.
3. **`tokens` → SCSS + Material palette** — category colors become a Material color map so chips/buttons pick up the right accent automatically.
4. **Components last** — Angular component inputs (`@Input()` or `input()` signal inputs) are mechanical once the data types exist.

What to keep clean *now* so the Angular port is cheap:
- Never use untyped bags of properties across module boundaries (already mostly true)
- Keep `store.js` API surface stable: `listGoals(): Goal[]`, `appendLog(date, entry): void` — these are the method signatures the `StoreService` will expose
- Avoid dynamic property access (`obj[key]`) in business logic — requires index signatures in TS
- Prefer CSS animations / transitions over imperative JS motion — they port straight to Angular; `@angular/animations` triggers wrap the same keyframes

**Survives verbatim:**
- Philosophy docs
- Brand rules
- UI spec
- All product decisions and copy
- SwiftUI plan — unchanged by the web stack switch
- iCloud vault export + Second Brain integration — unchanged; still owned by the iOS app

## Rough sequence when migration starts

All Angular work happens on a **feature branch** (`feat/angular-migration`) inside this repo. No separate repository. The branch replaces the React root when merged.

**CI runs on every PR and push** via GitHub Actions (`.github/workflows/ci.yml`). Gate: `ng test --watch=false` + `ng build --configuration=production` must both pass before any merge to `main`. Vercel automatically deploys a preview URL per branch — that IS the staging environment.

1. Design Supabase schema. Mirror current vault shape: `goals`, `logs`, `events`, `insights_dismissed`.
2. Vercel + LLM proxy first (smallest scope, needed by both frontends).
3. Rewrite React web as **Angular + Angular Material** on Vercel, backed by Supabase. TypeScript is default. Phases, each as its own PR off `feat/angular-migration`:
   - 3a. ✅ Scaffold Angular app, add Material, port `tokens.js` to SCSS + custom Material palette, update CI to Angular toolchain.
   - 3b. Port `src/data/*` + `src/lib/*` + `src/onboard/*` to `src/app/core/*.ts` (rename, add types, port tests as `.spec.ts`).
   - 3c. Build `StoreService`, `AuthService`, `SupabaseService`, `LlmService` with same method signatures as current modules.
   - 3d. Build leaf components (Orb, Blob, GoalCard, InsightCard, TimeGrid, ColorWheel) as Angular standalone components.
   - 3e. Build `NavShell` with `MatSidenav` (gets GCal-style animation for free).
   - 3f. Port screens in order: SignIn → Home → Goal → QuickCreate → Day → Week → Month → Year → Journal → Insights → Todo → Onboard → CoachCarter.
4. SwiftUI app reading same Supabase.
5. iOS export writer: reads Supabase → writes markdown to iCloud Drive on a schedule.
6. Apple Developer Program ($99/yr ≈ ₹8,300) only when ready for TestFlight or App Store.

## The Second Brain integration

Motivation: user runs a separate project (a Karpathy-style personal LLM knowledge base — "the second brain"). Becoming data becomes essential context for it.

Integration = the iCloud vault export. Whenever iOS pushes markdown to the vault, the Second Brain re-indexes and Becoming's goal state + logs become queryable knowledge. Vault is generated output; Second Brain treats it as a live snapshot.

**Unaffected by the Angular web switch.** The export writer lives on iOS (SwiftUI app) because only iOS can write to iCloud Drive. Angular web is a reader/writer against Supabase, same as before. If we ever want a web-triggered export, it becomes a Vercel scheduled function that writes to a cloud bucket — but that's a future extension, not a migration prerequisite.

## What to re-read when migration starts

- `docs/philosophy.md` — the spec, unchanged across migrations
- `docs/brand.md` — visual + psychological rules, port to SwiftUI AND to the Angular Material custom theme verbatim (Material defaults must be overridden to express paper, not Material)
- `docs/ui-spec.md` — screen-by-screen anatomy, port to SwiftUI AND Angular verbatim
- `docs/architecture.md` — data model, translates to Postgres schema
- `docs/obsidian-backend.md` — the vault schema that becomes the iCloud export format
- This doc
- Angular docs: Signals, Standalone Components, Angular Material theming, `@angular/animations`
