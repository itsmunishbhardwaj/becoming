# 005 — Day empty state fades in on mount

- **Status**: DONE
- **Commit**: 2e6ae52
- **Severity**: LOW
- **Category**: Delight / Preventing a jarring change
- **Estimated scope**: 2 files, ~8 line change (1 className + 3 CSS lines)

## Problem

`src/screens/Day.jsx:138` — the "A quiet day. Rest counts too." paragraph appears instantly
when the day has no logged events. This is a rare, emotionally significant moment (user
opened an empty day — they're checking in on themselves). The instant pop-in breaks the
calm paper surface.

Current code:

```jsx
{events.length === 0 ? (
  <p style={{ fontFamily: FONT.serif, fontStyle: "italic", fontSize: TYPE.ambition, color: PAPER.dim }}>
    A quiet day. Rest counts too.
  </p>
) : (
  // ...event list
)}
```

## Target

The empty-state paragraph fades in from `opacity: 0, translateY(5px)` to settled, using
CSS `@starting-style` — no JavaScript state, no `useEffect`. Transition is 280ms ease-out,
matching the InsightCard entry (already in styles.css).

## Steps

### 1. Add `className` to the `<p>` tag in Day.jsx

Find line ~138. Change:

```jsx
<p style={{ fontFamily: FONT.serif, fontStyle: "italic", fontSize: TYPE.ambition, color: PAPER.dim }}>
  A quiet day. Rest counts too.
</p>
```

To:

```jsx
<p className="day-empty" style={{ fontFamily: FONT.serif, fontStyle: "italic", fontSize: TYPE.ambition, color: PAPER.dim }}>
  A quiet day. Rest counts too.
</p>
```

No other change to Day.jsx. Do not touch the surrounding conditional.

### 2. Add CSS to `src/styles.css`

Append at the bottom of styles.css, before the `/* ── Reduced motion ──` block (insert just
above that block so reduced-motion override is still last):

```css
/* ── Day empty state ───────────────────────────────────────── */
.day-empty {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 280ms cubic-bezier(0.23, 1, 0.32, 1),
              transform 280ms cubic-bezier(0.23, 1, 0.32, 1);
}
@starting-style {
  .day-empty { opacity: 0; transform: translateY(5px); }
}
```

Also add inside the existing `@media (prefers-reduced-motion: reduce)` block:

```css
  .day-empty { transition: none; }
```

## Key constraints

- `@starting-style` targets the element's first paint. When `events.length` flips from
  non-zero to zero, the `<p>` is newly mounted — `@starting-style` fires.
- If the user navigates to a day that was already empty, the `<p>` is there from the
  first render — `@starting-style` still fires on that initial paint.
- `cubic-bezier(0.23, 1, 0.32, 1)` = `--ease-out` token, same curve as `InsightCard`.
  Use the literal value, not the CSS custom property, because `@starting-style` sits inside
  a rule block where the property is valid but the custom property reference is identical —
  either works. For consistency with the rest of styles.css (which uses the literal), use
  the literal.
- Do NOT add `motion` / JS animation here — `@starting-style` is the right tool for a
  simple entry fade on a rarely-seen element.
- Do NOT change any logic that determines `events.length === 0`.
- `@starting-style` browser support: Chrome 117+, Safari 17.5+, Firefox 129+. All modern.
  Older browsers silently skip the starting style — element appears instantly, which is
  the current baseline behavior. Acceptable progressive enhancement.

## Repo conventions

- `@starting-style` already used: see `InsightCard` block in styles.css (lines ~101–107).
  This plan follows the exact same pattern.
- Transition values match InsightCard: `280ms cubic-bezier(0.23, 1, 0.32, 1)` on both
  `opacity` and `transform`.
- Reduced-motion override pattern: already established at bottom of styles.css. Add
  `.day-empty { transition: none; }` inside the existing
  `@media (prefers-reduced-motion: reduce)` block.

## Verification

- **Mechanical**: `bun run build` passes. `bun run test` — all pass. No test touches this
  element by class name, so no test churn expected.
- **Feel check**:
  1. Run `npm run dev`, navigate to `/day/<a-date-with-no-events>`.
  2. The italic text should gently fade and rise into position (~280ms).
  3. If you delete all events from a day (using plan 004), the empty state should appear
     with the same fade as you removed the last event row.
  4. DevTools Animations panel at 10%: confirm opacity fades 0→1 and translateY 5px→0
     over ~280ms with the ease-out curve (fast start, decelerate to settle).
  5. `prefers-reduced-motion: reduce` in DevTools: text should appear instantly (no fade,
     no translate — transition is suppressed).
- **Done when**: empty-state text fades in on mount; instant in reduced-motion; build/tests pass.
