import { useLayoutEffect, useRef, useState, useMemo } from "react";
import { PAPER, FONT, RADIUS } from "../tokens.js";
import { goalColor } from "../lib/goalColor.js";
import { todayLocalISO } from "../lib/date.js";

// Pure time grid — no header bar. Fills its container exactly (no internal scroll).
// HOUR_PX computed dynamically via ResizeObserver.

const LABEL_W = 56;
const BLOCK_DURATION_MIN = 45;

function parseHM(t) {
  if (!t || typeof t !== "string") return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Math.max(0, Math.min(23, +m[1])) * 60 + Math.max(0, Math.min(59, +m[2]));
}

function fmtHour(h) {
  if (h === 0) return "12 AM";
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
  const containerRef = useRef(null);
  const [hourPx, setHourPx] = useState(0);
  const isToday = date === todayLocalISO();

  const scheduled = useMemo(() =>
    goals
      .map((g) => ({ goal: g, minutes: parseHM(g.goalTime) }))
      .filter((x) => x.minutes != null)
      .sort((a, b) => a.minutes - b.minutes),
    [goals]
  );

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setHourPx(h / 24);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nowMin = isToday ? nowMinutes() : null;
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Timezone abbreviation shown above hour labels
  const tz = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName")?.value ?? "";

  return (
    <div ref={containerRef} style={outer}>
      {hourPx > 0 && (
        <div style={{ position: "relative", height: 24 * hourPx, minWidth: 0 }}>
          {/* Timezone label above first hour label */}
          <div style={{
            position: "absolute",
            left: 0, top: -18,
            width: LABEL_W,
            fontSize: 9,
            color: PAPER.faint,
            fontFamily: FONT.sans,
            textAlign: "right",
            paddingRight: 8,
            letterSpacing: "0.04em",
          }}>
            {tz}
          </div>

          {/* Hour rows */}
          {hours.map((h) => (
            <div
              key={h}
              style={{
                position: "absolute",
                left: 0, right: 0,
                top: h * hourPx,
                height: hourPx,
                borderTop: `1px solid ${PAPER.line}`,
                boxSizing: "border-box",
              }}
            >
              <span style={{
                position: "absolute",
                right: LABEL_W - 8,
                top: -8,
                fontSize: Math.max(8.5, Math.min(10.5, hourPx * 0.3)),
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

          {/* Vertical line separating labels from events */}
          <div style={{
            position: "absolute",
            left: LABEL_W,
            top: 0,
            bottom: 0,
            width: 1,
            background: PAPER.line,
            pointerEvents: "none",
          }} />

          {/* Event blocks */}
          {scheduled.map(({ goal, minutes }) => {
            const marked = markedGoalIds.has(goal.id);
            const color = goalColor(goal);
            const top = (minutes / 60) * hourPx;
            const height = Math.max(18, (BLOCK_DURATION_MIN / 60) * hourPx);
            return (
              <button
                key={goal.id}
                onClick={() => onToggleGoal(goal, marked)}
                className="press"
                style={{
                  position: "absolute",
                  left: LABEL_W + 4,
                  right: 8,
                  top,
                  height,
                  border: "none",
                  background: marked ? color : color + "33",
                  borderLeft: `3px solid ${color}`,
                  color: marked ? "#fff" : PAPER.ink,
                  borderRadius: "0 6px 6px 0",
                  padding: "3px 8px",
                  textAlign: "left",
                  fontFamily: FONT.sans,
                  fontSize: Math.max(10, Math.min(12.5, hourPx * 0.33)),
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
                  fontSize: Math.max(10, Math.min(12.5, hourPx * 0.33)),
                  lineHeight: 1.2,
                  color: marked ? "#fff" : PAPER.ink,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {goal.name}
                </span>
                {height > 26 && (
                  <span style={{
                    fontSize: Math.max(9, Math.min(10.5, hourPx * 0.26)),
                    color: marked ? "rgba(255,255,255,0.8)" : PAPER.dim,
                    marginTop: 1,
                  }}>
                    {fmtTime(minutes)}
                  </span>
                )}
              </button>
            );
          })}

          {/* Current-time indicator */}
          {nowMin != null && (
            <div style={{
              position: "absolute",
              left: LABEL_W - 5,
              right: 0,
              top: (nowMin / 60) * hourPx,
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

          {/* Empty state */}
          {scheduled.length === 0 && (
            <div style={{
              position: "absolute",
              top: 8 * hourPx + 12,
              left: LABEL_W + 16, right: 16,
              fontFamily: FONT.serif,
              fontStyle: "italic",
              fontSize: 13.5,
              color: PAPER.dim,
              lineHeight: 1.6,
              pointerEvents: "none",
            }}>
              No goals scheduled for today yet.
              <br />
              <span style={{ fontSize: 12, fontStyle: "normal", color: PAPER.faint }}>
                Set a time on any goal page to see it here.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const outer = {
  flex: 1,
  position: "relative",
  overflowY: "auto",
  overflowX: "hidden",
  background: PAPER.bg,
  paddingTop: 20, // room for timezone label
};
