# Becoming — Live Roadmap

**The single source of truth for what needs doing, future plans, and thinking out loud.**

Updated: 2026-08-12. Update this file whenever a decision changes.

Related docs:
- `docs/philosophy.md` — the spec
- `docs/brand.md` — visual + psychological rules
- `docs/ui-spec.md` — screen-by-screen anatomy
- `docs/migration-strategy.md` — long-term stack (SwiftUI + Supabase); ground rules for what to build now
- `docs/origin-spreadsheets.md` — the two real spreadsheets Becoming descends from
- `docs/obsidian-backend.md` — vault schema (source of truth for the eventual iCloud export)

---

## Now

**Deploy to Vercel** (Path A — in progress). Public URL so iPhone works anywhere, not just same-WiFi. Also proves the LLM-middleware-as-serverless pattern for the future migration.

---

## Next up (near-term, in rough priority order)

- [ ] **Goal state controls** — pause / complete / retire / wake buttons on the Goal workspace. Today the seasons system is display-only; nothing writes `state: dormant` + `dormantNote`, `retro`, etc. Origin obligation #3 (Result reflection at completion). See `docs/superpowers/plans/phase-6-goal-lifecycle.md` for the deferred plan; pick it up when ready.
- [ ] **Balboa breakdown refinement** — the guided flow feels "extensive". Shorter, warmer, less like an interview. Fewer required turns; more skip-friendly defaults; LLM prompts polished with the new Groq/Llama model.
- [ ] **Home page enrichment** — "add more meaning and useful information" per user. Ideas: weekly summary strip, recent-momentum trend chart, next scheduled check-in, streak surfacing without shame.
- [ ] **Persistence hardening confirmed** — vault now lives in iCloud (`VAULT_ROOT`). Verify auto-sync works cross-device once the app is on a phone. Consider Obsidian Git plugin as an extra backup layer.

---

## Later (medium-term, ordered but flexible)

- [ ] **Quarterly / seasonal review ceremony** — end of a rounds cycle triggers a reflection: what worked, what didn't, want to soften the next round?
- [ ] **Habits year strip** — per-goal habits display on Goal workspace with days-kept + streak (per ui-spec §4). Needs `habits[]` field on the goal.
- [ ] **Projects section on Goal workspace** — earned-count per project, mini progress track (per ui-spec §4).
- [ ] **Weekly / yearly AI review** — the LLM reads recent logs and asks one gentle pattern question.
- [ ] **Insight confidence thresholds** — small-n correlations are mostly spurious; add a "don't surface if <N events" gate.
- [ ] **Anti-guilt pass for bad weeks** — the daily home surface is judgment-adjacent; handle the shame spiral deliberately.

---

## Long-term (migration + platform)

- [ ] **Supabase schema design** — mirror current vault shape (`goals`, `logs`, `events`, `insights_dismissed`)
- [ ] **Vercel serverless LLM proxy** — first cloud dependency, minimal scope (may land as part of Path A above)
- [ ] **Next.js port of the web app** — same React thinking, deployable to Vercel, backed by Supabase instead of Vite middleware
- [ ] **SwiftUI iPhone app** — primary daily interface
- [ ] **iCloud vault export from iOS** — Supabase → markdown → Obsidian for the Second Brain
- [ ] **Apple Developer Program** ($99/yr ≈ ₹8,300) — only when ready for TestFlight or App Store

Full detail in `docs/migration-strategy.md`.

---

## Thinking out loud (not decided, not committed)

Random ideas, half-thoughts, discussions to revisit. Move to "Now" / "Next up" / "Later" once a decision is made.

- Zoom transition (year → month → day continuous morph) is philosophically the core UX claim from `docs/roadmap.md`. Highest risk. Prototype in isolation before committing.
- Passive capture (Google Calendar, GitHub, Apple Health → activities) — the biggest UX unlock, but requires OAuth flows and platform integrations. Post-migration only.
- Voice logging — Whisper on-device, one tap to log. Perfect for iPhone. Post-SwiftUI.
- Split goal kinds explicitly (achievement % vs practice streak) — currently the app conflates them via the `simple` type.
- Onboarding: first-run experience for a brand-new user with zero goals. Right now the empty state is a single card; could be richer.

---

## Recently shipped (for context)

Chronological, most recent first. Truncate when this list passes ~20 entries.

- **2026-08-12** — Vault moved to iCloud Drive (`VAULT_ROOT` env var); persistent across code changes; agent memory rule added so vault files are never deleted without permission (PR #12)
- **2026-08-12** — Year page full-width layout, 4 quarters × 3 months, larger typography (PR #11 → merged)
- **2026-08-12** — PWA install: manifest + icons + iOS Add-to-Home-Screen meta (PR #11 → merged)
- **2026-08-12** — Home intro animation ("Becoming" fades in/out) (PR #9 → merged)
- **2026-08-12** — Simple goal type: dropped the wake/cadence type binary in QuickCreate; goals are name+category, every day is a tap (PR #9 → merged)
- **2026-08-11** — QuickCreate route: bypass Balboa breakdown for users who already know their goal (PR #8 → merged)
- **2026-08-11** — Day detail page (`/day/:date`): double-click Year cell to see all events, per-event delete, per-goal quick-add (PR #8 → merged)
- **2026-08-11** — Year: tap-again unmarks; log-presence-based (not adherence-status-based) so future status renames don't break it (PR #8 → merged)
- **2026-08-11** — Omniroute LLM gateway wired via existing `/api/llm` middleware (`stream: false` fix for Groq)
- **2026-08-11** — Phase 5 polish landed (tokens migration, log delete API, real momentum, indicator-echo insights, misc cleanups) (PR #5 → merged)

---

## How to use this file

- One person edits it at a time. Never let two branches modify it in parallel — merge conflicts on a roadmap are silly.
- When a decision changes, edit the doc first, then start the work.
- "Recently shipped" is prose, not a changelog. Keep entries scannable.
- If a section grows past a screen, refactor it into a companion doc.
- No dates on future work — dates are commitments and this list is possibilities.
