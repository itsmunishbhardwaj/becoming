import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { CATS, PAPER, FONT } from "../tokens.js";
import { listGoals, readLogsInRange, appendLog, deleteLogEvent } from "../data/store.js";
import { dailyAdherence } from "../data/adherence.js";
import { isScheduledDay as cadenceIsScheduledDay } from "../data/goalTypes/cadence.js";
import { goalColor } from "../lib/goalColor.js";
import { todayLocalISO } from "../lib/date.js";
import { centroidOf, distanceOf, classifyPinch } from "../lib/pinchGesture.js";
import DayCell from "../components/DayCell.jsx";
import PenChips from "../components/PenChips.jsx";

// ── The spreadsheet gesture, reborn ────────────────────────────────────
// The 2024 sheet's core act: on the day you moved a goal, you coloured its
// cell. Here that's one tap — pick a goal's colour, tap the day, the day is
// blobbed. (docs/origin-spreadsheets.md oblig. 7: capture must be cheaper
// than colouring a cell.)

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LETTERS = ["S","M","T","W","T","F","S"];

function dayLetterFor(iso) {
  return DAY_LETTERS[new Date(iso + "T00:00:00").getDay()];
}

const YEAR = new Date().getFullYear().toString();
const YEAR_FROM = `${YEAR}-01-01`;
const YEAR_TO   = `${YEAR}-12-31`;

// Days per month for the current year (accounts for leap years)
function daysInMonth(monthIdx) {
  return new Date(parseInt(YEAR), monthIdx + 1, 0).getDate();
}

