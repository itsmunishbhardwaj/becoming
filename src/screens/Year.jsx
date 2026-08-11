import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CATS, PAPER, FONT } from "../tokens.js";
import { listGoals, readLogsInRange, appendLog, deleteLogEvent } from "../data/store.js";
import { dailyAdherence } from "../data/adherence.js";

// ── The spreadsheet gesture, reborn ────────────────────────────────────
// The 2024 sheet's core act: on the day you moved a goal, you coloured its
// cell. Here that's one tap — pick a goal's colour, tap the day, the day is
// blobbed. (docs/origin-spreadsheets.md oblig. 7: capture must be cheaper
// than colouring a cell.)

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const YEAR = new Date().getFullYear().toString();
const YEAR_FROM = `${YEAR}-01-01`;
const YEAR_TO   = `${YEAR}-12-31`;

// Days per month for the current year (accounts for leap years)
function daysInMonth(monthIdx) {
  return new Date(parseInt(YEAR), monthIdx + 1, 0).getDate();
}

// Stable rotation for each ellipse per (day, index)
function Blob({ cx, cy, color, seed, big, opacity }) {
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
      opacity={opacity ?? 0.78}
      transform={`rotate(${tilt} ${cx} ${cy})`}
    />
  );
}

function markStyleFor(status, catColor) {
  if (status === "none" || status === "clean") return null;
  const base = { width: 5.6, height: 4.6, borderRadius: 999, display: "inline-block" };
  if (status === "off") return { ...base, background: PAPER.whisper, opacity: 0.55 };
  if (status === "bonus") return { ...base, background: catColor, opacity: 0.35 }; // off-schedule session
  const op = status === "soft" ? 0.55 : 0.85;
  return { ...base, background: catColor, opacity: op };
}

// adherenceMaps: Record<goalId, Record<isoDate, status>>
// dayMarks: built per DayCell from adherenceMaps + goals
function DayCell({ monthIdx, dayIdx, isoDate, goals, adherenceMaps, focus, pen, onToggle, setTip }) {
  const size = 15;
  const c = size / 2;
  const clickable = !!pen;

  // Per-goal marks for this day (filtered to goals that have a non-trivial status)
  const marks = useMemo(() => {
    return goals
      .map((g) => {
        const map = adherenceMaps[g.id] || {};
        const status = map[isoDate] || "none";
        const style = markStyleFor(status, CATS[g.cat]?.color ?? PAPER.faint);
        return { g, status, style };
      })
      .filter(({ style }) => style !== null);
  }, [goals, adherenceMaps, isoDate]);

  // Scheduled but unfilled: pen goal has status "none" = green day with no session yet
  const penStatus = pen ? ((adherenceMaps[pen.id] || {})[isoDate] || "none") : null;
  const showScheduleRing = penStatus === "none";
  const penColor = pen ? (CATS[pen.cat]?.color ?? PAPER.faint) : null;

  const hasContent = marks.length > 0 || showScheduleRing;

  const tipData = { month: MONTHS[monthIdx], day: dayIdx + 1, marks };

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

      {/* Schedule ring: unfilled green day for the held pen goal */}
      {showScheduleRing && (
        <circle cx={c} cy={c} r={3.5} fill="none" stroke={penColor} strokeWidth={1} opacity={0.3} />
      )}

      {marks.map(({ g, status }, i) => {
        const ang = (i / Math.max(marks.length, 1)) * Math.PI * 2 + i;
        const off = marks.length > 1 ? 2 : 0;
        const faded = focus && g.id !== focus.id;
        const isBonus = status === "bonus";
        const isOff = status === "off";
        const op = isOff ? 0.55 : isBonus ? (faded ? 0.12 : 0.35) : status === "soft" ? 0.55 : faded ? 0.15 : 0.85;
        const color = isOff ? PAPER.whisper : CATS[g.cat]?.color ?? PAPER.faint;
        return (
          <g key={g.id} opacity={faded && !isOff && !isBonus ? 0.15 : 1}>
            <Blob
              cx={c + Math.cos(ang) * off}
              cy={c + Math.sin(ang) * off}
              color={color}
              seed={(dayIdx + 1) + i * 31}
              big={marks.length === 1}
              opacity={op}
            />
          </g>
        );
      })}
    </svg>
  );
}

