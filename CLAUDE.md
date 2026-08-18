# CLAUDE.md — Becoming (working title was Life OS)

Read this first. Then `docs/philosophy.md`. The philosophy is the spec; this file is how to work in the repo.

`docs/origin-spreadsheets.md` is the empirical ground truth — the two real spreadsheets (2024 manual + 2025 purchased) this app descends from, what worked, and the failure modes Becoming must not repeat. Consult it when a product decision is ambiguous.

**Brand + psychology rules live in `docs/brand.md` — read it before touching any UI.** App name: **Becoming**. One paper theme, no red, accumulation framing, irregular shapes, paper grain. The refined reference prototype is `docs/prototype-full.jsx`.

**`docs/ui-spec.md` is the build spec** — screen-by-screen anatomy with exact values, component contracts, build order, and a definition of done. It's codified from the Figma file [Becoming — UI/UX](https://www.figma.com/design/97VazqojfNOspymPEF0uc1). Read it before implementing any screen; `src/tokens.js` wins on any disagreement.

## What this is

A visual **operating system for a life** — organized by purpose, not time. Not a calendar app, habit tracker, task manager, or journal. The calendar is one *visualization*, never the primary interface.

North star for every decision: **"Does this help the user understand who they are becoming?"** If no, cut it.

## Non-negotiables (from philosophy)

- **Goals are the primary object.** Life → Identity → Goals → Projects → Activities → Calendar. Everything supports goals.
- **Opens into Life, not a calendar.** Home = goals + momentum. Calendar is demoted.
- **Seasons.** Goal states: active / drift / dormant / completed / retired. Dormant = intentional pause: no decay, no warnings, history preserved. Distinguish *drift* (unintentional — surface gently) from *dormancy* (intentional — respect silently). Never guilt the user.
- **Questions over declarations.** AI states facts plainly ("12 days since last startup activity"); frames inferred patterns as questions. Confirmed → joins graph. Rejected → discarded.
- **Zoom like Google Maps, not page-switching.** Life → years → months → weeks → days → activities → journal, smooth morph. (Currently routed pages — see roadmap; this is the hard part.)
- **AI-first capture.** Natural language in → AI extracts activities/projects/goals/people/duration. No form-filling.

## Stack

Vite + React 18 + react-router-dom. Inline styles + design tokens (no Tailwind, no CSS framework). Keep it that way unless there's a strong reason.

## Rules for this repo

1. **Tokens are law.** All colors/fonts/states live in `src/tokens.js`. Never hardcode a hex or redeclare a category color in a component. Category color = identity; it must be identical on home and calendar.
2. **Pastel palette only.** See `docs/design-system.md`.
3. **Shared data** lives in `src/data/mockLife.js`. Home and calendar read the same source.
4. **Respect `prefers-reduced-motion`.** Orbs breathe; motion must be disableable.
5. **No guilt UI.** Before adding any "you missed / you're behind / streak broken" element, re-read Seasons. Drift is gentle, dormancy is silent.
6. **Insights are questions.** Any AI-surfaced pattern is a question with confirm/reject, not a declared fact.

## Layout

```
src/
  tokens.js              design tokens — single source of truth
  data/mockLife.js       shared synthetic data (goals + year builder w/ seasons)
  components/
    Orb.jsx              breathing momentum orb
    MomentumBar.jsx
    GoalCard.jsx         expandable goal card
    InsightCard.jsx      AI question (confirm/reject)
  screens/
    Home.jsx             opens into Life
    Year.jsx             calendar as history — translucent circles
  App.jsx                router
  main.jsx
docs/
  philosophy.md          THE SPEC
  design-system.md       palette, type, motion, components
  architecture.md        data model + graph direction
  obsidian-backend.md    persistence plan — vault as database, Bases as tables
  roadmap.md             v1 done / v2 backlog
```

## Run

```
npm install
npm run dev
```

## Where to go next

See `docs/roadmap.md`. Highest-risk item = the Google-Maps zoom transition. Prototype that before building more CRUD.

---

## Git Workflow (enforced — do not bypass)

**Model: GitHub Flow.** One `main` branch. All work on short-lived feature branches. No staging branch.

### Rules (enforced by branch protection + CI)

- **Never push directly to `main`.** Branch protection blocks it — even for admins.
- **Every change → feature branch → PR → CI green → merge.**
- **CI must pass before merge**: `bun run test` (154+ tests) + `bun run build`. Defined in `.github/workflows/ci.yml`, job name `Test & Build`.
- **No `--no-verify`, no `--force` to main, no amending published commits.**

### Branch naming

```
feat/<short-slug>       new feature
fix/<short-slug>        bug fix
chore/<short-slug>      tooling, deps, docs
```

### PR titles (Conventional Commits)

```
feat: add X
fix: resolve Y
chore: upgrade Z
docs: update W
refactor: simplify V
```

### Flow

```
git checkout -b feat/my-thing
# ...work, commit...
git push -u origin feat/my-thing
gh pr create --title "feat: my thing" --body "..."
# CI runs automatically → green → merge via GitHub UI
```

### Why no staging branch

A staging *branch* creates merge hell with no quality benefit. Quality comes from CI (automated) and Vercel preview URLs (visual). Every PR already gets a Vercel preview — that IS staging. Once CI passes + you've eyeballed the preview → merge to main → Vercel deploys production.