function MonthBlock({ monthIdx, goals, adherenceMaps, focus, pen, penEventByDate, onDayTap, onDayOpen, setTip, todayISO, showHalo, registerCell, onMonthOpen }) {
  const name = MONTHS[monthIdx];
  const count = daysInMonth(monthIdx);
  const leadOffset = new Date(parseInt(YEAR), monthIdx, 1).getDay();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        onClick={() => onMonthOpen(monthIdx)}
        style={{
          fontSize: 14,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: PAPER.dim,
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginBottom: 4,
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        {name}
      </button>
      <div className="year-dow">
        {DAY_LETTERS.map((l, i) => (
          <span key={i} className="year-dow-cell">{l}</span>
        ))}
      </div>
      <div className="year-days">
        {Array.from({ length: leadOffset }, (_, i) => (
          <span key={`lead-${i}`} aria-hidden="true" />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const mm = String(monthIdx + 1).padStart(2, "0");
          const dd = String(i + 1).padStart(2, "0");
          const iso = `${YEAR}-${mm}-${dd}`;
          return (
            <DayCell
              key={iso}
              monthIdx={monthIdx}
              monthName={name}
              dayIdx={i}
              isoDate={iso}
              goals={goals}
              adherenceMaps={adherenceMaps}
              focus={focus}
              pen={pen}
              onToggle={() => onDayTap({ dateISO: iso })}
              onOpen={() => onDayOpen(iso)}
              setTip={setTip}
              isToday={iso === todayISO}
              showHalo={showHalo}
              cellRef={(el) => registerCell(iso, el)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function Year() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [goals, setGoals] = useState(null); // null = loading
  const [logs, setLogs] = useState([]);
  const [tip, setTip] = useState(null);
  const [penId, setPenId] = useState(() => params.get("pen") || null);
  const [todayMarked, setTodayMarked] = useState(false);
  const cellRefs = useRef({});
  const registerCell = useCallback((iso, el) => {
    if (el) cellRefs.current[iso] = el;
    else delete cellRefs.current[iso];
  }, []);
  const monthsShellRef = useRef(null);
  const pinchRef = useRef(null);
  const onPointerDown = useCallback((e) => {
    if (e.pointerType !== "touch") return;
    if (!pinchRef.current) pinchRef.current = { ptrs: new Map(), initDist: null, startMs: null, fired: false };
    pinchRef.current.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pinchRef.current.ptrs.values()];
    if (pts.length === 2) {
      pinchRef.current.initDist = distanceOf(pts);
      pinchRef.current.startMs = Date.now();
    }
  }, []);
  const onPointerMove = useCallback((e) => {
    const s = pinchRef.current;
    if (!s?.ptrs.has(e.pointerId)) return;
    s.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (s.fired || !s.initDist) return;
    const pts = [...s.ptrs.values()];
    if (pts.length < 2) return;
    const ratio = distanceOf(pts) / s.initDist;
    const elapsed = Date.now() - s.startMs;
    if (monthsShellRef.current) {
      monthsShellRef.current.style.transform = `scale(${Math.min(1.4, Math.max(0.8, ratio))})`;
      monthsShellRef.current.style.transition = "none";
    }
    const dir = classifyPinch({ ratio, elapsed });
    if (dir !== "in") return;
    s.fired = true;
    const c = centroidOf(pts);
    let found = null;
    for (const [iso, el] of Object.entries(cellRefs.current)) {
      const r = el.getBoundingClientRect();
      if (c.x >= r.left && c.x <= r.right && c.y >= r.top && c.y <= r.bottom) { found = iso; break; }
    }
    const mm = found ? found.slice(0, 7) : `${YEAR}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    nav(`/month/${mm}${penId ? `?pen=${penId}` : ""}`);
  }, [nav, penId]);
  const _pinchEnd = useCallback((e) => {
    const s = pinchRef.current;
    if (!s?.ptrs.has(e.pointerId)) return;
    s.ptrs.delete(e.pointerId);
    if (s.ptrs.size === 0) {
      pinchRef.current = null;
      if (monthsShellRef.current) { monthsShellRef.current.style.transform = ""; monthsShellRef.current.style.transition = ""; }
    }
  }, []);
  const todayISO = todayLocalISO();
  const onTodayClick = useCallback(() => {
    const el = cellRefs.current[todayISO];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTodayMarked((v) => !v);
  }, [todayISO]);

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

  // Pen goal's existing event per day — the single source of truth for
  // whether a tap should unmark (delete) or mark (append). Independent of
  // adherence status names so it survives future status renames.
  const penEventByDate = useMemo(() => {
    const map = {};
    if (!pen) return map;
    // Any event belonging to the pen goal counts as a mark, regardless of verb.
    for (const l of logs) {
      const evt = l.events.find((e) => e.goalId === pen.id);
      if (evt) map[l.date] = evt;
    }
    return map;
  }, [pen, logs]);

  const onDayTap = useCallback(async ({ dateISO }) => {
    if (!pen) return;
    // Scheduled cadence days are the plan itself — immovable. Tap is a no-op.
    if (pen.baseline?.intervalDays != null) {
      const round = pen.rounds.find((r) => dateISO >= r.startDate && dateISO <= r.endDate);
      if (round && cadenceIsScheduledDay({ date: dateISO, currentRound: round })) return;
    }
    const existing = penEventByDate[dateISO];
    if (existing) {
      await deleteLogEvent(dateISO, existing);
      await refreshLogs();
      return;
    }
    const event =
      typeof pen.baseline === "string"
        ? { verb: "wake", time: "07:00", goalId: pen.id }
        : pen.baseline?.intervalDays != null
          ? { verb: "session", durationMin: 10, goalId: pen.id }
          : { verb: "done", goalId: pen.id };
    await appendLog(dateISO, event);
    await refreshLogs();
  }, [pen, penEventByDate, refreshLogs]);

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
        padding: "0 clamp(20px, 4vw, 56px) 80px",
        touchAction: "pan-y",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={_pinchEnd}
      onPointerCancel={_pinchEnd}
    >
      <style>{`
        .year-shell {
          max-width: 720px;
          margin: 0 auto;
        }
        @media (min-width: 900px)  { .year-shell { max-width: 1080px; } }
        @media (min-width: 1200px) { .year-shell { max-width: 1400px; } }
        /* One quarter per row = 3 columns × 4 rows */
        .year-months {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: clamp(28px, 5vw, 56px) clamp(10px, 3vw, 44px);
          margin-top: clamp(28px, 3vw, 44px);
        }
        .year-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: clamp(2px, 0.4vw, 6px);
          justify-items: center;
          min-width: 0;
        }
        .year-days > svg { max-width: 26px; }
        .year-dow {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: clamp(2px, 0.4vw, 6px);
          justify-items: center;
          min-width: 0;
          margin-bottom: 2px;
        }
        .year-dow-cell {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.06em;
          color: ${PAPER.ink};
          opacity: 0.32;
          line-height: 1;
        }
      `}</style>
      <div className="year-shell">
        <header style={{ padding: "56px 0 8px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div
              className="year-kicker"
              style={{
                fontSize: 14,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: PAPER.dim,
                marginBottom: 12,
              }}
            >
              {YEAR} · a year in progress
            </div>
            <h1 style={{ fontFamily: FONT.serif, fontWeight: 500, fontSize: "clamp(32px, 4.5vw, 56px)", margin: 0, letterSpacing: "-0.01em", lineHeight: 1.05 }}>
              Your year, day by day
            </h1>
          </div>
          <button
            type="button"
            onClick={onTodayClick}
            aria-pressed={todayMarked}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: `1px solid ${todayMarked ? PAPER.ink : PAPER.line}`,
              background: todayMarked ? PAPER.card : "transparent",
              color: PAPER.ink,
              fontFamily: FONT.sans,
              fontSize: 13,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Today
          </button>
        </header>

        <PenChips
          goals={goals}
          penId={penId}
          onPick={setPenId}
          penDayCount={() => penDays}
        />

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

        <div className="year-months" ref={monthsShellRef}>
          {MONTHS.map((_, i) => (
            <MonthBlock
              key={i}
              monthIdx={i}
              goals={goals}
              adherenceMaps={adherenceMaps}
              focus={focus}
              pen={pen}
              penEventByDate={penEventByDate}
              onDayTap={onDayTap}
              onDayOpen={(iso) => nav(`/day/${iso}`)}
              setTip={setTip}
              todayISO={todayISO}
              showHalo={todayMarked}
              registerCell={registerCell}
              onMonthOpen={(mi) => {
                const q = penId ? `?pen=${penId}` : "";
                nav(`/month/${YEAR}-${String(mi + 1).padStart(2, "0")}${q}`);
              }}
            />
          ))}
        </div>

        {tip && (
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
              {new Date(tip.iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })} · {tip.month} {tip.day}
            </span>
            {tip.marks.map(({ g, status }) => {
              const color = status === "off" ? PAPER.whisper : goalColor(g);
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
