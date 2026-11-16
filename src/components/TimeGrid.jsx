import { useLayoutEffect, useRef, useState, useMemo } from "react";
import { PAPER, FONT, RADIUS } from "../tokens.js";
import { goalColor } from "../lib/goalColor.js";
import { todayLocalISO } from "../lib/date.js";

// Google-Calendar-style 24h day view.
// Fills its container height exactly — no internal scroll.
// HOUR_PX is computed dynamically via ResizeObserver.

const LABEL_W = 52;
const BLOCK_DURATION_MIN = 45;

function parseHM(t) {
  if (!t || typeof t !== "string") return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Math.max(0, Math.min(23, +m[1])) * 60 + Math.max(0, Math.min(59, +m[2]));
}

function fmtHour(h) {
  const ampm = h < 12 ? "AM" : "PM";
  return `${((h + 11) % 12) + 1} ${ampm}`;
}

function fmtTime(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  const ampm = h < 12 ? "am" : "pm";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ampm}`;
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export default function TimeGrid({ date, goals, markedGoalIds, onToggleGoal, onMenuOpen }) {
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

  // Measure available height → derive hourPx = height / 24
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

  return (
    <section style={shell} aria-label="Time of day">
      <header style={headerRow}>
        {onMenuOpen && (
          <button
            type="button"
            onClick={onMenuOpen}
            aria-label="Open day panel"
            style={burgerBtn}
          >
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
              <path stroke={PAPER.dim} strokeWidth="1.6" strokeLinecap="round" d="M0 1h16M0 6h16M0 11h16" />
            </svg>
          </button>
        )}
        <span style={kicker}>Time of day</span>
        <span style={timezoneLabel}>
          {new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
            .formatToParts(new Date())
            .find((p) => p.type === "timeZoneName")?.value ?? ""}
        </span>
      </header>

      {/* Grid fills remaining height — no overflow/scroll */}
      <div ref={containerRef} style={gridOuter}>
        {hourPx > 0 && (
          <div style={{ position: "relative", height: 24 * hourPx, paddingLeft: LABEL_W }}>
            {hours.map((h) => (
              <div
                key={h}
                style={{
                  position: "absolute",
                  left: 0, right: 0,
                  top: h * hourPx,
                  height: hourPx,
                  borderTop: h === 0 ? "none" : `1px solid ${PAPER.line}`,
                  boxSizing: "border-box",
                }}
              >
                {h !== 0 && (
                  <span style={{
                    position: "absolute",
                    left: 8, top: -7,
                    width: LABEL_W - 12,
                    fontSize: Math.max(8, Math.min(10.5, hourPx * 0.28)),
                    color: PAPER.faint,
                    fontFamily: FONT.sans,
                    letterSpacing: "0.04em",
                    background: PAPER.bg,
                    padding: "0 2px",
                    whiteSpace: "nowrap",
                  }}>
                    {fmtHour(h)}
                  </span>
                )}
              </div>
            ))}

            {scheduled.map(({ goal, minutes }) => {
              const marked = markedGoalIds.has(goal.id);
              const color = goalColor(goal);
              const top = (minutes / 60) * hourPx;
              const height = Math.max(20, (BLOCK_DURATION_MIN / 60) * hourPx);
              return (
                <button
                  key={goal.id}
                  onClick={() => onToggleGoal(goal, marked)}
                  className="press"
                  style={{
                    position: "absolute",
                    left: 6, right: 10,
                    top, height,
                    border: `1px solid ${marked ? color : color + "55"}`,
                    background: marked ? color : color + "26",
                    color: marked ? "#fff" : PAPER.ink,
                    borderRadius: RADIUS.r2,
                    padding: "4px 8px",
                    textAlign: "left",
                    fontFamily: FONT.sans,
                    fontSize: Math.max(10, Math.min(13, hourPx * 0.35)),
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-start",
                    overflow: "hidden",
                    boxShadow: marked ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                  }}
                  aria-pressed={marked}
                  title={marked
                    ? `${goal.name} — logged at ${fmtTime(minutes)}. Click to unmark.`
                    : `${goal.name} — scheduled for ${fmtTime(minutes)}. Click to mark done.`}
                >
                  <span style={{
                    fontFamily: FONT.serif,
                    fontWeight: 500,
                    fontSize: Math.max(10, Math.min(13.5, hourPx * 0.36)),
                    lineHeight: 1.15,
                    color: marked ? "#fff" : PAPER.ink,
                  }}>
                    {goal.name}
                  </span>
                  {height > 28 && (
                    <span style={{
                      fontSize: Math.max(9, Math.min(11, hourPx * 0.28)),
                      marginTop: 1,
                      color: marked ? "rgba(255,255,255,0.85)" : PAPER.dim,
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
                left: 0, right: 0,
                top: (nowMin / 60) * hourPx,
                height: 0,
                borderTop: `1.5px solid ${PAPER.ink}`,
                pointerEvents: "none",
                zIndex: 2,
              }}>
                <span style={{
                  position: "absolute",
                  left: LABEL_W - 6,
                  top: -4,
                  width: 8, height: 8,
                  borderRadius: 999,
                  background: PAPER.ink,
                }} />
              </div>
            )}

            {scheduled.length === 0 && (
              <div style={{
                position: "absolute",
                top: 7 * hourPx + 10,
                left: LABEL_W + 10, right: 10,
                fontFamily: FONT.serif,
                fontStyle: "italic",
                fontSize: 14,
                color: PAPER.dim,
                lineHeight: 1.55,
                pointerEvents: "none",
              }}>
                No goals scheduled for a specific time yet.<br />
                <span style={{ fontSize: 12, fontStyle: "normal", color: PAPER.faint }}>
                  Set a time on any goal page to see it here.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const shell = {
  display: "flex",
  flexDirection: "column",
  flex: 1,
  overflow: "hidden",
  background: PAPER.bg,
};

const headerRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  borderBottom: `1px solid ${PAPER.line}`,
  background: PAPER.card,
  flexShrink: 0,
};

const kicker = {
  flex: 1,
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: PAPER.faint,
  fontWeight: 500,
  fontFamily: FONT.sans,
};

const timezoneLabel = {
  fontSize: 11,
  color: PAPER.faint,
  fontFamily: FONT.sans,
  letterSpacing: "0.04em",
};

const burgerBtn = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
};

const gridOuter = {
  flex: 1,
  position: "relative",
  overflow: "hidden",
  background: PAPER.bg,
};
