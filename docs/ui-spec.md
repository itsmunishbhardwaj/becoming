# UI Spec — Becoming

Build spec for the four screens designed in Figma:
**[Becoming — UI/UX](https://www.figma.com/design/97VazqojfNOspymPEF0uc1)**
(file key `97VazqojfNOspymPEF0uc1`, page "Becoming — Screens").

Read order for an agent picking this up cold: `CLAUDE.md` → `docs/philosophy.md`
→ `docs/brand.md` → this file. `docs/origin-spreadsheets.md` explains *why* the
numbers are framed the way they are; when a detail here seems fussy, that's
where the reason lives.

All values below are the source of truth **in code** via `src/tokens.js`. If a
value here and a value in `tokens.js` disagree, `tokens.js` wins and this doc
is stale — fix it.

---

## 0. Frames in the Figma file

| Frame | Node ID | Width | What it proves |
|---|---|---|---|
| Home — Life | `3:2` | 480 | Opens into goals; every season visible at once |
| Year — my year (tap to mark) | `6:2` | 760 | The spreadsheet ritual: pen + tap-to-blob |
| Goal workspace — Health | `8:2` | 480 | Ambition, period target, habits as days kept |
| Log — just write | `8:189` | 480 | One sentence in, routed activities out |

Widths are mockup widths, not breakpoints. Home/Goal/Log are a single column
(max ~560 in app); Year is wider (max ~720) because it holds 12 month grids.

---

## 1. Non-negotiable rules (violating these is a bug, not a preference)

1. **One paper theme.** Every screen `PAPER.bg` `#FBFBF9`. No dark screens.
2. **No red anywhere.** Drift is `PAPER.whisper` `#B9A87F`. That's the loudest
   signal the app owns.
3. **Accumulation, never deficit.** Every number is what was *earned*:
   "148 problems solved", "214 days kept", "16 days marked". Never a
   percentage-of-days, never a remainder, never a miss count. A percentage may
   appear only as a bar's *width*, never as a rendered figure.
4. **Category color = identity.** One hue per goal across orb, bar, strip,
   blob, chip. From `CATS` only.
5. **Serif = who you are. Sans = what you did.** Goal names, headlines, and
   ambitions in Fraunces; all numbers/labels in Inter.
6. **Irregular shapes.** Cards alternate `RADIUS.r1` / `RADIUS.r2`. Day marks
   are rotated ellipses. Orbs are blobs. Nothing is a plain rectangle.
7. **AI insights are questions with equal-weight answers.** Both buttons share
   one style. Rejecting must cost nothing visually.
8. **Empty is dignified.** Unmarked day = a 2px `PAPER.faint` dot at 50%.
   Empty day detail = "A quiet day. Rest counts too."
9. **Only living things move.** Active orbs and the + blob breathe (11s human-breathing pattern, scale 1→1.17, irregular blob morph); dormant orbs are still. Calendar blobs surface on tap (560ms ease-out, scale 0.84→1). "Becoming" intro plays on Home mount: water-puddle reveal with blurred reflection, mist exit. All motion behind `prefers-reduced-motion`.

---

## 2. Home — Life (`3:2`)

Vertical stack, 20px gap, 36/26/48/26 padding.

**Header** (9px gap)
- Logo row: unclosed gradient arc (rose → lavender → sage, 24px, 3.4 stroke,
  round caps, ~12° rotation) + "Becoming" in Fraunces SemiBold 19.
- Kicker: today's date, Inter Medium 11.5, uppercase, letterSpacing 1.8,
  `faint`.
- H1: "Who are you becoming?" — Fraunces Regular 28, `ink`.
- Sub: `{n} goals in motion · {n} resting · {n} became real` — Inter 14, `dim`.
  Omit any clause whose count is 0.

**Question card** — gradient `#EFEAF6 → #EDF1EA` at 135°, 1px `line`,
`RADIUS.r2`, 17/20 padding.
- Kicker (Inter Medium 11, uppercase, `dim`) — varies by question type
  ("A QUIET ONE" for drift, "A QUESTION FROM YOUR WEEK" for patterns).
- Body Inter 14.5, lineHeight 160%, `ink`.
- Two pills, **identical styling**: `card` fill, 1px `line`, radius 999,
  8/15 padding, Inter Medium 12.5 `ink`.

**Goal cards** — 12px gap, alternating `r1`/`r2`, `card` fill, 1px `line`,
17/19 padding, shadow `0 1px 3px rgba(85,80,92,0.05)`.

Anatomy per card:
```
[ orb 44×44 box ]  [ name (serif 17.5, wraps, FILLs) ][ headline (right, category color) ]
                   [ meta line — Inter 12.5 dim ]
[ momentum track — 4px, PAPER.track, category fill ]
```
- **Orb**: circle `15 + momentum*25` px, category fill, drop shadow
  `0 2px (8+momentum*14) category@33%`. Dormant/completed: no shadow,
  opacity 0.45, no animation.
- **Headline (right)**: `{n} {unit}` in category color, Inter Medium 12.
  - drift → same treatment (drift is not a demotion)
  - dormant → `🌙 resting since {month}` in `dim`
  - completed → `✓ became real · {month}` in category color
- **Meta line** by state:
  - active/drift: `{last} · {lastDetail}` + optional ` · {streak}` in `faint`
  - drift appends ` · quiet lately` in `whisper`
  - dormant/completed: the note or retro, italic, `faint`, in quotes
- **Momentum track** rendered for active + drift only. Never for dormant or
  completed — a finished thing doesn't need a progress bar.
- Card opacity 0.78 when dormant.

**Footer**: "Zoom out — see your year ↓", Inter 13, `dim`, centered.

**Log blob (FAB)**: 54px, absolute bottom-right (20/22 inset), gradient
lavender→sage 135°, shadow `0 6px 20px #C5B5E3@50%`, "+" in Inter 27 `bg`.
Morphs on the 7s cycle. Present on Home and Goal only.

---

## 3. Year — my year (`6:2`)

The 2024 spreadsheet's gesture, one tap. 18px gap, 36/28/44/28 padding.

**Header row** (space-between, align bottom)
- Left: kicker "2026 · A YEAR IN PROGRESS" + H1.
  H1 is mode-dependent: `my year` → "Your year, day by day";
  `example` → "Where a year can go".
- Right: mode toggle, two pills. Selected = `#FFFFFF` fill + 1px `line` +
  `ink`; unselected = no fill, `dim`.

**Pen chips** — wrapping row, 10px gap / 8px row gap. One chip per goal.
- Held (selected) chip: white fill, 1px `line`, dot at 0.9 opacity, label
  `ink`, and a trailing `· {n} days` count in `dim`.
- Unheld chips when a pen is held: dot 0.35 opacity, label `faint`.
- Dot is 13px, category color. **The chip is the pen** — selecting it both
  focuses the year and arms tapping.

**Guidance line** — Inter 13, `dim`. Exactly one of:
- pen held → `Tap the days you moved {goal} — tap again to unmark.`
- no pen, no marks → `Pick a goal's colour above, then tap the days you moved it. That's the whole ritual.`
- no pen, marks exist → `{n} days marked this year.`

**Ambition card** (only when a pen is held) — white fill, 1px `line`,
`RADIUS.r2`-ish, 12/16 padding: the goal's ambition in Fraunces Italic 13.5,
then ` — this stretch (T3): {target}` in Inter 13 `dim`.

**Month grid** — wrapping row, 22px column gap / 26px row gap, 3 across at
760 width. Each month: label (Inter Medium 11, uppercase, letterSpacing 1.2,
`dim`) + a 7-column day grid on an 18px pitch.

**Day cell** (15px, 18px pitch):
- No marks → 2px dot, `faint`, opacity 0.5. When a pen is held, the dot may
  grow to 2.8px to read as tappable.
- Marked → one rotated ellipse per goal. Focused goal: 5.6×4.6px, opacity
  0.85. Unfocused goals: ~4.6×3.8px at **opacity 0.15** — present, never
  erased. Rotation is stable per (day, index): `((d*37 + i*53) % 70) - 35`.
  Multiple marks offset ~2px around a small circle.
- Dormant month in `example` mode gets 🌙 next to its label.

**Footer** — accumulation only:
`{n} days of {goal} this year — every one of them yours. Other goals rest faintly behind.`

**Interaction contract**
- Tap with pen held → toggle that goal on that day. No pen → no write.
- Marks persist immediately (localStorage today, vault later — see
  `docs/obsidian-backend.md`).
- Hover/tap a marked day → tooltip pinned bottom-center: date + one row per
  goal marked.

---

## 4. Goal workspace (`8:2`)

20px gap, 32/26/44/26 padding.

- Back link "← Life", Inter 13, `dim`.
- Header: 48px orb box (orb 34px) + title (Fraunces 26) + meta
  `{n} {unit} · last worked {when}` (Inter 13, `dim`).
- **Ambition**: Fraunces Italic 16, lineHeight 150%, `ink`, in quotes. The
  user's own words, never normalized.
- **Period chip**: `card` fill, 1px `line`, 10/14 padding — kicker
  "THIS STRETCH (T3)" (Inter Medium 10.5, letterSpacing 1.3, `faint`) +
  target text (Inter 12.5, `dim`).
- **Projects**: section kicker (Inter Medium 11, uppercase, letterSpacing 1.6,
  `faint`), then per project: name left (Inter 13.5 `ink`), earned count right
  (`3 of 4 days this week`, Inter 13 `dim`), then a 4px track.
- **Habits · this year**: per habit — name (Inter 14 `ink`) left,
  `{hits} days kept · 🔥{streak}` (Inter Medium 12.5 `dim`) right, then a
  year strip of 6.5px cells (2.5px gap, irregular ~3px radii). Kept = category
  color; missed = `PAPER.miss` `#EDE9DE`. **Misses must remain barely
  perceptible.** Avoid-polarity habits read "clean days" and are otherwise
  identical — never inverted into a failure count.
- **Recent activity**: 7px category dot + text (Inter 13.5).
- Trailing pill: "See its year on the calendar →" — jumps to Year with this
  goal's pen already held.

---

## 5. Log sheet (`8:189`)

Bottom sheet: top radii 26/22, bottom 6/6, shadow `0 -10px 40px @15%`,
22/24/30/24 padding, 14px gap.

- 38×4 handle, `line`, centered.
- Kicker "LOG YOUR DAY — JUST WRITE".
- Textarea: `card` fill, 1px `line`, `RADIUS.r2`, 13/15 padding, Inter 14.5,
  lineHeight 155%.
- After parse: "Understood — no forms, no tags:" (Inter 12, `dim`), then one
  row per extracted activity — 10px category dot, label (Inter 13.5, FILLs),
  routing meta right (`4h → Build AI Startup`, Inter 11.5, `dim`). Rows
  alternate `r1`/`r2`.
- Confirm pill: `affirm` fill, `affirmLine` border, `affirmInk` text —
  "Looks right — save".

The parse target is the vault grammar in `docs/obsidian-backend.md` §3: each
row becomes one `- moved [[Goal]] — note` line in the daily note.

---

## 6. Component contracts (props an agent should implement to)

```
<Orb cat momentum still />                    still = dormant | completed
<MomentumBar cat momentum />                  omit entirely for still states
<GoalCard goal onOpen />                      goal shape: src/data/mockLife.js
<InsightCard question onAnswer />             two equal pills, no default focus
<DayCell marks focusGoalId penArmed onToggle />
<HabitStrip habit color />                    days kept; misses PAPER.miss
<PenChip goal held count onSelect />
<LogSheet onParse onSave />
```

Goal object shape is already codified in `src/data/mockLife.js` — treat it as
the interface: `{ id, name, cat, state, ambition, reward, retro, period,
headline:{n,unit}, projects[], habits[], momentum, last, lastDetail, streak,
dormantNote }`.

---

## 7. Build order (what to hand Claude Code, in sequence)

1. **Theme unification.** `Home.jsx` still renders the retired night theme.
   Migrate it to `PAPER`, matching frame `3:2` exactly. `NIGHT` is aliased to
   `PAPER` in tokens so nothing breaks mid-migration; delete the alias when
   Home is done.
2. **Card + orb polish** to spec: alternating radii, blob morph, headline
   right-alignment with wrapping serif names.
3. **Completed/retired states** on cards (`✓ became real`, retro quote) —
   already in data, needs the state controls to write them.
4. **Goal workspace screen** (new route `/goal/:id`) per §4.
5. **Log sheet** per §5, stubbed parser first (regex/keyword), LLM later.
6. **Store interface** (`src/data/store.js`) per `docs/obsidian-backend.md` §5
   — do this before wiring real persistence, it's cheap now and expensive later.
7. **Zoom transition** (year → month → day) — highest risk, do last, prototype
   in isolation first. Nothing else depends on it.

## 8. Definition of done for any UI change

- No hardcoded hex anywhere outside `tokens.js`.
- No percentage rendered as text; no miss/remainder count anywhere.
- Drift renders in `whisper` and appears at most once, as a question.
- Dormant renders silently: no bar, no warning, note preserved.
- Every animation disabled under `prefers-reduced-motion`.
- Screen renders correctly with **zero** goals and with a goal that has only a
  name (defensive defaults — vault notes will be hand-edited).