function MonthBlock({ monthIdx, goals, adherenceMaps, focus, pen, onDayTap, setTip }) {
  const name = MONTHS[monthIdx];
  const count = daysInMonth(monthIdx);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: PAPER.dim,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        {name}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {Array.from({ length: count }, (_, i) => {
          const mm = String(monthIdx + 1).padStart(2, "0");
          const dd = String(i + 1).padStart(2, "0");
          const iso = `${YEAR}-${mm}-${dd}`;
          return (
            <DayCell
              key={iso}
              monthIdx={monthIdx}
              dayIdx={i}
              isoDate={iso}
              goals={goals}
              adherenceMaps={adherenceMaps}
              focus={focus}
              pen={pen}
              onToggle={() => {
                const penStatus = pen ? (adherenceMaps[pen.id] || {})[iso] || "none" : "none";
                onDayTap({ dateISO: iso, status: penStatus });
              }}
              setTip={setTip}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function Year() {
  const [params] = useSearchParams();
  const [goals, setGoals] = useState(null); // null = loading
  const [logs, setLogs] = useState([]);
  const [tip, setTip] = useState(null);
  const [penId, setPenId] = useState(() => params.get("pen") || null);

  const fetchData = useCallback(async () => {
    const [gs, ls] = await Promise.all([
      listGoals(),
      readLogsInRange({ from: YEAR_FROM, to: YEAR_TO }),
    ]);
    setGoals(gs);
    setLogs(ls);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!goals || goals.length === 0) return;
    if (penId && !goals.some((g) => g.id === penId)) setPenId(null);
  }, [goals]);

  const goalById = useMemo(
    () => Object.fromEntries((goals ?? []).map((g) => [g.id, g])),
    [goals]
  );

  const pen = penId ? goalById[penId] : null;
  const focus = pen;

  // Compute dailyAdherence for every goal over the full year
  const adherenceMaps = useMemo(() => {
    if (!goals) return {};
    const out = {};
    for (const g of goals) {
      out[g.id] = dailyAdherence({ goal: g, logs, from: YEAR_FROM, to: YEAR_TO });
    }
    return out;
  }, [goals, logs]);

  const refreshLogs = useCallback(async () => {
    const ls = await readLogsInRange({ from: YEAR_FROM, to: YEAR_TO });
    setLogs(ls);
  }, []);

  const onDayTap = useCallback(async ({ dateISO, status }) => {
    if (!pen) return;
    const goal = pen;

    // Tapping a day that already has a hit/soft unmarks it
    if (status === "hit" || status === "soft") {
      const log = logs.find((l) => l.date === dateISO);
      if (goal.type === "wake") {
        const wakeEvt = log?.events.find((e) => e.goalId === goal.id && e.verb === "wake");
        if (wakeEvt) {
          await deleteLogEvent(dateISO, wakeEvt);
          await refreshLogs();
        }
      } else if (goal.type === "cadence") {
        const sessionEvt = log?.events.find((e) => e.goalId === goal.id && e.verb === "session");
        if (sessionEvt) {
          await deleteLogEvent(dateISO, sessionEvt);
          await refreshLogs();
        }
      }
      return;
    }

    // Empty day: write a default log event
    const event =
      goal.type === "wake"
        ? { verb: "wake", time: "07:00", goalId: goal.id }
        : { verb: "session", durationMin: 10, goalId: goal.id };
    await appendLog(dateISO, event);
    await refreshLogs();
  }, [pen, logs, refreshLogs]);

  // Accumulation copy: days with a hit or soft mark
  const penDays = useMemo(() => {
    if (!pen) return 0;
    const map = adherenceMaps[pen.id] || {};
    return Object.values(map).filter((s) => s === "hit" || s === "soft").length;
  }, [pen, adherenceMaps]);

  const totalMarkedDays = useMemo(() => {
    if (!goals) return 0;
    const days = new Set();
    for (const g of goals) {
      const map = adherenceMaps[g.id] || {};
      Object.entries(map).forEach(([d, s]) => {
        if (s === "hit" || s === "soft") days.add(d);
      });
    }
    return days.size;
  }, [goals, adherenceMaps]);

  if (goals === null) {
    return (
      <div style={{ minHeight: "100vh", background: PAPER.bg, color: PAPER.ink, fontFamily: FONT.sans, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: PAPER.dim, fontSize: 15 }}>Reading your vault…</p>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: PAPER.bg, color: PAPER.ink, fontFamily: FONT.sans, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
          <p style={{ color: PAPER.dim }}>
            Nothing to look back on yet — set your first goal on{" "}
            <Link to="/" style={{ color: PAPER.ink }}>Life</Link>.
          </p>
        </div>
      </div>
    );
  }

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
              {YEAR} · a year in progress
            </div>
            <h1 style={{ fontFamily: FONT.serif, fontWeight: 500, fontSize: 30, margin: 0, letterSpacing: "-0.01em" }}>
              Your year, day by day
            </h1>
          </div>
        </header>

        {/* Goal pen chips — pick a goal to hold its pen and tap days */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px", margin: "20px 0 10px" }}>
          {goals.map((g) => {
            const v = CATS[g.cat] ?? { color: PAPER.faint };
            const isPen = penId === g.id;
            const dimmed = penId && !isPen;
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
                  background: isPen ? PAPER.card : "transparent",
                  border: `1px solid ${isPen ? PAPER.line : "transparent"}`,
                  borderRadius: 999,
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "46% 54% 52% 48%",
                    background: v.color,
                    opacity: dimmed ? 0.3 : 0.8,
                  }}
                />
                {g.name}
                {isPen && penDays > 0 && (
                  <span style={{ color: PAPER.dim, fontVariantNumeric: "tabular-nums" }}>· {penDays} days</span>
                )}
              </button>
            );
          })}
        </div>

        {/* One quiet line of guidance / accumulation. Never a deficit. */}
        <div style={{ fontSize: 13, color: PAPER.dim, margin: "0 0 22px" }}>
          {pen ? (
            <>Tap the days you moved <em>{pen.name}</em> — each tap writes a log entry.</>
          ) : totalMarkedDays === 0 ? (
            <>Pick a goal above, then tap the days you moved it. That's the whole ritual.</>
          ) : (
            <>{totalMarkedDays} day{totalMarkedDays === 1 ? "" : "s"} marked this year.</>
          )}
        </div>

        {/* The focused goal's ambition */}
        {focus && (
          <div
            style={{
              margin: "-6px 0 22px",
              padding: "12px 16px",
              background: PAPER.card,
              border: `1px solid ${PAPER.line}`,
              borderRadius: 16,
              fontSize: 13.5,
              lineHeight: 1.55,
              color: PAPER.ink,
            }}
          >
            <span style={{ fontFamily: FONT.serif, fontStyle: "italic" }}>"{focus.ambition}"</span>
            {focus.period && (
              <span style={{ color: PAPER.dim }}>
                {" "}— {focus.period.label?.toLowerCase()}: {focus.period.target}
              </span>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "26px 22px" }}>
          {MONTHS.map((_, i) => (
            <MonthBlock
              key={i}
              monthIdx={i}
              goals={goals}
              adherenceMaps={adherenceMaps}
              focus={focus}
              pen={pen}
              onDayTap={onDayTap}
              setTip={setTip}
            />
          ))}
        </div>

        {tip && tip.marks.length > 0 && (
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
            <span style={{ color: PAPER.dim, fontVariantNumeric: "tabular-nums" }}>
              {tip.month} {tip.day}
            </span>
            {tip.marks.map(({ g, status }) => {
              const color = status === "off" ? PAPER.whisper : CATS[g.cat]?.color ?? PAPER.faint;
              return (
                <span key={g.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 11,
                      height: 9,
                      borderRadius: "46% 54% 52% 48%",
                      background: color,
                    }}
                  />
                  {g.name}
                </span>
              );
            })}
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
