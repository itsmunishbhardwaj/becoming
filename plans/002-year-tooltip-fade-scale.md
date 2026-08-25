# 002 — Year view tooltip fades + scales in from bottom

- **Status**: DONE
- **Commit**: 2e6ae52
- **Severity**: MEDIUM
- **Category**: Missed opportunities / Preventing a jarring change
- **Estimated scope**: 1 file, ~20 line change

## Problem

`src/screens/Year.jsx:445` — the day-detail tooltip (`{tip && <div ...>}`) appears and disappears
instantly. It's a fixed bottom panel that floats above the calendar. The instant pop-in/out
is jarring against the considered paper aesthetic — it breaks the calm surface.

Current code (abridged from line ~445):

```jsx
{tip && (
  <div
    style={{
      position: "fixed",
      bottom: 24,
      left: "50%",
      transform: "translateX(-50%)",
      background: PAPER.card,
      border: `1px solid ${PAPER.line}`,
      boxShadow: "0 8px 30px rgba(74,70,88,0.12)",
      borderRadius: 14,
      padding: "12px 18px",
      display: "flex",
      gap: 14,
      alignItems: "center",
      fontSize: 13,
    }}
  >
    {/* tip content */}
  </div>
)}
```

## Target

Tooltip fades + scales in from `opacity: 0, scale: 0.96, y: 4` to settled. Exits the same way.
Centering (the `translateX(-50%)`) must live on a wrapper div — not the animated element — because
`motion` controls `transform` and would clobber the centering offset if both live on the same element.

```jsx
import { AnimatePresence, motion } from "motion/react";

<AnimatePresence>
  {tip && (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 4 }}
        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
        style={{
          background: PAPER.card,
          border: `1px solid ${PAPER.line}`,
          boxShadow: "0 8px 30px rgba(74,70,88,0.12)",
          borderRadius: 14,
          padding: "12px 18px",
          display: "flex",
          gap: 14,
          alignItems: "center",
          fontSize: 13,
        }}
      >
        {/* same tip content — no change */}
      </motion.div>
    </div>
  )}
</AnimatePresence>
```

Duration 150ms matches the tooltip budget (125–200ms). Easing `[0.23, 1, 0.32, 1]` is the repo's
`--ease-out` token expressed as an array for the motion `ease` prop.

## Repo conventions to follow

- Import from `"motion/react"` — matches `src/components/LogSheet.jsx:2`.
- `AnimatePresence` wraps the conditional render — matches LogSheet's scrim pattern.
- Do not introduce a CSS class — this screen uses inline styles throughout.
- The `zIndex` on the centering wrapper should be consistent with existing Year.jsx z-index values.
  Check `Year.jsx` for any existing `zIndex` on the tooltip — preserve it. If none, use `50`.

## Steps

1. Open `src/screens/Year.jsx`. Add the import:

   ```jsx
   import { AnimatePresence, motion } from "motion/react";
   ```

   (Add alongside or after existing React import.)

2. Find the tooltip block starting at the line containing `{tip && (` (around line 445).
   The block ends with the closing `)}` of the conditional.

3. Split the current single `<div>` into two elements:
   - Outer positioning `<div>` — takes `position`, `bottom`, `left`, `transform: "translateX(-50%)"`,
     and `zIndex` (see above). No animation props.
   - Inner `motion.div` — takes all visual styles (`background`, `border`, `boxShadow`, `borderRadius`,
     `padding`, `display`, `gap`, `alignItems`, `fontSize`) plus the motion props.

4. Wrap the outer `<div>` (and everything inside it) with `<AnimatePresence>`. The `{tip && ...}` conditional
   moves inside `AnimatePresence` so exit animations fire before unmount.

   Final structure:

   ```jsx
   <AnimatePresence>
     {tip && (
       <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", zIndex:50 }}>
         <motion.div
           initial={{ opacity:0, scale:0.96, y:4 }}
           animate={{ opacity:1, scale:1, y:0 }}
           exit={{ opacity:0, scale:0.96, y:4 }}
           transition={{ duration:0.15, ease:[0.23,1,0.32,1] }}
           style={{ /* all visual styles */ }}
         >
           {/* all existing tip content unchanged */}
         </motion.div>
       </div>
     )}
   </AnimatePresence>
   ```

5. Move all existing content inside `motion.div` verbatim — do not reorder or edit it.

## Boundaries

- Do NOT change any logic that sets or clears `tip` state.
- Do NOT change the tip's content (marks, date display, etc.).
- Do NOT touch any other part of Year.jsx.
- Do NOT add any new state.

## Verification

- **Mechanical**: `bun run build` passes. `bun run test` — 154 tests pass.
- **Feel check**:
  1. Run `npm run dev`, navigate to `/year`.
  2. Tap a day that has marks — tooltip should fade + scale in from slightly below center.
  3. Tap another day — old tooltip exits (scale + fade), new one enters.
  4. Tap outside — tooltip exits smoothly.
  5. DevTools Animations panel at 10%: confirm enter and exit mirror each other (same curve,
     same scale values), duration ~150ms each way.
  6. `prefers-reduced-motion` on: tooltip should still appear/disappear (opacity only, no scale/y).
- **Done when**: tooltip has visible enter + exit motion; no jump; `bun run test` still 154 passed.
