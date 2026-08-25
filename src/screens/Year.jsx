import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { PAPER, FONT, RADIUS } from "../tokens.js";
import { listGoals, readLogsInRange, appendLog, deleteLogEvent } from "../data/store.js";
import { dailyAdherence } from "../data/adherence.js";
import { isScheduledDay as cadenceIsScheduledDay } from "../data/goalTypes/cadence.js";
import { goalColor } from "../lib/goalColor.js";
import { todayLocalISO } from "../lib/date.js";
import { centroidOf, distanceOf, classifyPinch } from "../lib/pinchGesture.js";
import DayCell from "../components/DayCell.jsx";

// ── The spreadsheet gesture, reborn ────────────────────────────────────
// The 2024 sheet's core act: on the day you moved a goal, you coloured its
// cell. Here that's one tap — pick a goal's colour, tap the day, the day is
// blobbed.

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LETTERS = ["S","M","T","W","T","F","S"];

const YEAR = new Date().getFullYear().toString();
const YEAR_FROM = `${YEAR}-01-01`;
const YEAR_TO   = `${YEAR}-12-31`;

function daysInMonth(monthIdx) {
  return new Date(parseInt(YEAR), monthIdx + 1, 0).getDate();
}

function MonthBlock({ monthIdx, goals, adherenceMaps, focus, pen, onDayTap, onDayOpen, setTip, todayISO, showHalo, registerCell, onMonthOpen }) {
  const name = MONTHS_FULL[monthIdx];
  const short = MONTHS[monthIdx];
  const count = daysInMonth(monthIdx);
  const leadOffset = new Date(parseInt(YEAR), monthIdx, 1).getDay();
  const radii = [RADIUS.r1, RADIUS.r2];

  return (
    <div
      className="year-month-card"
      style={{
        background: PAPER.card,
        borderRadius: radii[monthIdx % 2],
        padding: "16px 13px 14px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={() => onMonthOpen(monthIdx)}
        className="year-month-btn"
        style={{
          fontFamily: FONT.serif,
          fontWeight: 600,
          fontSize: 15,
          letterSpacing: "-0.01em",
          color: PAPER.dim,
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          textAlign: "left",
          lineHeight: 1.2,
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
              monthName={short}
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
  const [goals, setGoals] = useState(null);
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
      if (monthsShellRef.current) {
        monthsShellRef.current.style.transform = "";
        monthsShellRef.current.style.transition = "";
      }
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

  useEffect(() => { fetchData(); }, [fetchData]);


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

  const penEventByDate = useMemo(() => {
    const map = {};
    if (!pen) return map;
    for (const l of logs) {
      const evt = l.events.find((e) => e.goalId === pen.id);
      if (evt) map[l.date] = evt;
    }
    return map;
  }, [pen, logs]);

  const onDayTap = useCallback(async ({ dateISO }) => {
    if (!pen) return;
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

  const penColor = pen ? goalColor(pen) : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: PAPER.bg,
        color: PAPER.ink,
        fontFamily: FONT.sans,
        padding: "0 clamp(20px, 4vw, 56px) 96px",
        touchAction: "pan-y",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={_pinchEnd}
      onPointerCancel={_pinchEnd}
    >
      <style>{`
        /* tastemaker:2026-08-25 | app-shell | editorial-organic | cool-grey */
        .year-shell { max-width: 760px; margin: 0 auto; }
        @media (min-width: 900px)  { .year-shell { max-width: 1120px; } }
        @media (min-width: 1300px) { .year-shell { max-width: 1480px; } }

        /* ── Month grid ─────────────────────── */
        .year-months {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: clamp(10px, 1.8vw, 20px);
          margin-top: clamp(24px, 3vw, 40px);
        }
        @media (max-width: 560px) {
          .year-months { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 340px) {
          .year-months { grid-template-columns: 1fr; }
        }

        /* ── Month card ─────────────────────── */
        .year-month-card {
          transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1),
                      box-shadow 200ms ease;
        }
        @media (hover: hover) and (pointer: fine) {
          .year-month-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.09), 0 0 0 1px rgba(0,0,0,0.04);
          }
        }

        /* Staggered entrance */
        @keyframes month-enter {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .year-month-card { animation: month-enter 400ms cubic-bezier(0.23, 1, 0.32, 1) both; }
        .year-month-card:nth-child(1)  { animation-delay:   0ms; }
        .year-month-card:nth-child(2)  { animation-delay:  35ms; }
        .year-month-card:nth-child(3)  { animation-delay:  70ms; }
        .year-month-card:nth-child(4)  { animation-delay: 105ms; }
        .year-month-card:nth-child(5)  { animation-delay: 140ms; }
        .year-month-card:nth-child(6)  { animation-delay: 175ms; }
        .year-month-card:nth-child(7)  { animation-delay: 210ms; }
        .year-month-card:nth-child(8)  { animation-delay: 245ms; }
        .year-month-card:nth-child(9)  { animation-delay: 280ms; }
        .year-month-card:nth-child(10) { animation-delay: 315ms; }
        .year-month-card:nth-child(11) { animation-delay: 350ms; }
        .year-month-card:nth-child(12) { animation-delay: 385ms; }

        /* ── Day cells ──────────────────────── */
        .year-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: clamp(2px, 0.4vw, 5px);
          justify-items: center;
          min-width: 0;
        }
        .year-days > svg {
          max-width: 28px;
          transition: opacity 120ms ease, transform 120ms ease;
        }
        @media (hover: hover) and (pointer: fine) {
          .year-days > svg:hover { opacity: 0.65; }
        }
        .year-days > svg:active { transform: scale(0.96); opacity: 0.45; }

        /* ── DOW row ────────────────────────── */
        .year-dow {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: clamp(2px, 0.4vw, 5px);
          justify-items: center;
          min-width: 0;
          margin-bottom: 2px;
        }
        .year-dow-cell {
          font-family: 'Instrument Sans', system-ui, sans-serif;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.05em;
          color: ${PAPER.ink};
          opacity: 0.45;
          line-height: 1;
        }

        /* ── Month name button ──────────────── */
        .year-month-btn { transition: opacity 120ms ease; }
        @media (hover: hover) and (pointer: fine) {
          .year-month-btn:hover { opacity: 0.55; }
        }
        .year-month-btn:active { opacity: 0.35; }

        /* ── Goal orb chips ─────────────────── */
        .year-chips {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding: 28px 0 4px;
          scrollbar-width: none;
        }
        .year-chips::-webkit-scrollbar { display: none; }

        .year-chip {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 6px 10px 8px;
          border-radius: 14px;
          flex-shrink: 0;
          transition: background 150ms ease, opacity 150ms ease;
        }
        @media (hover: hover) and (pointer: fine) {
          .year-chip:hover { background: ${PAPER.panel}; }
        }
        .year-chip:active { background: ${PAPER.line}; }

        .year-chip-orb {
          transition: box-shadow 200ms ease;
        }

        /* ── Tooltip ────────────────────────── */
        .year-tip {
          transition: opacity 180ms cubic-bezier(0.23, 1, 0.32, 1),
                      transform 180ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        @starting-style {
          .year-tip { opacity: 0; transform: translateX(-50%) translateY(8px); }
        }

        /* ── Footer link ────────────────────── */
        .year-footer-link {
          color: ${PAPER.faint};
          text-decoration: none;
          transition: color 120ms ease;
          font-size: 13px;
        }
        @media (hover: hover) and (pointer: fine) {
          .year-footer-link:hover { color: ${PAPER.dim}; }
        }

        @media (prefers-reduced-motion: reduce) {
          .year-month-card { animation: none; transition: none; }
          .year-tip { transition: none; }
        }
      `}</style>

      <div className="year-shell">

        {/* ── Nav ───────────────────────────────────────────────── */}
        <nav style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "44px 0 0",
          gap: 16,
        }}>
          <div style={{
            fontFamily: FONT.serif,
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: PAPER.dim,
          }}>
            Becoming
          </div>
          <Link to="/" style={{ fontSize: 12, color: PAPER.faint, textDecoration: "none", transition: "color 120ms ease" }}
            onMouseEnter={e => e.currentTarget.style.color = PAPER.dim}
            onMouseLeave={e => e.currentTarget.style.color = PAPER.faint}
          >
            ← Life
          </Link>
        </nav>

        {/* ── Hero header ───────────────────────────────────────── */}
        <header style={{
          marginTop: 32,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: PAPER.faint,
              marginBottom: 10,
              fontFamily: FONT.sans,
            }}>
              {YEAR} · in progress
            </div>
            <h1 style={{
              fontFamily: FONT.serif,
              fontWeight: 600,
              fontSize: "clamp(34px, 5vw, 60px)",
              margin: 0,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: PAPER.ink,
            }}>
              Your year,<br />day by day.
            </h1>
          </div>

          {/* Accumulation stat — the emotional anchor */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            {totalMarkedDays > 0 ? (
              <>
                <div style={{
                  fontFamily: FONT.serif,
                  fontWeight: 600,
                  fontSize: "clamp(48px, 6vw, 80px)",
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                  color: penColor || PAPER.ink,
                  transition: "color 400ms ease",
                }}>
                  {totalMarkedDays}
                </div>
                <div style={{
                  fontFamily: FONT.sans,
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: PAPER.faint,
                  marginTop: 5,
                }}>
                  days marked
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={onTodayClick}
                style={{
                  padding: "7px 16px",
                  borderRadius: 999,
                  border: `1px solid ${todayMarked ? PAPER.ink : PAPER.line}`,
                  background: todayMarked ? PAPER.card : "transparent",
                  color: PAPER.ink,
                  fontFamily: FONT.sans,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "border-color 150ms ease, background 150ms ease",
                }}
              >
                Today
              </button>
            )}
            {totalMarkedDays > 0 && (
              <button
                type="button"
                onClick={onTodayClick}
                style={{
                  marginTop: 8,
                  display: "block",
                  marginLeft: "auto",
                  padding: "5px 14px",
                  borderRadius: 999,
                  border: `1px solid ${todayMarked ? PAPER.ink : PAPER.line}`,
                  background: todayMarked ? PAPER.card : "transparent",
                  color: PAPER.faint,
                  fontFamily: FONT.sans,
                  fontSize: 11,
                  cursor: "pointer",
                  transition: "border-color 150ms ease, background 150ms ease, color 150ms ease",
                  letterSpacing: "0.04em",
                }}
              >
                today
              </button>
            )}
          </div>
        </header>

        {/* ── Goal orb chips ────────────────────────────────────── */}
        <div className="year-chips" role="group" aria-label="Select a goal to log">
          {goals.map((g) => {
            const isPen = penId === g.id;
            const dimmed = penId && !isPen;
            const color = goalColor(g);
            return (
              <button
                key={g.id}
                type="button"
                className="year-chip"
                onClick={() => setPenId(isPen ? null : g.id)}
                aria-pressed={isPen}
                style={{ opacity: dimmed ? 0.28 : 1 }}
              >
                <div
                  className="year-chip-orb orb-breathe"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: RADIUS.blob,
                    background: `radial-gradient(circle at 35% 30%, ${color}, ${color}99 80%)`,
                    boxShadow: isPen ? `0 0 0 2.5px ${PAPER.ink}` : "none",
                  }}
                />
                <div style={{
                  fontFamily: FONT.sans,
                  fontSize: 10.5,
                  color: isPen ? PAPER.ink : PAPER.faint,
                  letterSpacing: "0.02em",
                  textAlign: "center",
                  maxWidth: 72,
                  lineHeight: 1.3,
                  transition: "color 150ms ease",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {g.name}
                </div>
                {isPen && penDays > 0 && (
                  <div style={{
                    fontFamily: FONT.sans,
                    fontSize: 9.5,
                    color: PAPER.faint,
                    letterSpacing: "0.1em",
                    marginTop: -4,
                  }}>
                    {penDays}d
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Guidance / accumulation line ──────────────────────── */}
        <div style={{
          fontSize: 13,
          color: PAPER.dim,
          margin: "8px 0 0",
          minHeight: 20,
          transition: "opacity 200ms ease",
        }}>
          {pen ? (
            <>Tap the days you moved <em style={{ fontFamily: FONT.serif, fontStyle: "italic" }}>{pen.name}</em>.</>
          ) : totalMarkedDays === 0 ? (
            <>Pick a goal above, then tap the days you moved it.</>
          ) : null}
        </div>

        {/* ── Focused goal's ambition ───────────────────────────── */}
        {focus && (
          <div style={{
            margin: "16px 0 0",
            borderInlineStart: `2px solid ${goalColor(focus)}`,
            paddingInlineStart: 16,
            fontSize: 14,
            lineHeight: 1.6,
            color: PAPER.ink,
          }}>
            <span style={{ fontFamily: FONT.serif, fontStyle: "italic" }}>"{focus.ambition}"</span>
            {focus.period && (
              <span style={{ color: PAPER.faint, fontSize: 12 }}>
                {" "}— {focus.period.label?.toLowerCase()}
              </span>
            )}
          </div>
        )}

        {/* ── 12-month grid ─────────────────────────────────────── */}
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

        {/* ── Hover tooltip ─────────────────────────────────────── */}
        {tip && (
          <div
            className="year-tip"
            style={{
              position: "fixed",
              bottom: 28,
              left: "50%",
              transform: "translateX(-50%) translateY(0)",
              background: PAPER.card,
              border: `1px solid ${PAPER.line}`,
              boxShadow: PAPER.shadow,
              borderRadius: 16,
              padding: "11px 18px",
              display: "flex",
              gap: 14,
              alignItems: "center",
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: PAPER.dim, fontVariantNumeric: "tabular-nums", fontFamily: FONT.sans }}>
              {new Date(tip.iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })} · {tip.month} {tip.day}
            </span>
            {tip.marks.map(({ g, status }) => {
              const color = status === "off" ? PAPER.whisper : goalColor(g);
              return (
                <span key={g.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{
                    width: 14,
                    height: 14,
                    borderRadius: "67% 33% 52% 48% / 42% 58% 35% 65%",
                    background: `radial-gradient(circle at 35% 30%, ${color}, ${color}99 80%)`,
                    flexShrink: 0,
                  }} />
                  <span style={{ color: PAPER.ink }}>{g.name}</span>
                </span>
              );
            })}
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────── */}
        <footer style={{ marginTop: 48, textAlign: "center" }}>
          <a href="/" className="year-footer-link" onClick={e => { e.preventDefault(); nav("/"); }}>
            ← Life
          </a>
        </footer>

      </div>
    </div>
  );
}
