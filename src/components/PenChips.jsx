import { PAPER } from "../tokens.js";
import { goalColor } from "../lib/goalColor.js";

// Row of goal chips — pick a goal to hold its pen for tap-to-mark.
// penDayCount: optional callback returning a day count for the pen chip label.
export default function PenChips({ goals, penId, onPick, penDayCount }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px", margin: "20px 0 10px" }}>
      {goals.map((g) => {
        const isPen = penId === g.id;
        const dimmed = penId && !isPen;
        const days = isPen && penDayCount ? penDayCount(g) : 0;
        return (
          <button
            key={g.id}
            onClick={() => onPick(isPen ? null : g.id)}
            aria-pressed={isPen}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 13,
              color: dimmed ? PAPER.faint : PAPER.ink,
              background: isPen ? PAPER.card : "transparent",
              border: `1px solid ${isPen ? PAPER.line : "transparent"}`,
              borderRadius: 999,
              padding: "4px 10px",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 150ms ease, border-color 150ms ease, color 150ms ease, opacity 150ms ease",
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: "67% 33% 52% 48% / 42% 58% 35% 65%",
                background: `radial-gradient(circle at 35% 30%, ${goalColor(g)}, ${goalColor(g)}99 80%)`,
                flexShrink: 0,
                opacity: dimmed ? 0.3 : 1,
              }}
            />
            {g.name}
            {isPen && days > 0 && (
              <span style={{ color: PAPER.dim, fontVariantNumeric: "tabular-nums" }}>· {days} days</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
