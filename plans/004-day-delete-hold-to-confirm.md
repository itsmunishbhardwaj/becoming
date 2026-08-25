# 004 — Day view delete button requires hold-to-confirm

- **Status**: DONE
- **Commit**: 2e6ae52
- **Severity**: HIGH
- **Category**: Feedback / Safety
- **Estimated scope**: 1 file, ~50 line change

## Problem

`src/screens/Day.jsx:157` — the "remove" button deletes an event on a single tap with no
confirmation. Deletion is permanent (or hard to undo). Single-tap on a destructive action
violates basic safety expectations — a slip while scrolling wipes a logged event.

Current code:

```jsx
<button onClick={() => onDelete(evt)} disabled={busy} style={dangerPill} title="Remove this event">
  remove
</button>
```

`dangerPill` (line ~297):

```js
const dangerPill = {
  padding: "6px 12px",
  borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.line}`,
  background: "transparent",
  color: PAPER.dim,
  fontSize: 12,
  fontFamily: FONT.sans,
  cursor: "pointer",
};
```

## Target

A hold-to-confirm pattern: press and hold for 1.8 s to delete. A colored overlay fills from
left to right (clip-path) while held. Release before full fill → snap-back. Completing the
fill triggers the delete. No modal, no tap-to-confirm, no extra UI state unless held.

Visual: the overlay uses the event's goal color at 25% opacity so it's legible against the
`transparent` pill background. The fill color is unmistakably intentional — not an accent for
accent's sake.

## Implementation

**Pattern**: relative wrapper + absolute overlay div animating `clipPath`. All CSS-only using
CSS transitions — no JS timers for the animation itself; a JS `setTimeout` fires `onDelete`
after 1800 ms.

Replace the current `<button>` with this structure inside the `events.map` block:

```jsx
{(() => {
  const [holding, setHolding] = React.useState(false);
  const timerRef = React.useRef(null);

  const startHold = () => {
    setHolding(true);
    timerRef.current = setTimeout(() => {
      onDelete(evt);
      setHolding(false);
    }, 1800);
  };

  const cancelHold = () => {
    clearTimeout(timerRef.current);
    setHolding(false);
  };

  return (
    <button
      disabled={busy}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      style={{ ...dangerPill, position: "relative", overflow: "hidden", userSelect: "none" }}
      title="Hold to remove"
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: color,
          opacity: 0.25,
          clipPath: holding ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
          transition: holding
            ? "clip-path 1.8s linear"
            : "clip-path 160ms cubic-bezier(0.23, 1, 0.32, 1)",
          borderRadius: "inherit",
          pointerEvents: "none",
        }}
      />
      remove
    </button>
  );
})()}
```

Note: the IIFE pattern (`{(() => { ... })()}`) creates a locally-scoped hook-per-row. This
works because the map body is a stable per-item closure, but **React hooks cannot be called
inside an IIFE** — hooks require a component boundary. The correct implementation is a small
extracted component.

## Correct Implementation (extracted component)

Extract a `DeleteButton` component above the `Day` function (or in the same file below
all existing constants):

```jsx
function DeleteButton({ evt, color, busy, onDelete }) {
  const [holding, setHolding] = React.useState(false);
  const timerRef = React.useRef(null);

  const startHold = () => {
    setHolding(true);
    timerRef.current = setTimeout(() => {
      onDelete(evt);
      setHolding(false);
    }, 1800);
  };

  const cancelHold = () => {
    clearTimeout(timerRef.current);
    setHolding(false);
  };

  return (
    <button
      disabled={busy}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      style={{
        ...dangerPill,
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      title="Hold to remove"
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: color,
          opacity: 0.25,
          clipPath: holding ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
          transition: holding
            ? "clip-path 1.8s linear"
            : "clip-path 160ms cubic-bezier(0.23, 1, 0.32, 1)",
          borderRadius: "inherit",
          pointerEvents: "none",
        }}
      />
      remove
    </button>
  );
}
```

Then in the `events.map` block, replace:

```jsx
<button onClick={() => onDelete(evt)} disabled={busy} style={dangerPill} title="Remove this event">
  remove
</button>
```

With:

```jsx
<DeleteButton evt={evt} color={color} busy={busy} onDelete={onDelete} />
```

The `color` variable is already computed just above in the map:
```js
const color = goalColor(g);  // already present at line ~147
```

## Key constraints

- `clipPath: "inset(0 100% 0 0)"` = fully hidden (right side clips to 100%).
- `clipPath: "inset(0 0% 0 0)"` = fully visible.
- Fill direction: left → right. The right inset goes from 100% → 0%.
- `transition: "clip-path 1.8s linear"` on hold start (linear = steady progress bar).
- `transition: "clip-path 160ms cubic-bezier(0.23, 1, 0.32, 1)"` on cancel (fast snap-back, ease-out).
- `borderRadius: "inherit"` on the overlay span so it clips to the pill shape.
- `overflow: "hidden"` on the button is required — without it, clip-path on the span still
  shows outside the pill at sub-pixel edges.
- `userSelect: "none"` + `WebkitUserSelect: "none"` prevents text selection during hold.
- `onPointerLeave` = cancel: if the user's finger drifts off the pill, hold cancels cleanly.
- `pointerEvents: "none"` on the overlay span prevents it stealing the pointer events from
  the button.
- Do NOT add `onClick` — `onPointerDown` + `onPointerUp` replace it entirely. `onClick` fires
  after `pointerUp` and would call `onDelete` without the 1800ms wait.
- `clearTimeout` in `cancelHold` is safe to call even if the timer already fired.

## No other changes

- Do NOT change `onDelete` handler logic.
- Do NOT change `dangerPill` constant — the component spreads it as a base.
- Do NOT animate the event rows themselves.
- Do NOT add a toast, modal, or undo — hold-to-confirm IS the confirmation.

## Repo conventions

- `React.useState` / `React.useRef` — React is already imported as a namespace import or
  named imports. Match whatever pattern Day.jsx uses at line 1. If named imports:
  `import { useState, useRef } from "react"` and use `useState`/`useRef` directly.
- `cubic-bezier(0.23, 1, 0.32, 1)` = `--ease-out` token. Use the literal value since
  inline styles can't reference CSS custom properties.
- `color` variable: already `goalColor(g)` in scope — the goal's hex. Overlay at 0.25 opacity
  on a transparent pill background gives a clearly visible but not harsh tint.

## Verification

- **Mechanical**: `bun run build` passes. `bun run test` — all pass.
- **Feel check**:
  1. Run `npm run dev`, navigate to `/day/<any-date-with-events>`.
  2. Press and hold "remove" — the goal-colored overlay should fill left-to-right over 1.8 s.
  3. Release before full fill — overlay should snap back in ~160ms (fast ease-out).
  4. Hold to full fill — event is deleted after 1.8 s. No second tap required.
  5. Rapidly tap (not hold) — nothing should happen. No delete.
  6. Drag finger off the button while holding — hold cancels, overlay snaps back.
  7. DevTools at 10%: confirm fill is linear (steady progress), snap-back is ease-out (decelerating).
  8. `prefers-reduced-motion`: CSS `transition` is suppressed by the browser for clip-path.
     Hold-to-confirm still works (fill snaps instantly, delete fires after 1.8 s timeout).
     Consider adding a `@media (prefers-reduced-motion: reduce)` that skips the fill and falls
     back to a simple 500ms hold (shorten timeout to 500ms). Optional — the JS timer is not
     motion-governed by the browser.
- **Done when**: hold 1.8 s deletes; release-before-full never deletes; tap never deletes.
