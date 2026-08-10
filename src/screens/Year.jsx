import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { CATS, PAPER, FONT } from "../tokens.js";
import { MONTHS, GOALS, buildYear, isMonthDormant } from "../data/mockLife.js";

// ── The spreadsheet gesture, reborn ────────────────────────────────────
// The 2024 sheet's core act: on the day you moved a goal, you coloured its
// cell. Here that's one tap — pick a goal's colour, tap the day, the day is
// blobbed. (docs/origin-spreadsheets.md oblig. 7: capture must be cheaper
// than colouring a cell.)
//
// Two lenses:
//   "mine"    — your real year. Starts empty, fills as you mark. Persisted.
//   "example" — the synthetic demo year, kept as a preview of the end state.
const MARKS_KEY = "becoming.marks.v1";

function loadMarks() {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(MARKS_KEY) || "{}");
  } catch {
    return {};
  }
}

const goalById = Object.fromEntries(GOALS.map((g) => [g.id, g]));

// Irregular blob (brand rule 5: a life is not a rectangle) — a rotated
// ellipse whose tilt is stable per day+goal so marks don't jiggle.
function Blob({ cx, cy, color, seed, big }) {
  const tilt = ((seed * 137) % 360) - 180;
  const rx = big ? 5.4 : 4.6;
  const ry = big ? 4.2 : 3.4;
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill={color}
      opacity={0.78}
      transform={`rotate(${tilt} ${cx} ${cy})`}
    />
  );
}

function DayCell({ mode, demoCircles, markIds, focus, pen, onToggle, setTip, tipData }) {
  const size = 15;
  const c = size / 2;
  const mine = mode === "mine";
  const marks = markIds.map((id) => goalById[id]).filter(Boolean);
  const hasContent = mine ? marks.length > 0 : demoCircles.length > 0;
  const clickable = mine && pen;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      onClick={clickable ? onToggle : undefined}
      onMouseEnter={() => hasContent && setTip(tipData)}
      onMouseLeave={() => setTip(null)}
      style={{ display: "block", cursor: clickable ? "pointer" : hasContent ? "pointer" : "default" }}
    >
      {!hasContent && (
        <circle cx={c} cy={c} r={clickable ? 1.4 : 0.9} fill={PAPER.faint} opacity={clickable ? 0.8 : 0.5} />
      )}

      {/* Example layer: translucent effort circles from the demo year */}
      {!mine &&
        demoCircles.map((circ, i) => {
          const r = 2.2 + circ.effort * 4.2;
          const ang = (i / Math.max(demoCircles.length, 1)) * Math.PI * 2 + i;
          const off = demoCircles.length > 1 ? 1.8 : 0;
          const faded = focus && circ.cat !== focus.cat;
          return (
            <circle
              key={i}
              cx={c + Math.cos(ang) * off}
              cy={c + Math.sin(ang) * off}
              r={r}
              fill={CATS[circ.cat].color}
              opacity={faded ? 0.1 : focus ? 0.8 : 0.62}
            />
          );
        })}

      {/* Your layer: solid little blobs, one per goal marked that day */}
      {mine &&
        marks.map((g, i) => {
          const ang = (i / Math.max(marks.length, 1)) * Math.PI * 2 + i;
          const off = marks.length > 1 ? 2 : 0;
          const faded = focus && g.id !== focus.id;
          return (
            <g key={g.id} opacity={faded ? 0.15 : 1}>
              <Blob
                cx={c + Math.cos(ang) * off}
                cy={c + Math.sin(ang) * off}
                color={CATS[g.cat].color}
                seed={tipData.day + i * 31}
                big={marks.length === 1}
              />
            </g>
          );
        })}
    </svg>
  );
}

