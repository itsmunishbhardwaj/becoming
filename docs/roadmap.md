# Roadmap

## Done (prototype)

- [x] Home screen — opens into Life; goals, momentum orbs, AI question card
- [x] Year calendar — translucent overlapping circles, pastel, seasons baked in
- [x] Seasons in UI — dormant (🌙, no decay) vs drift (gentle)
- [x] Questions-over-declarations insight card (confirm/reject)
- [x] Design tokens + shared mock data + routing
- [x] **Origin obligations, first pass** (docs/origin-spreadsheets.md):
  accumulation headlines on goal cards (earned count, never %); ambition /
  reward / retro fields stored verbatim in the user's voice; period
  sub-targets (T1–T4 reborn); completed goal with Result-column retrospective;
  habits render "days kept", avoid-polarity without shame; drift surfaced as
  one gentle question with equal-weight answers (the standing-0% killer)
- [x] **Tap-to-mark year calendar** — the spreadsheet gesture, one tap: pick a
  goal's colour, tap the days you moved it, the day is blobbed. Persisted in
  localStorage; per-goal focus dims everything else; accumulation line only
  ("N days marked"), never a deficit. Synthetic demo year kept behind an
  "example" toggle. (Mock goals are placeholder personas — real goals arrive
  with goal CRUD, below.)

## v1 — make it a real app

Build order and acceptance criteria: **`docs/ui-spec.md` §7–8.**

- [ ] **Theme unification** — `Home.jsx` still renders the retired night theme.
  Migrate to `PAPER` (`#FBFBF9`) per ui-spec §2, then delete the
  `NIGHT = PAPER` alias in `src/tokens.js`.
- [ ] **Goal workspace** route `/goal/:id` per ui-spec §4 (ambition, period
  chip, projects, habit strips as days kept, recent activity)
- [ ] **Log sheet** per ui-spec §5 — stub the parser, LLM later

- [ ] **Obsidian vault backend** (see `docs/obsidian-backend.md`) — extract
  `store.js` interface → vault conventions + starter Base → read-only
  vaultStore via Local REST API plugin → writes (marks, state changes,
  retro) → migrate localStorage marks. Goals become the user's real goals,
  written in their own vault, in their own voice.

- [ ] **Zoom transition** (highest risk — do first). Year → month → day → activities as continuous morph, not routed pages. Circles grow into day cells grow into activity labels. Prototype the animation before anything else; it's the core UX claim and the thing most likely to be impossible cheaply.
- [ ] Goal workspace page (mission, why, projects, timeline, journal, insights)
- [ ] Month view (days expand, activities become legible)
- [ ] Natural-language logging box → parse → activities (can stub the LLM first)
- [ ] Goal state controls (pause → dormant with note; wake; retire). Retire/complete must prompt the one-line **Result** reflection (origin oblig. 3) and resurface the stored reward
- [ ] **Period target check-ins** — when a stretch (T1…T4 or custom span) ends, one gentle question comparing target to marks; never a standing progress bar against the period
- [ ] **Habits** — binary daily yes/no per goal, tallied X/365 + streak + year strip. "do" and "avoid" polarity. Distinct from Projects and Activities (see architecture.md). One-tap daily check; back-fill from activities where possible.

## v2 — the deeper bets (deferred from earlier critique)

- [ ] **Split goal kinds**: achievement (progress %) vs practice (streak/momentum). Model + UI.
- [ ] **Passive capture as core**: Google Calendar, GitHub, Apple Health write activities directly. Manual log becomes supplement, not the whole loop.
- [ ] Inference confidence + correction loop (auto-mapping will misfire)
- [ ] Anti-guilt design pass for bad weeks / anxious users (the home screen is a daily judgment surface — handle the shame spiral deliberately)
- [ ] Insight confidence thresholds (small-n correlations are mostly spurious)
- [ ] Goal evolution/archival (goals change; "permanent" needs an exit story)

## Later (philosophy "Future Capabilities")

Voice logging · weekly/yearly AI reviews · goal forecasting · agentic planning · habit detection · burnout prediction · travel/photo memories. All build on the same graph.

## Guardrail

Every item still answers the north star: *does this help the user understand who they're becoming?* If it's just another tracker feature, it doesn't belong.
