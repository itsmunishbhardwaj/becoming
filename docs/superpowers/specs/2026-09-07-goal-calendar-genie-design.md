# Goal → Calendar genie transition

Date: 2026-09-07
Status: approved, pre-implementation

## Problem

The goal detail page (`src/screens/Goal.jsx`) buries its only path to the
calendar in a quiet `See on calendar →` text link in the sidebar. It doesn't
read as "the next thing to do" and it's a plain route change — no visual
continuity between the goal you're looking at and the calendar you land on.

## Goal

Make the calendar the obvious next destination from a goal page, and make
navigating there feel like the mini calendar *grows into* the full one,
already scoped to this goal.

## Non-goals

- Not building the general Life → Year → Month → Week → Day zoom morph from
  `docs/roadmap.md`. This is scoped to exactly one transition: Goal page →
  Month page, for one goal.
- Not changing Year.jsx or Week.jsx's own navigation entry points.

## Architecture

1. Extract the day-grid rendering that currently lives inline in `Month.jsx`
   into a reusable `src/components/MonthGrid.jsx`. It's a pure renderer
   (DOW header + grid of `DayCell`s), independent of the host page's CSS.
2. Give `DayCell` a new optional `viewTransitionId` prop that sets
   `style.viewTransitionName`. `MonthGrid` always passes `cal-cell-<iso>` for
   every cell it renders.
3. `Goal.jsx` renders `<MonthGrid>` at a smaller size, scoped to just this
   goal, for the current calendar month, inside a draggable card.
4. Both the mini grid (on Goal.jsx) and the full grid (on Month.jsx, via the
   same `MonthGrid`) end up with matching `cal-cell-<iso>` names for every
   date in that month. Navigating between them inside
   `document.startViewTransition` lets the browser interpolate each cell's
   position/size natively — a real per-cell FLIP morph, not a hand-rolled
   one.
5. Because `Month.jsx` normally fetches its data async on mount, the "after"
   snapshot could be captured before any day cells exist. Fix: pass the
   already-loaded goal + logs through `navigate(path, { state })`; `Month.jsx`
   seeds its initial state from `location.state` when present so it paints
   real day cells on the very first render.

## Components

### `src/data/dayTap.js` (new)

Pure decision function, extracted from logic that currently lives
independently (and slightly riskily, duplicated) in `Month.jsx` and
`Week.jsx`'s `onDayTap`:

```js
export function planDayTap({ goal, dateISO, existingEvent }) {
  // returns null (no-op) past goal.endDate or on a fixed cadence day;
  // { type: "delete", event } if a log already exists that day;
  // { type: "append", event } otherwise — event shape depends on
  // goal.baseline (wake / interval / simple "done").
}
```

`Month.jsx`, `Week.jsx`, and the new `Goal.jsx` mini-calendar all call this
instead of re-deriving the guard. One place owns "what does tapping this day
do," so the end-date/cadence rules can't drift out of sync between screens
again.

### `src/components/MonthGrid.jsx` (new)

```
<MonthGrid
  year monthIdx
  goals adherenceMaps focus pen
  onDayTap={(iso) => ...} onOpenDay={(iso) => ...}
  todayISO blobScale projectedDates
  cellMaxWidth gap           // sizing, so Goal.jsx can render it smaller
  showWeekPills onWeekPillClick   // Month.jsx only; Goal.jsx omits the column
  transitionClassName        // Month.jsx's existing slide-in animation
/>
```

Renders the DOW letter row + the day grid, one `DayCell` per date, each with
`viewTransitionId={`cal-cell-${iso}`}`. `Month.jsx` is refactored to render
this instead of its current inline grid block — same props, same visual
output, verified against the existing `Month.test.jsx`.

### `DayCell.jsx`

Add `viewTransitionId` prop (string | undefined) →
`style.viewTransitionName = viewTransitionId`. No other behavior change.

### `Goal.jsx`

- Remove the `See on calendar →` sidebar link.
- New section after "Recent activity": a card built as a framer-motion
  `motion.div` (same drag/elastic idiom already used in `LogSheet.jsx`),
  containing:
  - A header row ("This month · tap or swipe up ↑") — `onClick` triggers
    the expand.
  - `<MonthGrid>` for `todayLocalISO().slice(0,7)`, `goals={[goal]}`,
    `pen={goal}`, sized down (`cellMaxWidth`, smaller `gap`, `blobScale`
    reduced, `showWeekPills={false}`).
  - Day-cell taps call a local handler built on `planDayTap` + Supabase
    `appendLog`/`deleteLogEvent`, then refresh the month's logs. These taps
    do not bubble into the card's own click handler — only the header row
    and drag gesture trigger expansion, so logging a day never accidentally
    navigates away.
  - `drag="y"`, `dragConstraints={{ bottom: 0 }}`, `dragElastic={{ top: 0.15,
    bottom: 0 }}`, `onDragEnd` checks `offset.y < -60 || velocity.y < -400`
    to commit to expansion; otherwise the card springs back (existing
    framer-motion behavior, no new code needed for the spring-back).
- `expandToCalendar()`:
  ```js
  function expandToCalendar() {
    const path = `/month/${yyyymm}?pen=${goal.id}`;
    const state = { goals: [goal], logs };
    if (prefersReducedMotion() || !document.startViewTransition) {
      navigate(path, { state });
      return;
    }
    document.startViewTransition(() => {
      navigate(path, { state });
      return waitForCells(); // bounded poll (≤400ms) for [data-iso] to exist
    });
  }
  ```
  `prefersReducedMotion()` is the same one-line `matchMedia` check already
  duplicated per-file elsewhere in this codebase (`Home.jsx`, `App.jsx`) —
  following that existing convention rather than introducing a new shared
  util.

### `Month.jsx`

- Reads `location.state` via `useLocation()`; if `state.goals`/`state.logs`
  are present, seeds `useState` initial values instead of `null`/`[]`. The
  existing `useEffect` fetch still runs unconditionally afterward and
  overwrites with the complete (multi-goal) picture — seeding only affects
  the very first paint.
- Otherwise unchanged aside from delegating its grid rendering to
  `MonthGrid` and using `planDayTap` in `onDayTap`.

### `Week.jsx`

- `onDayTap` switched to use `planDayTap` too, for consistency (no visible
  behavior change — same guards, just one source of truth now).

## Error handling

- No `document.startViewTransition` (Safari <18, Firefox without the flag,
  older browsers) → plain `navigate()`, no error, no animation.
- `prefers-reduced-motion: reduce` → plain `navigate()`, per brand rule 10.
- `waitForCells()` times out (slow network) → the transition still starts;
  worst case is a soft cross-fade instead of a crisp per-cell morph, not a
  broken page.
- Tapping a day in the mini calendar that fails to save (network error) —
  same failure mode as `Month.jsx`/`Week.jsx` already have (silently no-ops
  on rejection); not introducing a new error path.

## Testing

- `src/data/dayTap.test.js` (new): past-end-date → null, cadence scheduled
  day → null, existing event → delete, wake/session/simple goal → correct
  append event shape.
- `Month.test.jsx`: re-run unchanged after the `MonthGrid` extraction to
  confirm no behavior regression; add a case for `location.state` seeding.
- Manual QA via the `/browse` skill: confirm the mini calendar renders on a
  goal page, day taps log/unlog correctly, tap-header and drag-up both
  navigate to the scoped Month view, and the morph is visually smooth
  (best-effort — a view transition itself isn't unit-testable).
