# 003 — Goal color picker expands with height + opacity spring

- **Status**: DONE
- **Commit**: 2e6ae52
- **Severity**: MEDIUM
- **Category**: Missed opportunities / State indication
- **Estimated scope**: 1 file, ~10 line change

## Problem

`src/screens/Goal.jsx:133` — the color picker section (`{editingColor && <div>...</div>}`) snaps
open and closed with no animation. The toggle button is the orb — clicking it expects a considered
response, not a teleport.

Current code:

```jsx
{editingColor && (
  <div
    style={{
      marginTop: 14,
      padding: "12px 14px",
      background: PAPER.card,
      border: `1px solid ${PAPER.line}`,
      borderRadius: RADIUS.r1,
    }}
  >
    {/* color picker content */}
  </div>
)}
```

## Target

The section expands from `height: 0, opacity: 0` to `height: "auto", opacity: 1` and collapses
in reverse. A spring with no bounce makes it feel mechanical-but-alive, matching the Goal workspace's
focused personality.

```jsx
import { AnimatePresence, motion } from "motion/react";

<AnimatePresence>
  {editingColor && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: "spring", duration: 0.28, bounce: 0 }}
      style={{ overflow: "hidden", marginTop: 14 }}
    >
      <div
        style={{
          padding: "12px 14px",
          background: PAPER.card,
          border: `1px solid ${PAPER.line}`,
          borderRadius: RADIUS.r1,
        }}
      >
        {/* same content — unchanged */}
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

Key constraints:
- `overflow: "hidden"` on the `motion.div` is required for height animation to clip correctly.
- `marginTop` moves from the inner div to the `motion.div` so it collapses cleanly (no gap when closed).
- `height: "auto"` is supported by motion — it measures the content height and springs to it.
- Duration 280ms + `bounce: 0` = critically damped, fast, no overshoot. Do NOT add bounce.

## Repo conventions to follow

- Import from `"motion/react"` — matches `src/components/LogSheet.jsx:2`.
- `AnimatePresence` wraps the `{editingColor && ...}` conditional — matches LogSheet pattern.
- Spring config `{ type:"spring", duration:0.28, bounce:0 }` — slightly faster than the drawer
  (0.3) since this is a smaller, denser section.

## Steps

1. Open `src/screens/Goal.jsx`. Add the import at the top:

   ```jsx
   import { AnimatePresence, motion } from "motion/react";
   ```

2. Find the `{editingColor && (` block (~line 133). Replace it with:

   ```jsx
   <AnimatePresence>
     {editingColor && (
       <motion.div
         initial={{ height: 0, opacity: 0 }}
         animate={{ height: "auto", opacity: 1 }}
         exit={{ height: 0, opacity: 0 }}
         transition={{ type: "spring", duration: 0.28, bounce: 0 }}
         style={{ overflow: "hidden", marginTop: 14 }}
       >
         <div
           style={{
             padding: "12px 14px",
             background: PAPER.card,
             border: `1px solid ${PAPER.line}`,
             borderRadius: RADIUS.r1,
           }}
         >
           {/* MOVE existing content here — unchanged */}
         </div>
       </motion.div>
     )}
   </AnimatePresence>
   ```

   Move the existing content (the `COLOR` kicker + PALETTE swatch buttons) inside the inner `<div>`.
   The inner `<div>` takes the visual styles (`padding`, `background`, `border`, `borderRadius`).
   Remove `marginTop: 14` from the inner div (it is now on `motion.div`).

3. No other changes.

## Boundaries

- Do NOT touch the `pickColor` handler, `savingColor` state, or `PALETTE` map.
- Do NOT animate the individual color swatches.
- Do NOT change any button `aria-pressed` attributes or swatch styles.
- Do NOT touch any other part of Goal.jsx.

## Verification

- **Mechanical**: `bun run build` passes. `bun run test` — all pass (Goal.test.jsx specifically).
- **Feel check**:
  1. Run `npm run dev`, navigate to `/goal/<any-id>`.
  2. Click the orb — the color picker section should expand downward (height + opacity).
  3. Click the orb again — it should collapse upward smoothly.
  4. Rapid clicks (toggle quickly) — each state change should interrupt and retarget cleanly,
     no jump to zero.
  5. DevTools at 10%: confirm height animates from 0 to full content height (measure it).
     Confirm no gap between the header and the picker when open.
  6. `prefers-reduced-motion`: height animation should be suppressed; opacity fade still present.
     Motion handles this automatically via `motion/react`.
- **Done when**: picker opens and closes with animated height; rapid toggle never jumps; all tests pass.
