import { useEffect, useRef, useMemo } from "react";
import { PAPER, FONT, RADIUS } from "../tokens.js";
import { goalColor } from "../lib/goalColor.js";
import { todayLocalISO } from "../lib/date.js";

// Google-Calendar-style 24h day view. One row per hour; goals with a
// `goalTime` ("HH:MM") render as absolutely-positioned blocks at that row.
//
// States:
//   • scheduled (goal has goalTime, not yet marked for this date)
//       → tinted block in the goal colour at ~18% opacity. Click = mark.
//   • marked (user logged the goal for this date)
//       → solid, vibrant block in the goal colour. Click = unmark.
//
// When viewing today, a thin horizontal rule marks the current time.
// On mount, the grid scrolls to the first scheduled goal (or 7am).

const HOUR_PX = 56;          // row height in px
const LABEL_W = 56;           // width of the hour label column
const BLOCK_DURATION_MIN = 45; // visual duration of a goal block
const SCROLL_PAD = 120;       // pixels of "run-up" above the auto-scroll target

function parseHM(t) {
  if (!t || typeof t !== "string") return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Math.max(0, Math.min(23, +m[1]));
  const min = Math.max(0, Math.min(59, +m[2]));
  return h * 60 + min;
}

function fmtHour(h) {
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12} ${ampm}`;
}

function fmtTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h < 12 ? "am" : "pm";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export default function TimeGrid({ date, goals, markedGoalIds, onToggleGoal }) {
  const scrollRef = useRef(null);
  const isToday = date === todayLocalISO();

  // Only goals with a scheduled time render as blocks.
  const scheduled = useMemo(() => {
    return goals
      .map((g) => ({ goal: g, minutes: parseHM(g.goalTime) }))
      .filter((x) => x.minutes != null)
      .sort((a, b) => a.minutes - b.minutes);
  }, [goals]);

  // Auto-scroll on mount: first scheduled block, or now (today), or 7am.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let targetMin;
    if (scheduled.length > 0) targetMin = scheduled[0].minutes;
    else if (isToday) targetMin = nowMinutes();
    else targetMin = 7 * 60;
    const px = (targetMin / 60) * HOUR_PX;
    el.scrollTop = Math.max(0, px - SCROLL_PAD);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const nowMin = isToday ? nowMinutes() : null;

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const gridHeight = 24 * HOUR_PX;

  return (
    <section style={shell} aria-label="Time of day">
      <header style={headerRow}>
        <span style={kicker}>Time of day</span>
        <span style={timezoneLabel}>
          {new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
            .formatToParts(new Date())
            .find((p) => p.type === "timeZoneName")?.value ?? ""}
        </span>
      </header>

      <div ref={scrollRef} style={scrollArea}>
        <div style={{ position: "relative", height: gridHeight, paddingLeft: LABEL_W }}>
          {/* Hour rows */}
          {hours.map((h) => (
            <div
              key={h}
              style={{
                position: "absolute",
                left: 0, right: 0,
                top: h * HOUR_PX,
                height: HOUR_PX,
                borderTop: h === 0 ? "none" : `1px solid ${PAPER.line}`,
                boxSizing: "border-box",
              }}
            >
              <span style={{
                position: "absolute",
                left: 10, top: -7,
                width: LABEL_W - 16,
                fontSize: 10.5,
                color: PAPER.faint,
                fontFamily: FONT.sans,
                letterSpacing: "0.04em",
                background: PAPER.bg,
                padding: "0 4px",
              }}>
                {h === 0 ? "" : fmtHour(h)}
              </span>
            </div>
          ))}

          {/* Scheduled goal blocks */}
          {scheduled.map(({ goal, minutes }) => {
            const marked = markedGoalIds.has(goal.id);
            const color = goalColor(goal);
            const top = (minutes / 60) * HOUR_PX;
            const height = (BLOCK_DURATION_MIN / 60) * HOUR_PX;
            return (
              <button
                key={goal.id}
                onClick={() => onToggleGoal(goal, marked)}
                className="press"
                style={{
                  position: "absolute",
                  left: 6,
                  right: 10,
                  top,
                  height,
                  border: `1px solid ${marked ? color : color + "55"}`,
                  background: marked ? color : color + "26",
                  color: marked ? "#fff" : PAPER.ink,
                  borderRadius: RADIUS.r2,
                  padding: "6px 10px",
                  textAlign: "left",
                  fontFamily: FONT.sans,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                  overflow: "hidden",
                  boxShadow: marked
                    ? "0 1px 2px rgba(0,0,0,0.08)"
                    : "none",
                }}
                aria-pressed={marked}
                title={marked
                  ? `${goal.name} — logged at ${fmtTime(minutes)}. Click to unmark.`
                  : `${goal.name} — scheduled for ${fmtTime(minutes)}. Click to mark done.`}
              >
                <span style={{
                  fontFamily: FONT.serif,
                  fontWeight: 500,
                  fontSize: 13.5,
                  lineHeight: 1.15,
                  color: marked ? "#fff" : PAPER.ink,
                }}>
                  {goal.name}
                </span>
                <span style={{
                  fontSize: 11,
                  marginTop: 2,
                  color: marked ? "rgba(255,255,255,0.85)" : PAPER.dim,
                  fontFamily: FONT.sans,
                }}>
                  {fmtTime(minutes)}
                </span>
              </button>
            );
          })}

          {/* Current-time indicator */}
          {nowMin != null && (
            <div style={{
              position: "absolute",
              left: 0, right: 0,
              top: (nowMin / 60) * HOUR_PX,
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

          {/* Empty state hint */}
          {scheduled.length === 0 && (
            <div style={{
              position: "absolute",
              top: 7 * HOUR_PX + 12,
              left: LABEL_W + 10, right: 10,
              fontFamily: FONT.serif,
              fontStyle: "italic",
              fontSize: 14,
              color: PAPER.dim,
              lineHeight: 1.55,
            }}>
              No goals scheduled for a specific time yet.<br />
              <span style={{ fontSize: 12, fontStyle: "normal", color: PAPER.faint }}>
                Set a time on any goal page to see it here.
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const shell = {
  marginBottom: 32,
  background: PAPER.bg,
  border: `1px solid ${PAPER.line}`,
  borderRadius: RADIUS.r1,
  overflow: "hidden",
};

const headerRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  borderBottom: `1px solid ${PAPER.line}`,
  background: PAPER.card,
};

const kicker = {
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

const scrollArea = {
  position: "relative",
  maxHeight: 480,
  overflowY: "auto",
  background: PAPER.bg,
};
