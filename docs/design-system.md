# Design System

Feel: calm, premium, spacious. References: Apple Health, Arc, Linear, Google Maps. Avoid dense dashboards, tables, spreadsheet UI.

## Pastel palette (category = identity, consistent everywhere)

| Category      | Color     | Swatch name |
|---------------|-----------|-------------|
| AI            | `#A9C4F5` | periwinkle  |
| Career        | `#F2AFB4` | dusty rose  |
| Health        | `#A8DAC0` | sage        |
| Relationships | `#F5C6A0` | peach       |
| Reading       | `#C9B8F0` | lavender    |
| Creativity    | `#F3E1A0` | butter      |

Category color is fixed identity. Same hue for a goal's orb (home), its momentum bar, and its day-circles (calendar). Never reassign.

## Surfaces

Two themes, one system:

- **Night** (home): deep indigo `#0E1220`, radial glow to `#1A2140`. Text `#E8EAF2`, dim `#8A90A8`, faint `#565D75`. Cards = 3.5% white on subtle border.
- **Paper** (calendar): warm off-white `#FBFAF6`, ink `#4A4658`, dim `#9A96A8`, faint `#C7C3D2`. Panel `#F4F2FA`.

Home is night so glowing orbs read as momentum. Calendar is paper so pastel circles read as history at a glance.

## Type

- **Fraunces** (serif) — identity: goal names, headlines, the north-star question. Weight 500.
- **Inter** (sans) — everything else: data, labels, UI. Weights 400/500.
- Numbers use `font-variant-numeric: tabular-nums`.

## Motion

Nothing appears suddenly; things morph. All motion gated behind `prefers-reduced-motion`.

**Orb breathe** (`orb-breathe`, 11s linear infinite): mimics human breathing — inhale ~3s (scale 1→1.17, border-radius morphs), hold ~1s, exhale ~6s, rest ~1s. Irregular blob shape throughout. Dormant orbs are still.

**Calendar blob entry** (`blob-surface`, 560ms ease-out): new blobs surface from scale 0.84 to 1.0 with opacity fade-in when a day is tapped. No stagger; each blob enters independently. Faded-goal opacity is baked into the SVG path's `opacity` attribute, not the `<g>` wrapper, so the entry animation doesn't override it.

**"Becoming" intro** (Home, plays once per mount): original word rises from 36px below center (translateY) while an inverted blurred reflection simultaneously drops 24px downward — text and reflection split apart from the water surface between them. Hold, then mist exit: word drifts 22px upward and blurs to 16px, dissolving all at once. Background curtain fades over 0.55s. Total ~3.6s. Reduced motion: overlay hidden entirely.

Roadmap motion: year→month→day is a continuous zoom (circles grow into day cells into activity labels), not a page change.

## Core components

- **Orb** — breathing circle. Size + glow = momentum. Dormant = still, faded, no glow.
- **MomentumBar** — thin category-gradient fill. Dormant = flat translucent.
- **GoalCard** — orb + name + momentum/state + last activity; expands to projects.
- **InsightCard** — AI question, confirm/reject pills.
- **DayCell** (calendar) — SVG cluster of translucent overlapping circles. Radius = effort, color = category, no text.

## State visual language

| State     | Visual                                              |
|-----------|-----------------------------------------------------|
| active    | full color, breathing orb, momentum %               |
| drift     | normal, gentle amber "quiet lately" — no alarm      |
| dormant   | muted 72% opacity, still orb, 🌙 "Dormant since", quoted note, no bar |
| completed | (v2) filled/checked                                 |
| retired   | (v2) archived, out of main view                     |

Never render neglect as red/warning. Drift is a whisper; dormancy is silence.
