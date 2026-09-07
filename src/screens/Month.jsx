import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Link, useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { centroidOf, distanceOf, classifyPinch } from "../lib/pinchGesture.js";
import { PAPER, FONT } from "../tokens.js";
import { listGoals, readLogsInRange, appendLog, deleteLogEvent } from "../data/store.js";
import { dailyAdherence } from "../data/adherence.js";
import { planDayTap } from "../data/dayTap.js";
import { projectedDates } from "../data/projection.js";
import { todayLocalISO } from "../lib/date.js";
import { classifySwipe } from "../lib/swipe.js";
import PenChips from "../components/PenChips.jsx";
import MonthGrid from "../components/MonthGrid.jsx";
import { daysInMonth, isoAtDay } from "../lib/calendarMonth.js";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const YM_RE = /^(\d{4})-(\d{2})$/;

function parseYm(param) {
  const m = param?.match(YM_RE);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  return { year: y, monthIdx: mo - 1 };
}

function fmtYm(year, monthIdx) {
  return `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
}

function stepMonth({ year, monthIdx }, delta) {
  let m = monthIdx + delta;
  let y = year;
  while (m < 0)  { m += 12; y -= 1; }
  while (m > 11) { m -= 12; y += 1; }
  return { year: y, monthIdx: m };
}

export default function Month() {
  const nav = useNavigate();
  const { yyyymm } = useParams();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const parsed = parseYm(yyyymm);

  const [goals, setGoals] = useState(() => location.state?.goals ?? null);
  const [logs, setLogs] = useState(() => location.state?.logs ?? []);
  const [penId, setPenId] = useState(() => params.get("pen") || null);
  const [transition, setTransition] = useState(null); // "next" | "prev" | null
  const [projecting, setProjecting] = useState(false);

  const rangeFrom = parsed ? isoAtDay(parsed.year, parsed.monthIdx, 0) : null;
  const rangeTo   = parsed ? isoAtDay(parsed.year, parsed.monthIdx, daysInMonth(parsed.year, parsed.monthIdx) - 1) : null;

  useEffect(() => {
    if (!parsed) return;
    let alive = true;
    Promise.all([listGoals(), readLogsInRange({ from: rangeFrom, to: rangeTo })])
      .then(([g, l]) => {
        if (!alive) return;
        setGoals(g);
        setLogs(l);
      })
      .catch(() => { if (alive) { setGoals([]); setLogs([]); } });
    return () => { alive = false; };
  }, [yyyymm]);

  const goalById = useMemo(
    () => Object.fromEntries((goals ?? []).map((g) => [g.id, g])),
    [goals]
  );
  const pen = penId ? goalById[penId] : null;
  const focus = pen;

  const adherenceMaps = useMemo(() => {
    if (!goals || !parsed) return {};
    const out = {};
    for (const g of goals) {
      out[g.id] = dailyAdherence({ goal: g, logs, from: rangeFrom, to: rangeTo });
    }
    return out;
  }, [goals, logs, rangeFrom, rangeTo]);

  const penEventByDate = useMemo(() => {
    const map = {};
    if (!pen) return map;
    for (const l of logs) {
      const evt = l.events.find((e) => e.goalId === pen.id);
      if (evt) map[l.date] = evt;
    }
    return map;
  }, [pen, logs]);

  const refreshLogs = useCallback(async () => {
    const ls = await readLogsInRange({ from: rangeFrom, to: rangeTo });
    setLogs(ls);
  }, [rangeFrom, rangeTo]);

  const projectedSet = useMemo(() => {
    if (!projecting || !pen?.endDate || !rangeFrom || !rangeTo) return null;
    const from = todayLocalISO() > rangeFrom ? todayLocalISO() : rangeFrom;
    const to = pen.endDate < rangeTo ? pen.endDate : rangeTo;
    if (to < from) return new Set();
    return new Set(projectedDates({ goal: pen, from, to }));
  }, [projecting, pen, rangeFrom, rangeTo]);

  const pickPen = useCallback((id) => {
    setPenId(id);
    setProjecting(false);
  }, []);

  const onHoldStart = useCallback((id) => {
    setPenId(id);
    setProjecting(true);
  }, []);

  const onHoldEnd = useCallback(() => {
    setProjecting(false);
  }, []);

  const onDayTap = useCallback(async ({ dateISO }) => {
    if (!pen) return;
    const plan = planDayTap({ goal: pen, dateISO, existingEvent: penEventByDate[dateISO] });
    if (!plan) return;
    if (plan.type === "delete") await deleteLogEvent(dateISO, plan.event);
    else await appendLog(dateISO, plan.event);
    await refreshLogs();
  }, [pen, penEventByDate, refreshLogs]);

  const goPrev = useCallback(() => {
    if (!parsed) return;
    const next = stepMonth(parsed, -1);
    setTransition("prev");
    setTimeout(() => setTransition(null), 220);
    const q = params.toString();
    nav(`/month/${fmtYm(next.year, next.monthIdx)}${q ? `?${q}` : ""}`);
  }, [parsed, params, nav]);

  const goNext = useCallback(() => {
    if (!parsed) return;
    const next = stepMonth(parsed, 1);
    setTransition("next");
    setTimeout(() => setTransition(null), 220);
    const q = params.toString();
    nav(`/month/${fmtYm(next.year, next.monthIdx)}${q ? `?${q}` : ""}`);
  }, [parsed, params, nav]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  const swipeRef = useRef(null);
  const pinchRef = useRef(null);
  const daysShellRef = useRef(null);

  const onPointerDown = (e) => {
    if (e.pointerType !== "touch") return;
    if (!pinchRef.current) pinchRef.current = { ptrs: new Map(), initDist: null, startMs: null, fired: false };
    pinchRef.current.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pinchRef.current.ptrs.values()];
    if (pts.length === 1) {
      swipeRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    } else {
      swipeRef.current = null;
      pinchRef.current.initDist = distanceOf(pts);
      pinchRef.current.startMs = Date.now();
    }
  };

  const onPointerMove = (e) => {
    const s = pinchRef.current;
    if (!s?.ptrs.has(e.pointerId)) return;
    s.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (s.fired || !s.initDist || s.ptrs.size < 2) return;
    const pts = [...s.ptrs.values()];
    const ratio = distanceOf(pts) / s.initDist;
    const elapsed = Date.now() - s.startMs;
    if (daysShellRef.current) {
      daysShellRef.current.style.transform = `scale(${Math.min(1.4, Math.max(0.8, ratio))})`;
      daysShellRef.current.style.transition = "none";
    }
    const dir = classifyPinch({ ratio, elapsed });
    if (!dir) return;
    s.fired = true;
    if (daysShellRef.current) { daysShellRef.current.style.transform = ""; daysShellRef.current.style.transition = ""; }
    const q = params.toString();
    if (dir === "out") {
      nav(`/year${q ? `?${q}` : ""}`);
    } else {
      // pinch-in → week row under centroid
      const c = centroidOf(pts);
      const pills = Array.from(document.querySelectorAll("[aria-label^='Week of']"));
      let best = null;
      let bestDy = Infinity;
      for (const btn of pills) {
        const r = btn.getBoundingClientRect();
        const midY = r.top + r.height / 2;
        const dy = Math.abs(c.y - midY);
        if (dy < bestDy) { bestDy = dy; best = btn; }
      }
      const iso = best?.getAttribute("aria-label")?.replace("Week of ", "") ?? null;
      if (iso) nav(`/week/${iso}${q ? `?${q}` : ""}`);
    }
  };

  const onPointerUp = (e) => {
    const s = pinchRef.current;
    if (s?.ptrs.has(e.pointerId)) {
      s.ptrs.delete(e.pointerId);
      if (s.ptrs.size === 0) {
        pinchRef.current = null;
        if (daysShellRef.current) { daysShellRef.current.style.transform = ""; daysShellRef.current.style.transition = ""; }
      }
    }
    // Only classify swipe if no pinch fired
    const sw = swipeRef.current;
    swipeRef.current = null;
    if (!sw || e.pointerType !== "touch" || pinchRef.current?.fired) return;
    const cls = classifySwipe({ dx: e.clientX - sw.x, dy: e.clientY - sw.y, dtMs: Date.now() - sw.t });
    if (cls === "next") goNext();
    if (cls === "prev") goPrev();
  };

  const todayISO = todayLocalISO();

  if (!parsed) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={viewPillWrap}>
            <Link to="/year" style={viewPillItem(false)}>Y</Link>
            <span style={viewPillItem(true)}>M</span>
            <Link to={`/week/${todayISO}`} style={viewPillItem(false)}>W</Link>
          </div>
          <p style={{ color: PAPER.dim, marginTop: 20 }}>Couldn't load this month.</p>
        </div>
      </div>
    );
  }

  const { year, monthIdx } = parsed;
  const monthName = MONTH_NAMES[monthIdx];

  return (
    <div style={pageStyle} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <style>{`
        .month-shell { max-width: 720px; margin: 0 auto; }
        @media (min-width: 900px)  { .month-shell { max-width: 960px; } }
        @media (min-width: 1200px) { .month-shell { max-width: 1120px; } }
        @keyframes month-slide-in-next  { from { opacity: 0; transform: translateX(24px); }  to { opacity: 1; transform: translateX(0); } }
        @keyframes month-slide-in-prev  { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: translateX(0); } }
        .month-slide-next { animation: month-slide-in-next 180ms ease-out; }
        .month-slide-prev { animation: month-slide-in-prev 180ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .month-slide-next, .month-slide-prev { animation: none; }
        }
      `}</style>
      <div className="month-shell">
        <div style={{ padding: "40px 0 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={viewPillWrap}>
            <Link to={`/year${penId ? `?pen=${penId}` : ""}`} style={viewPillItem(false)}>Y</Link>
            <span style={viewPillItem(true)}>M</span>
            <Link to={`/week/${year}-${String(monthIdx + 1).padStart(2, "0")}-01${penId ? `?pen=${penId}` : ""}`} style={viewPillItem(false)}>W</Link>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={goPrev} aria-label="Previous month" style={navBtn}>‹</button>
            <button type="button" onClick={goNext} aria-label="Next month" style={navBtn}>›</button>
          </div>
        </div>

        <header style={{ marginTop: 6, marginBottom: 12 }}>
          <div style={kicker}>{year}</div>
          <h1 style={h1Style} className={transition ? `month-slide-${transition}` : ""}>
            {monthName}
          </h1>
        </header>

        {goals && goals.length > 0 && (
          <PenChips goals={goals} penId={penId} onPick={pickPen} onHoldStart={onHoldStart} onHoldEnd={onHoldEnd} />
        )}

        <MonthGrid
          year={year}
          monthIdx={monthIdx}
          goals={goals ?? []}
          adherenceMaps={adherenceMaps}
          focus={focus}
          pen={pen}
          onDayTap={(iso) => onDayTap({ dateISO: iso })}
          onOpenDay={(iso) => nav(`/day/${iso}`)}
          todayISO={todayISO}
          blobScale={1.6}
          projectedDates={projectedSet}
          showWeekPills
          onWeekPillClick={(sundayISO) => {
            const q = params.toString();
            nav(`/week/${sundayISO}${q ? `?${q}` : ""}`);
          }}
          transitionClassName={transition ? `month-slide-${transition}` : ""}
          gridRef={daysShellRef}
        />

        <footer style={{ marginTop: 40, textAlign: "center", fontSize: 13 }}>
          <Link to="/" style={{ color: PAPER.faint, textDecoration: "none" }}>
            ← Life
          </Link>
        </footer>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: PAPER.bg,
  color: PAPER.ink,
  fontFamily: FONT.sans,
  padding: "clamp(20px, 3vw, 40px) clamp(20px, 4vw, 64px) 80px",
  touchAction: "pan-y",
};
const containerStyle = { maxWidth: 720, margin: "0 auto" };
const viewPillWrap = {
  display: "inline-flex", borderRadius: 999,
  border: `1px solid ${PAPER.line}`, overflow: "hidden",
};
const viewPillItem = (active) => ({
  padding: "5px 11px", fontSize: 12, fontWeight: 500,
  letterSpacing: "0.05em", textDecoration: "none", lineHeight: 1,
  background: active ? PAPER.ink : "transparent",
  color: active ? PAPER.bg : PAPER.dim,
  cursor: active ? "default" : "pointer",
  border: "none", fontFamily: "inherit",
});
const kicker = { fontSize: 11.5, letterSpacing: "1.8px", textTransform: "uppercase", color: PAPER.faint, fontWeight: 500 };
const h1Style = {
  fontFamily: FONT.serif, fontWeight: 500, fontSize: "clamp(36px, 5.5vw, 64px)",
  lineHeight: 1.05, margin: "6px 0 0", color: PAPER.ink, letterSpacing: "-0.01em",
};
const navBtn = {
  width: 36, height: 36, borderRadius: 999,
  border: `1px solid ${PAPER.line}`, background: "transparent",
  color: PAPER.ink, fontSize: 18, cursor: "pointer",
  display: "grid", placeItems: "center",
  fontFamily: "inherit",
};
