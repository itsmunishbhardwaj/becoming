import { useLayoutEffect, useMemo, useRef } from "react";
import { PAPER, FONT } from "../tokens.js";
import { goalColor } from "../lib/goalColor.js";
import { todayLocalISO } from "../lib/date.js";

// GCal-style time grid: scrollable, time labels on LEFT, whole + half hour lines.

const HOUR_PX = 64;
const LABEL_W = 96;
const BLOCK_DURATION_MIN = 45;

function parseHM(t) {
  if (!t || typeof t !== "string") return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Math.max(0, Math.min(23, +m[1])) * 60 + Math.max(0, Math.min(59, +m[2]));
}

function fmtHour(h) {
  if (h === 0) return "";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function fmtTime(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  const ampm = h < 12 ? "am" : "pm";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export default function TimeGrid({ date, goals, markedGoalIds, onToggleGoal }) {
  const isToday = date === todayLocalISO();
  const outerRef = useRef(null);

  const scheduled = useMemo(() =>
    goals
      .map((g) => ({ goal: g, minutes: parseHM(g.goalTime) }))
      .filter((x) => x.minutes != null)
      .sort((a, b) => a.minutes - b.minutes),
    [goals]
  );

  const nowMin = isToday ? nowMinutes() : null;
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const totalHeight = 24 * HOUR_PX;

  // Auto-scroll: today → current time (centered-ish), other days → 7 AM
  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const targetMin = isToday ? nowMinutes() : 7 * 60;
    const targetPx = (targetMin / 60) * HOUR_PX;
    const offset = el.clientHeight * 0.3;
    el.scrollTop = Math.max(0, targetPx - offset);
  }, [date, isToday]);

  const tz = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName")?.value ?? "";

  return (
    <div ref={outerRef} data-lenis-prevent style={outer}>
      <div style={{ position: "relative", height: totalHeight, minWidth: 0 }}>
        {/* Timezone label — top-left of time gutter */}
        <div style={{
          position: "absolute",
          left: 0, top: -14,
          width: LABEL_W - 10,
          fontSize: 10,
          color: PAPER.faint,
          fontFamily: FONT.sans,
          textAlign: "right",
          letterSpacing: "0.04em",
        }}>
          {tz}
        </div>

        {/* Hour + half-hour lines */}
        {hours.map((h) => (
          <div key={h}>
            {/* Whole-hour line */}
            <div style={{
              position: "absolute",
              left: LABEL_W, right: 0,
              top: h * HOUR_PX,
              height: 1,
              background: PAPER.line,
            }} />
            {/* Half-hour hairline */}
            {h < 23 && (
              <div style={{
                position: "absolute",
                left: LABEL_W, right: 0,
                top: h * HOUR_PX + HOUR_PX / 2,
                height: 1,
                background: "#F2F2F2",
              }} />
            )}
            {/* Hour label (LEFT gutter) */}
            <span style={{
              position: "absolute",
              left: 0, width: LABEL_W - 10,
              top: h * HOUR_PX - 6,
              textAlign: "right",
              fontSize: 10.5,
              color: PAPER.faint,
              fontFamily: FONT.sans,
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
              userSelect: "none",
            }}>
              {fmtHour(h)}
            </span>
          </div>
        ))}

        {/* Event blocks */}
        {scheduled.map(({ goal, minutes }) => {
          const marked = markedGoalIds.has(goal.id);
          const color = goalColor(goal);
          const top = (minutes / 60) * HOUR_PX;
          const height = Math.max(22, (BLOCK_DURATION_MIN / 60) * HOUR_PX);
          return (
            <button
              key={goal.id}
              onClick={() => onToggleGoal(goal, marked)}
              className="press"
              style={{
                position: "absolute",
                left: LABEL_W + 6,
                right: 48,
                top,
                height,
                border: "none",
                background: marked ? color : color + "33",
                borderLeft: `3px solid ${color}`,
                color: marked ? "#fff" : PAPER.ink,
                borderRadius: "0 8px 8px 0",
                padding: "4px 10px",
                textAlign: "left",
                fontFamily: FONT.sans,
                fontSize: 12.5,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                overflow: "hidden",
              }}
              aria-pressed={marked}
              title={`${goal.name} — ${fmtTime(minutes)}`}
            >
              <span style={{
                fontWeight: 600,
                lineHeight: 1.2,
                color: marked ? "#fff" : PAPER.ink,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {goal.name}
              </span>
              {height > 28 && (
                <span style={{
                  fontSize: 10.5,
                  color: marked ? "rgba(255,255,255,0.8)" : PAPER.dim,
                  marginTop: 2,
                }}>
                  {fmtTime(minutes)}
                </span>
              )}
            </button>
          );
        })}

        {/* Current-time indicator — anchored at left edge of grid (after label gutter) */}
        {nowMin != null && (
          <div style={{
            position: "absolute",
            left: LABEL_W - 5,
            right: 0,
            top: (nowMin / 60) * HOUR_PX,
            height: 0,
            borderTop: "2px solid #EA4335",
            pointerEvents: "none",
            zIndex: 2,
          }}>
            <span style={{
              position: "absolute",
              left: 0,
              top: -5,
              width: 10, height: 10,
              borderRadius: 999,
              background: "#EA4335",
            }} />
          </div>
        )}
      </div>
    </div>
  );
}

const outer = {
  flex: 1,
  minHeight: 0,
  position: "relative",
  overflowY: "scroll",
  overflowX: "hidden",
  background: "#FFFFFF",
  paddingTop: 18,
  touchAction: "pan-y",
  overscrollBehavior: "contain",
  WebkitOverflowScrolling: "touch",
};
