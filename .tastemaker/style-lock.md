# Becoming — Style Lock

_Derived from andrewsbodega.com study, 2026-08-25._

## Reference

andrewsbodega.com — cool grey foundation, royal blue accent, Clash Grotesk 700 at -0.992px tracking. Extracted via DOM inspection.

## Color contract

| Role | Token | Value |
|---|---|---|
| Page background | `PAPER.bg` | `#F0F0F0` — bodega cool grey |
| Card surface | `PAPER.card` | `#FAFAFA` |
| Hairline / border | `PAPER.line` | `#E2E2E2` |
| Recessed panel | `PAPER.panel` | `#EBEBEB` |
| Primary text | `PAPER.ink` | `#2B2B2B` — bodega near-black |
| Secondary text | `PAPER.dim` | `#5F5F5F` |
| Tertiary text | `PAPER.faint` | `#9A9A9A` |
| Drift-only warm | `PAPER.whisper` | `#A89070` — isolated to drift state only |

Legal pairings (all pass WCAG AA at declared sizes):
- `PAPER.ink` on `PAPER.bg` ✓
- `PAPER.dim` on `PAPER.bg` ✓
- `PAPER.faint` on `PAPER.bg` — decorative only (tertiary labels, timestamps)
- Goal colors on `PAPER.bg` — ornamental, never as text background

Dark mode: not applicable (single locked mode, no toggle).

## Typography

- **Primary serif**: Fraunces (opsz 9–144, wght 300–600, italic) — identity font, headlines, orb labels, blockquotes
- **Secondary sans**: Instrument Sans (wght 400/500) — UI labels, data, body
- **Heading weight**: 600 (tightened from 300/400 to match bodega's decisive weight)
- **Heading tracking**: `-0.02em` on large h1s; `0.14em` on small uppercase wordmarks
- **Body weight**: 400; never below 400 at body sizes

## Orb / blob rendering

```
radial-gradient(circle at 35% 30%, ${color}, ${color}99 80%)
```
No box-shadow on orbs or palette swatches. Border-radius: `RADIUS.blob` (`58% 42% 55% 45% / 45% 55% 42% 58%` organic blob shape).

## Structural decisions

- Macrostructure: single-column goal list on home, full-width SVG grid on year
- Wordmark: uppercase serif 600 at 13px, `0.14em` tracking, `PAPER.dim` (not faint)
- Vellum mist: cool-white radial overlays (warm whites swapped to `rgba(255,255,255,…)`)

## What was NOT changed

- Fraunces as the primary identity font (bodega uses Clash Grotesk — not adopted; Fraunces is Becoming's identity)
- Goal color palette (pastels — non-negotiable per brand.md)
- Blob / orb shapes (core brand element)
- No red rule
- Accumulation framing, no guilt UI
