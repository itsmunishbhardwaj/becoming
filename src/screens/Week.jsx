import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { PAPER, FONT } from "../tokens.js";
import { listGoals, readLogsInRange, appendLog, deleteLogEvent } from "../data/store.js";
import { dailyAdherence } from "../data/adherence.js";
import { isScheduledDay as cadenceIsScheduledDay } from "../data/goalTypes/cadence.js";
import { todayLocalISO, addDaysLocalISO } from "../lib/date.js";
import { classifySwipe } from "../lib/swipe.js";
import DayCell from "../components/DayCell.jsx";
import PenChips from "../components/PenChips.jsx";

const DAY_LETTERS = ["S","M","T","W","T","F","S"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function sundayOf(iso) {
  const d = new Date(iso + "T00:00:00");
  const dow = d.getDay();
  return addDaysLocalISO(iso, -dow);
}

function fmtRange(startIso, endIso) {
  const s = new Date(startIso + "T00:00:00");
  const e = new Date(endIso + "T00:00:00");
  const sm = MONTH_SHORT[s.getMonth()];
  const em = MONTH_SHORT[e.getMonth()];
  const yr = e.getFullYear();
  if (s.getMonth() === e.getMonth()) return `${sm} ${s.getDate()} – ${e.getDate()}, ${yr}`;
  return `${sm} ${s.getDate()} – ${em} ${e.getDate()}, ${yr}`;
}

export default function Week() {
  const nav = useNavigate();
  const { yyyymmdd } = useParams();
  const [params] = useSearchParams();

  const anchor = ISO_RE.test(yyyymmdd || "") ? sundayOf(yyyymmdd) : null;

  const [goals, setGoals] = useState(null);
  const [logs, setLogs] = useState([]);
  const [penId, setPenId] = useState(() => params.get("pen") || null);
  const [transition, setTransition] = useState(null);

  const rangeFrom = anchor;
  const rangeTo = anchor ? addDaysLocalISO(anchor, 6) : null;

  useEffect(() => {
    if (!anchor) return;
    let alive = true;
    Promise.all([listGoals(), readLogsInRange({ from: rangeFrom, to: rangeTo })])
      .then(([g, l]) => {
        if (!alive) return;
        setGoals(g);
        setLogs(l);
      })
      .catch(() => { if (alive) { setGoals([]); setLogs([]); } });
    return () => { alive = false; };
  }, [yyyymmdd]);

  const goalById = useMemo(
    () => Object.fromEntries((goals ?? []).map((g) => [g.id, g])),
    [goals]
  );
  const pen = penId ? goalById[penId] : null;
  const focus = pen;

  const adherenceMaps = useMemo(() => {
    if (!goals || !anchor) return {};
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

  const onDayTap = useCallback(async ({ dateISO }) => {
    if (!pen) return;
    if (pen.type === "cadence") {
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
      pen.type === "wake"
        ? { verb: "wake", time: "07:00", goalId: pen.id }
        : pen.type === "cadence"
          ? { verb: "session", durationMin: 10, goalId: pen.id }
          : { verb: "done", goalId: pen.id };
    await appendLog(dateISO, event);
    await refreshLogs();
  }, [pen, penEventByDate, refreshLogs]);

  const goPrev = useCallback(() => {
    if (!anchor) return;
    const q = params.toString();
    const next = addDaysLocalISO(anchor, -7);
    setTransition("prev");
    setTimeout(() => setTransition(null), 220);
    nav(`/week/${next}${q ? `?${q}` : ""}`);
  }, [anchor, params, nav]);

  const goNext = useCallback(() => {
    if (!anchor) return;
    const q = params.toString();
    const next = addDaysLocalISO(anchor, 7);
    setTransition("next");
    setTimeout(() => setTransition(null), 220);
    nav(`/week/${next}${q ? `?${q}` : ""}`);
  }, [anchor, params, nav]);

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
  const onPointerDown = (e) => {
    if (e.pointerType !== "touch") return;
    swipeRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const onPointerUp = (e) => {
    const s = swipeRef.current;
    swipeRef.current = null;
    if (!s || e.pointerType !== "touch") return;
    const cls = classifySwipe({
      dx: e.clientX - s.x,
      dy: e.clientY - s.y,
      dtMs: Date.now() - s.t,
    });
    if (cls === "next") goNext();
    if (cls === "prev") goPrev();
  };

  const todayISO = todayLocalISO();

  if (!anchor) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <Link to="/year" style={backLink}>← Year</Link>
          <p style={{ color: PAPER.dim, marginTop: 20 }}>Bad week.</p>
        </div>
      </div>
    );
  }

  const days = Array.from({ length: 7 }, (_, i) => addDaysLocalISO(anchor, i));
  const startIso = anchor;
  const endIso = addDaysLocalISO(anchor, 6);

  return (
    <div style={pageStyle} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <style>{`
        .week-shell { max-width: 720px; margin: 0 auto; }
        @media (min-width: 900px)  { .week-shell { max-width: 960px; } }
        @media (min-width: 1200px) { .week-shell { max-width: 1120px; } }
        .week-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: clamp(8px, 1.2vw, 16px);
        }
        .week-day {
          display: flex; flex-direction: column; align-items: center;
          gap: 6px;
        }
        .week-day-head {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          color: ${PAPER.ink};
          opacity: 0.32;
          text-transform: uppercase;
        }
        .week-day-num {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 15px;
          font-variant-numeric: tabular-nums;
          color: ${PAPER.dim};
        }
        .week-day-num.today {
          color: ${PAPER.ink};
          font-weight: 500;
        }
        .week-cell { width: 100%; max-width: clamp(64px, 8vw, 96px); margin-top: 4px; }
        @keyframes week-slide-in-next  { from { opacity: 0; transform: translateX(30px); }  to { opacity: 1; transform: translateX(0); } }
        @keyframes week-slide-in-prev  { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        .week-slide-next { animation: week-slide-in-next 200ms ease-out; }
        .week-slide-prev { animation: week-slide-in-prev 200ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .week-slide-next, .week-slide-prev { animation: none; }
        }
      `}</style>
      <div className="week-shell">
        <div style={{ padding: "40px 0 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Link to="/year" style={backLink}>← Year</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={goPrev} aria-label="Previous week" style={navBtn}>‹</button>
            <button type="button" onClick={goNext} aria-label="Next week" style={navBtn}>›</button>
          </div>
        </div>

        <header style={{ marginTop: 6, marginBottom: 16 }}>
          <div style={kicker}>WEEK OF</div>
          <h1 style={h1Style} className={transition ? `week-slide-${transition}` : ""}>
            {fmtRange(startIso, endIso)}
          </h1>
        </header>

        {goals && goals.length > 0 && (
          <PenChips goals={goals} penId={penId} onPick={setPenId} />
        )}

        <div className={`week-days ${transition ? `week-slide-${transition}` : ""}`} style={{ marginTop: 20 }}>
          {days.map((iso, i) => {
            const dayNum = Number(iso.slice(8, 10));
            const isToday = iso === todayISO;
            return (
              <div key={iso} className="week-day">
                <span className="week-day-head">{DAY_LETTERS[i]}</span>
                <span className={`week-day-num${isToday ? " today" : ""}`}>{dayNum}</span>
                <div className="week-cell">
                  <DayCell
                    monthIdx={new Date(iso + "T00:00:00").getMonth()}
                    monthName={MONTH_SHORT[new Date(iso + "T00:00:00").getMonth()]}
                    dayIdx={dayNum - 1}
                    isoDate={iso}
                    goals={goals ?? []}
                    adherenceMaps={adherenceMaps}
                    focus={focus}
                    pen={pen}
                    onToggle={pen ? () => onDayTap({ dateISO: iso }) : () => nav(`/day/${iso}`)}
                    onOpen={() => nav(`/day/${iso}`)}
                    isToday={isToday}
                    showHalo={false}
                    blobScale={1.4}
                    hideDayNumber
                  />
                </div>
              </div>
            );
          })}
        </div>

        <footer style={{ marginTop: 48, textAlign: "center", fontSize: 13 }}>
          <Link to="/" style={{ color: PAPER.faint, textDecoration: "none" }}>
            ← back to Life
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
const backLink = { color: PAPER.dim, fontSize: 13, textDecoration: "none" };
const kicker = { fontSize: 11.5, letterSpacing: "1.8px", textTransform: "uppercase", color: PAPER.faint, fontWeight: 500 };
const h1Style = {
  fontFamily: FONT.serif, fontWeight: 500, fontSize: "clamp(28px, 4.5vw, 48px)",
  lineHeight: 1.1, margin: "6px 0 0", color: PAPER.ink, letterSpacing: "-0.01em",
};
const navBtn = {
  width: 36, height: 36, borderRadius: 999,
  border: `1px solid ${PAPER.line}`, background: "transparent",
  color: PAPER.ink, fontSize: 18, cursor: "pointer",
  display: "grid", placeItems: "center",
  fontFamily: "inherit",
};