function MonthBlock({ name, monthIdx, days, mode, marks, focus, pen, toggleDay, setTip }) {
  const dormant = mode === "example" && isMonthDormant(days, monthIdx);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: dormant ? PAPER.faint : PAPER.dim,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        {name}
        {dormant && <span style={{ fontSize: 10 }}>🌙</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {days.map((circles, i) => {
          const key = `${monthIdx}-${i + 1}`;
          const markIds = marks[key] || [];
          return (
            <DayCell
              key={i}
              mode={mode}
              demoCircles={circles}
              markIds={markIds}
              focus={focus}
              pen={pen}
              onToggle={() => toggleDay(key)}
              setTip={setTip}
              tipData={{ month: name, day: i + 1, circles, markIds }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function Year() {
  const year = useMemo(() => buildYear(), []);
  const [mode, setMode] = useState("mine");
  const [tip, setTip] = useState(null);
  const [penId, setPenId] = useState(null); // selected goal = your pen colour
  const [marks, setMarks] = useState(loadMarks);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(MARKS_KEY, JSON.stringify(marks));
    }
  }, [marks]);

  const pen = penId ? goalById[penId] : null;
  const focus = pen; // focusing and holding the pen are the same gesture

  const toggleDay = (key) => {
    if (!pen) return;
    setMarks((m) => {
      const ids = m[key] || [];
      const next = ids.includes(pen.id) ? ids.filter((x) => x !== pen.id) : [...ids, pen.id];
      const copy = { ...m };
      if (next.length === 0) delete copy[key];
      else copy[key] = next;
      return copy;
    });
  };

  // Accumulation only (brand rule 4): days marked, never days missed.
  const daysMarked = Object.keys(marks).length;
  const penDays = pen
    ? Object.values(marks).filter((ids) => ids.includes(pen.id)).length
    : 0;

  const totals = useMemo(() => {
    const t = {};
    Object.keys(CATS).forEach((k) => (t[k] = 0));
    year.forEach((mo) => mo.forEach((day) => day.forEach((c) => (t[c.cat] += c.effort))));
    return t;
  }, [year]);
  const maxTotal = Math.max(...Object.values(totals));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: PAPER.bg,
        color: PAPER.ink,
        fontFamily: FONT.sans,
        padding: "0 24px 60px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <header style={{ padding: "48px 0 8px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: PAPER.dim,
                marginBottom: 8,
              }}
            >
              2026 · a year in progress
            </div>
            <h1 style={{ fontFamily: FONT.serif, fontWeight: 500, fontSize: 30, margin: 0, letterSpacing: "-0.01em" }}>
              {mode === "mine" ? "Your year, day by day" : "Where a year can go"}
            </h1>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0, paddingBottom: 4 }}>
            {[
              ["mine", "my year"],
              ["example", "example"],
            ].map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                style={{
                  fontSize: 12,
                  padding: "5px 12px",
                  borderRadius: 999,
                  border: `1px solid ${mode === m ? PAPER.panelBorder : "transparent"}`,
                  background: mode === m ? "#FFFFFF" : "transparent",
                  color: mode === m ? PAPER.ink : PAPER.dim,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {/* Goal chips — each goal its own colour. In "my year" the chip is
            your pen: pick it, then tap the days you moved that goal. */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px", margin: "20px 0 10px" }}>
          {GOALS.map((g) => {
            const v = CATS[g.cat];
            const isPen = penId === g.id;
            const dimmed = penId && !isPen;
            const share = mode === "example" ? totals[g.cat] / maxTotal : 0.5;
            return (
              <button
                key={g.id}
                onClick={() => setPenId(isPen ? null : g.id)}
                aria-pressed={isPen}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 13,
                  color: dimmed ? PAPER.faint : PAPER.ink,
                  background: isPen ? "#FFFFFF" : "transparent",
                  border: `1px solid ${isPen ? PAPER.panelBorder : "transparent"}`,
                  borderRadius: 999,
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <span
                  style={{
                    width: 10 + share * 8,
                    height: 10 + share * 8,
                    borderRadius: "46% 54% 52% 48%",
                    background: v.color,
                    opacity: dimmed ? 0.3 : 0.8,
                  }}
                />
                {g.name}
                {mode === "mine" && isPen && penDays > 0 && (
                  <span style={{ color: PAPER.dim, fontVariantNumeric: "tabular-nums" }}>· {penDays} days</span>
                )}
              </button>
            );
          })}
        </div>

        {/* One quiet line of guidance / accumulation. Never a deficit. */}
        <div style={{ fontSize: 13, color: PAPER.dim, margin: "0 0 22px" }}>
          {mode === "mine" ? (
            pen ? (
              <>
                Tap the days you moved <em>{pen.name}</em> — tap again to unmark.
              </>
            ) : daysMarked === 0 ? (
              <>Pick a goal's colour above, then tap the days you moved it. That's the whole ritual.</>
            ) : (
              <>
                {daysMarked} day{daysMarked === 1 ? "" : "s"} marked this year.
              </>
            )
          ) : (
            <>A synthetic year, so you can see what a filled one feels like. Tap a goal to see its year alone.</>
          )}
        </div>

        {/* The focused goal's ambition — its own voice, above its year */}
        {focus && (
          <div
            style={{
              margin: "-6px 0 22px",
              padding: "12px 16px",
              background: "#FFFFFF",
              border: `1px solid ${PAPER.panelBorder}`,
              borderRadius: 16,
              fontSize: 13.5,
              lineHeight: 1.55,
              color: PAPER.ink,
            }}
          >
            <span style={{ fontFamily: FONT.serif, fontStyle: "italic" }}>“{focus.ambition}”</span>
            {focus.period && (
              <span style={{ color: PAPER.dim }}>
                {" "}— {focus.period.label.toLowerCase()}: {focus.period.target}
              </span>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "26px 22px" }}>
          {MONTHS.map((name, i) => (
            <MonthBlock
              key={name}
              name={name}
              monthIdx={i}
              days={year[i]}
              mode={mode}
              marks={mode === "mine" ? marks : {}}
              focus={focus}
              pen={pen}
              toggleDay={toggleDay}
              setTip={setTip}
            />
          ))}
        </div>

        {mode === "example" && (
          <div
            style={{
              marginTop: 40,
              padding: "18px 20px",
              background: PAPER.panel,
              border: `1px solid ${PAPER.panelBorder}`,
              borderRadius: 16,
              fontSize: 14,
              lineHeight: 1.6,
              color: PAPER.ink,
            }}
          >
            <span style={{ color: PAPER.dim }}>The shape of this year: </span>
            career runs steady throughout, peaking in spring.{" "}
            <span style={{ color: "#7FA0D8" }}>AI</span> burned bright Jan–Mar, then went quiet 🌙 — a pause,
            not a collapse. <span style={{ color: "#B79FD8" }}>Reading</span> faded after May. Health held its
            rhythm all year.
          </div>
        )}

        {tip && (mode === "mine" ? tip.markIds.length > 0 : tip.circles.length > 0) && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#FFFFFF",
              border: "1px solid #ECE9F2",
              boxShadow: "0 8px 30px rgba(74,70,88,0.12)",
              borderRadius: 14,
              padding: "12px 18px",
              display: "flex",
              gap: 14,
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <span style={{ color: PAPER.dim, fontVariantNumeric: "tabular-nums" }}>
              {tip.month} {tip.day}
            </span>
            {mode === "mine"
              ? tip.markIds.map((id) => {
                  const g = goalById[id];
                  if (!g) return null;
                  return (
                    <span key={id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          width: 11,
                          height: 9,
                          borderRadius: "46% 54% 52% 48%",
                          background: CATS[g.cat].color,
                        }}
                      />
                      {g.name}
                    </span>
                  );
                })
              : tip.circles.map((c, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 8 + c.effort * 8,
                        height: 8 + c.effort * 8,
                        borderRadius: "50%",
                        background: CATS[c.cat].color,
                      }}
                    />
                    {CATS[c.cat].name}
                  </span>
                ))}
          </div>
        )}

        <footer style={{ marginTop: 34, textAlign: "center", fontSize: 13 }}>
          <Link to="/" style={{ color: PAPER.faint, textDecoration: "none" }}>
            ← back to Life
          </Link>
        </footer>
      </div>
    </div>
  );
}
