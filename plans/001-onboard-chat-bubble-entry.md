# 001 — Onboard chat bubbles animate in sequentially

- **Status**: DONE
- **Commit**: 2e6ae52
- **Severity**: HIGH
- **Category**: Missed opportunities / Preventing a jarring change
- **Estimated scope**: 1 file, ~8 line change

## Problem

`src/screens/Onboard.jsx:211` — each new message bubble appears instantly. Because the LLM
response and the user's reply both teleport in with no transition, the conversational interface
reads as a page reload rather than a chat. The onboarding is the first impression of the whole
product.

Current code:

```jsx
{transcript.map((m, i) => (
  <div key={i} style={m.role === "user" ? userBubble : assistantBubble}>
    {m.text}
  </div>
))}
```

## Target

Each bubble — new and pre-loaded — animates in from `opacity: 0, y: 6` to settled.
User bubbles shift from `x: 6`; assistant bubbles from `x: -6` (reinforces the side-aligned layout).
New bubbles animate as they are pushed onto `transcript`; no blocking interaction.

```jsx
import { AnimatePresence, motion } from "motion/react";

// Inside the transcript div:
<AnimatePresence initial={false}>
  {transcript.map((m, i) => (
    <motion.div
      key={i}
      initial={{ opacity: 0, y: 6, x: m.role === "user" ? 6 : -6 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ type: "spring", duration: 0.3, bounce: 0 }}
      style={m.role === "user" ? userBubble : assistantBubble}
    >
      {m.text}
    </motion.div>
  ))}
</AnimatePresence>
```

`initial={false}` on `AnimatePresence` prevents ALL items replaying on mount (only new pushes
animate). This is the correct setting for a chat list that grows.

## Repo conventions to follow

- `motion` is already installed (`motion@13.1.1`, `package.json`).
- Import path: `import { AnimatePresence, motion } from "motion/react"` — matches `src/components/LogSheet.jsx:2`.
- Spring config pattern: `{ type: "spring", duration: 0.3, bounce: 0 }` — critically damped, no overshoot, matches the drawer spring's personality. Do NOT add `bounce > 0` on chat bubbles.
- Reduced motion: motion's `AnimatePresence` respects `prefers-reduced-motion` automatically when using the `motion/react` import. No extra handling needed.

## Steps

1. Open `src/screens/Onboard.jsx`. At the top, add `AnimatePresence` and `motion` to the existing
   import or add a new import line:

   ```jsx
   import { AnimatePresence, motion } from "motion/react";
   ```

2. Find the transcript render block (line ~211):

   ```jsx
   {transcript.map((m, i) => (
     <div key={i} style={m.role === "user" ? userBubble : assistantBubble}>
       {m.text}
     </div>
   ))}
   ```

   Replace with:

   ```jsx
   <AnimatePresence initial={false}>
     {transcript.map((m, i) => (
       <motion.div
         key={i}
         initial={{ opacity: 0, y: 6, x: m.role === "user" ? 6 : -6 }}
         animate={{ opacity: 1, y: 0, x: 0 }}
         transition={{ type: "spring", duration: 0.3, bounce: 0 }}
         style={m.role === "user" ? userBubble : assistantBubble}
       >
         {m.text}
       </motion.div>
     ))}
   </AnimatePresence>
   ```

3. No other changes.

## Boundaries

- Do NOT touch `userBubble` or `assistantBubble` style constants.
- Do NOT add exit animations — bubbles never leave the transcript.
- Do NOT touch any other part of Onboard.jsx.
- Do NOT add new dependencies (motion is already installed).

## Verification

- **Mechanical**: `bun run build` must pass. `bun run test` — 154 tests must pass.
- **Feel check**:
  1. Run `npm run dev`, navigate to `/onboard`.
  2. Type something and press Send — the user bubble should slide in from the right (`x: 6`).
  3. The assistant reply should slide in from the left (`x: -6`).
  4. In DevTools Animations panel, set playback to 10% — confirm the spring settles
     without overshoot and completes in ~300ms.
  5. Toggle `prefers-reduced-motion` in DevTools Rendering panel — bubbles should still
     appear (opacity fade), position animation should be suppressed.
- **Done when**: new bubbles enter with motion; no jump; `bun run test` still 154 passed.
