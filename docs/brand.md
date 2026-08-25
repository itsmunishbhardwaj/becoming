# Brand — Becoming

## Name

**Becoming.** The app answers one question: *who are you becoming?* The name is the north star. Working title "Life OS" retired.

## Logo

An **open, irregular circle** — hand-drawn, unclosed. An unfinished circle = a self still in progress. Stroke is a gradient across three category pastels (rose → lavender → sage). Inspired by ensō, deliberately imperfect.

SVG lives in the prototype (`Logo` component). Never close the circle. Never make it geometric.

## Psychology-driven rules (each visual choice has a stated purpose)

1. **Paper texture everywhere** (Painter Press). SVG `feTurbulence` grain at 5% opacity over warm bone `#F5F2EA`. Matte finish kills glare and the strain of high-contrast flat UI. No pure white. No pure black — ink is `#55505C`.
2. **One light paper theme** end-to-end. Theme-switching between screens raises arousal; coherence calms.
3. **No red anywhere.** Red triggers threat response. Drift = warm sand `#B9A87F` whisper ("quiet lately"). Dormant = 🌙 + reduced opacity, phrased "resting since", never "inactive".
4. **Accumulation framing, never deficit.** Habits read "214 days kept", never "151 missed". Habit-strip misses are near-invisible (`#EDE9DE` on paper) — hits are the picture; failure is not monumentalized.
5. **Irregular shapes.** Orbs are morphing blobs (7s cycle — alive, organic). Cards use asymmetric corner radii. Day dots are rotated ellipses. A life is not a rectangle; softness reads as non-clinical, non-judgmental.
6. **One primary action per screen**: the + log blob. Everything else is quiet navigation. Choice overload is the enemy of daily return.
7. **Equal-weight yes/no on AI questions.** "Not really" is styled identically in prominence to "Yes". No dark patterns; rejecting the AI must cost nothing.
8. **Empty days are dignified.** "A quiet day. Rest counts too." — never blank shame.
9. **Serif (Fraunces) = identity** (goal names, the question). **Sans (Inter) = data.** The hierarchy tells the user what matters: who they're becoming, not the numbers.
10. **Motion is meaning.** Only living things breathe (active orbs, the + button). Dormant orbs are still. `prefers-reduced-motion` respected.

## Palette (muted pastel on paper)

Codified in `src/tokens.js` and realized in the Figma file
**[Becoming — UI/UX](https://www.figma.com/design/97VazqojfNOspymPEF0uc1)**.
Per-screen anatomy: `docs/ui-spec.md`.

| Token | Hex | Use |
|---|---|---|
| bg | `#F3EDE2` | base background — warm cream (deanira/bodega palette) |
| card | `#FAF6EE` | surfaces, held apart by hairline + shadow |
| line | `#DDD4C0` | hairlines |
| panel | `#EBE3D2` | recessed panels |
| ink | `#35303C` | text — deep warm charcoal |
| dim | `#7A7485` | secondary |
| faint | `#ACA5B4` | tertiary, empty-day dots |
| whisper | `#B9A87F` | drift only |
| track | `#E2D9C6` | progress troughs |
| miss | `#E8DFD0` | habit-strip misses — near-invisible on purpose |
| AI | `#A8BEE8` | category |
| Career | `#E8A8BA` | category — hue shifted to H=344° (rose-pink, not red-adjacent) |
| Health | `#98C9AE` | category |
| Relationships | `#EBC3A0` | category |
| Reading | `#BBA8E0` | category |
| Creativity | `#DDB84E` | category — amber-gold; was `#E5D6A3` which was invisible on track trough |
| Finance | `#7FC8C4` | category |

Note: the base was warmed to eggshell during design review and rejected —
`#FBFBF9` won because it lets the pastels be the only colour on the page.

Category color = identity, identical across orb, bar, habit strip, calendar dot.
