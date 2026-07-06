# Roadmap

## Done (prototype)

- [x] Home screen — opens into Life; goals, momentum orbs, AI question card
- [x] Year calendar — translucent overlapping circles, pastel, seasons baked in
- [x] Seasons in UI — dormant (🌙, no decay) vs drift (gentle)
- [x] Questions-over-declarations insight card (confirm/reject)
- [x] Design tokens + shared mock data + routing

## v1 — make it a real app

- [ ] **Zoom transition** (highest risk — do first). Year → month → day → activities as continuous morph, not routed pages. Circles grow into day cells grow into activity labels. Prototype the animation before anything else; it's the core UX claim and the thing most likely to be impossible cheaply.
- [ ] Goal workspace page (mission, why, projects, timeline, journal, insights)
- [ ] Month view (days expand, activities become legible)
- [ ] Natural-language logging box → parse → activities (can stub the LLM first)
- [ ] Goal state controls (pause → dormant with note; wake; retire)
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
