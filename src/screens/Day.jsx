import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { PAPER, FONT, TYPE, RADIUS } from "../tokens.js";
import { listGoals, readLog, appendLog, deleteLogEvent, saveNote } from "../data/store.js";
import { goalColor } from "../lib/goalColor.js";
import { todayLocalISO, addDaysLocalISO } from "../lib/date.js";
import TimeGrid from "../components/TimeGrid.jsx";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const LABEL_W = 96; // must match TimeGrid gutter

function parseDate(iso) {
  return new Date(iso + "T00:00:00");
}

function formatEvent(evt) {
  if (evt.verb === "wake" && evt.time) return `wake ${evt.time}`;
  if (evt.verb === "session") {
    if (evt.time && evt.durationMin != null) return `session ${evt.time} · ${evt.durationMin}min`;
    if (evt.durationMin != null) return `session ${evt.durationMin}min`;
    if (evt.time) return `session ${evt.time}`;
  }
  if (evt.verb === "done") return "done";
  return evt.payload || evt.verb;
}

function defaultEventFor(goal) {
  if (typeof goal.baseline === "string") return { verb: "wake", time: "07:00", goalId: goal.id };
  if (goal.baseline?.intervalDays != null) return { verb: "session", durationMin: 10, goalId: goal.id };
  return { verb: "done", goalId: goal.id };
}

// ── Mini calendar ────────────────────────────────────────────────────────────

function MiniCalendar({ viewDate, onSelectDate }) {
  const today = todayLocalISO();
  const viewD = ISO_RE.test(viewDate) ? parseDate(viewDate) : new Date();

  const [month, setMonth] = useState(() => ({
    y: viewD.getFullYear(), m: viewD.getMonth(),
  }));

  useEffect(() => {
    const d = ISO_RE.test(viewDate) ? parseDate(viewDate) : new Date();
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
  }, [viewDate]);

  function prevMonth() {
    setMonth(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 });
  }
  function nextMonth() {
    setMonth(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 });
  }

  const firstWeekday = new Date(month.y, month.m, 1).getDay();
  const totalDays = new Date(month.y, month.m + 1, 0).getDate();
  const cells = Array(firstWeekday).fill(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: PAPER.ink, letterSpacing: "0.01em" }}>
          {MONTHS[month.m]} {month.y}
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          <button onClick={prevMonth} style={arrowBtn}>‹</button>
          <button onClick={nextMonth} style={arrowBtn}>›</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 2 }}>
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 10.5, color: PAPER.faint, fontWeight: 500, padding: "2px 0" }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const iso = `${month.y}-${String(month.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = iso === today;
          const isSelected = iso === viewDate && !isToday;
          return (
            <button
              key={iso}
              onClick={() => onSelectDate(iso)}
              style={{
                width: "100%", aspectRatio: "1",
                borderRadius: "50%",
                border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isToday ? PAPER.ink : isSelected ? "#FFFFFF" : "transparent",
                color: isToday ? "#fff" : PAPER.ink,
                fontSize: 11,
                fontWeight: isToday || isSelected ? 600 : 400,
                cursor: "pointer",
                fontFamily: FONT.sans,
                boxShadow: isSelected ? `inset 0 0 0 1px ${PAPER.line}` : "none",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── View switcher ────────────────────────────────────────────────────────────

function ViewSwitcher() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 12px 6px 14px",
          borderRadius: 999,
          border: `1px solid ${PAPER.line}`,
          background: "#FFFFFF",
          color: PAPER.ink,
          fontSize: 12.5, fontFamily: FONT.sans, cursor: "pointer",
          fontWeight: 500,
        }}
      >
        Day
        <span style={{ fontSize: 9, color: PAPER.dim, marginTop: 1 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: "#FFFFFF",
          border: `1px solid ${PAPER.line}`,
          borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          minWidth: 150, zIndex: 50,
          overflow: "hidden",
          padding: "4px 0",
        }}>
          <button type="button" onClick={() => setOpen(false)} style={menuItemStyle(true)}>Day</button>
          <button type="button" onClick={() => { setOpen(false); nav("/year"); }} style={menuItemStyle(false)}>Year</button>
        </div>
      )}
    </div>
  );
}

function menuItemStyle(active) {
  return {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    width: "100%", padding: "8px 14px",
    border: "none", background: active ? PAPER.bg : "transparent",
    color: PAPER.ink, fontSize: 12.5, fontFamily: FONT.sans,
    cursor: "pointer", textAlign: "left",
    fontWeight: active ? 600 : 400,
  };
}

// ── Main Day screen ──────────────────────────────────────────────────────────

export default function Day() {
  const { date } = useParams();
  const nav = useNavigate();
  const today = todayLocalISO();

  const [goals, setGoals] = useState([]);
  const [events, setEvents] = useState(null);
  const [notes, setNotes] = useState({});
  const [noteStatus, setNoteStatus] = useState({});
  const [busy, setBusy] = useState(false);
  const [desktop, setDesktop] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  const [panelTab, setPanelTab] = useState("log");

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const h = (e) => setDesktop(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    if (!ISO_RE.test(date)) { setEvents([]); return; }
    let alive = true;
    Promise.all([listGoals(), readLog(date)])
      .then(([g, log]) => {
        if (!alive) return;
        setGoals(g);
        setEvents(log?.events || []);
        setNotes(log?.notes || {});
      })
      .catch(() => { if (alive) { setGoals([]); setEvents([]); setNotes({}); } });
    return () => { alive = false; };
  }, [date]);

  async function refresh() {
    const log = await readLog(date).catch(() => null);
    setEvents(log?.events || []);
    setNotes(log?.notes || {});
  }

  async function onAdd(goal) {
    const evt = defaultEventFor(goal);
    if (!evt) return;
    setBusy(true);
    try { await appendLog(date, evt); await refresh(); }
    finally { setBusy(false); }
  }

  async function onDelete(evt) {
    setBusy(true);
    try { await deleteLogEvent(date, evt); await refresh(); }
    finally { setBusy(false); }
  }

  async function onNoteBlur(goalId, text) {
    const original = notes[goalId] || "";
    if (text === original) return;
    setNoteStatus((s) => ({ ...s, [goalId]: "saving" }));
    try {
      await saveNote(date, goalId, text);
      setNotes((n) => {
        const next = { ...n };
        if (text.trim() === "") delete next[goalId];
        else next[goalId] = text;
        return next;
      });
      setNoteStatus((s) => ({ ...s, [goalId]: "saved" }));
    } catch {
      setNoteStatus((s) => ({ ...s, [goalId]: undefined }));
    }
  }

  async function onTimeGridToggle(goal, wasMarked) {
    setBusy(true);
    try {
      if (wasMarked) {
        const toRemove = (events || []).filter((e) => e.goalId === goal.id);
        for (const evt of toRemove) await deleteLogEvent(date, evt);
      } else {
        await appendLog(date, { verb: "tap", goalId: goal.id, payload: "" });
      }
      await refresh();
    } finally { setBusy(false); }
  }

  const goalById = Object.fromEntries(goals.map((g) => [g.id, g]));
  const markedGoalIds = new Set((events || []).map((e) => e.goalId));
  const activeGoals = goals.filter((g) => g.state === "active" || g.state === "drift");

  const isToday = date === today;
  const dateObj = ISO_RE.test(date) ? parseDate(date) : new Date();
  const weekday = WEEKDAYS[dateObj.getDay()].toUpperCase();
  const dayNum = dateObj.getDate();
  const navDateStr = ISO_RE.test(date)
    ? `${MONTHS[dateObj.getMonth()]} ${dayNum}, ${dateObj.getFullYear()}`
    : "";

  const topOffset = desktop ? 48 : 0;
  const bottomOffset = desktop ? 0 : 60;

  const sidebarContent = (
    <div data-lenis-prevent style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", overflowX: "hidden" }}>
      {!desktop && (
        <div style={{ padding: "14px 14px 0", display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={() => setSidebarOpen(false)} style={closeBtnStyle}>✕</button>
        </div>
      )}

      <div style={{ padding: "18px 20px 12px 28px" }}>
        <MiniCalendar viewDate={date} onSelectDate={(iso) => { nav(`/day/${iso}`); if (!desktop) setSidebarOpen(false); }} />
      </div>

      <div style={{ padding: "6px 20px 12px 28px" }}>
        <div style={sectionHeaderStyle}>My goals</div>
        {activeGoals.length === 0 && (
          <div style={{ fontSize: 13, color: PAPER.faint, fontStyle: "italic", marginTop: 8 }}>No active goals</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 6 }}>
          {activeGoals.map((g) => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 2px" }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: goalColor(g), flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, color: PAPER.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Logged / Notes / Add tabs */}
      <div style={{ flex: 1, padding: "6px 20px 32px 28px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[["log", "Logged"], ["notes", "Notes"], ["add", "Add"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPanelTab(key)}
              style={{
                padding: "4px 11px",
                borderRadius: 999,
                border: `1px solid ${panelTab === key ? PAPER.dim : PAPER.line}`,
                background: panelTab === key ? PAPER.ink : "transparent",
                color: panelTab === key ? "#fff" : PAPER.dim,
                fontSize: 11.5,
                fontFamily: FONT.sans,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {events === null && <p style={{ color: PAPER.faint, fontSize: 12 }}>Reading your vault…</p>}

        {panelTab === "log" && events !== null && (
          <>
            {events.length === 0 && (
              <p style={{ fontFamily: FONT.serif, fontStyle: "italic", fontSize: 13.5, color: PAPER.dim, margin: 0 }}>
                A quiet day.
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {events.map((evt, i) => {
                const g = goalById[evt.goalId];
                return (
                  <div key={i} style={eventRowStyle}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: goalColor(g), flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: PAPER.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{formatEvent(evt)}</div>
                      <div style={{ fontSize: 11, color: PAPER.dim }}>{g?.name ?? evt.goalId}</div>
                    </div>
                    <button onClick={() => onDelete(evt)} disabled={busy} style={removeBtnStyle}>✕</button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {panelTab === "notes" && events !== null && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {activeGoals.length === 0 && <p style={{ fontSize: 12, color: PAPER.faint }}>No active goals.</p>}
            {activeGoals.map((g) => (
              <NoteBlock key={g.id} goal={g} initial={notes[g.id] || ""} status={noteStatus[g.id]} onBlur={(text) => onNoteBlur(g.id, text)} />
            ))}
          </div>
        )}

        {panelTab === "add" && events !== null && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {activeGoals.length === 0 && <p style={{ fontSize: 12, color: PAPER.faint }}>No active goals.</p>}
            {activeGoals.map((g) => (
              <button key={g.id} onClick={() => onAdd(g)} disabled={busy} style={{ ...addGoalBtnStyle, borderLeftColor: goalColor(g) }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: goalColor(g), flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: PAPER.ink }}>{g.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{
      position: "fixed",
      top: topOffset, bottom: bottomOffset, left: 0, right: 0,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      background: PAPER.bg,
      fontFamily: FONT.sans,
      color: PAPER.ink,
    }}>

      {/* Top bar — full width, grey zone */}
      <div style={topBarStyle}>
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          style={burgerStyle}
          aria-label="Toggle sidebar"
        >
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
            <path stroke={PAPER.dim} strokeWidth="1.6" strokeLinecap="round" d="M0 1h16M0 6h16M0 11h16" />
          </svg>
        </button>
        <button type="button" onClick={() => nav(`/day/${today}`)} style={todayBtnStyle}>Today</button>
        <button type="button" onClick={() => nav(`/day/${addDaysLocalISO(date, -1)}`)} style={navArrowStyle} aria-label="Previous day">‹</button>
        <button type="button" onClick={() => nav(`/day/${addDaysLocalISO(date, 1)}`)} style={navArrowStyle} aria-label="Next day">›</button>
        <span style={{ fontSize: 17, fontWeight: 400, color: PAPER.ink, letterSpacing: "-0.01em", marginLeft: 4 }}>{navDateStr}</span>
        <div style={{ marginLeft: "auto" }}>
          <ViewSwitcher />
        </div>
      </div>

      {/* Below top bar: sidebar (grey) + main white panel */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minWidth: 0 }}>

        {/* Permanent sidebar — desktop, toggleable */}
        {desktop && sidebarOpen && (
          <aside style={desktopSidebarStyle}>
            {sidebarContent}
          </aside>
        )}

        {/* Mobile drawer */}
        {!desktop && (
          <>
            <aside style={{
              position: "absolute", top: 0, bottom: 0, left: 0,
              width: "min(280px, 85vw)",
              background: PAPER.bg,
              zIndex: 20,
              transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1)",
              overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}>
              {sidebarContent}
            </aside>
            {sidebarOpen && (
              <div onClick={() => setSidebarOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 10 }} />
            )}
          </>
        )}

        {/* Main white panel — rounded top-left */}
        <div style={mainPanelStyle}>

          {/* Day column header — MON centered over 16 circle */}
          <div style={dayHeaderStyle}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={weekdayLabelStyle}>{weekday}</span>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 46, height: 46, borderRadius: "50%",
                background: isToday ? PAPER.ink : "transparent",
                color: isToday ? "#fff" : PAPER.ink,
                fontFamily: FONT.serif,
                fontSize: 26, fontWeight: 300, lineHeight: 1,
              }}>
                {dayNum}
              </span>
            </div>
          </div>

          {/* Time grid */}
          {ISO_RE.test(date) ? (
            <TimeGrid date={date} goals={activeGoals} markedGoalIds={markedGoalIds} onToggleGoal={onTimeGridToggle} />
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: PAPER.dim }}>Couldn't load this day.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── NoteBlock ────────────────────────────────────────────────────────────────

function NoteBlock({ goal, initial, status, onBlur }) {
  const [text, setText] = useState(initial);
  useEffect(() => { setText(initial); }, [initial]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: goalColor(goal), flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: PAPER.ink, flex: 1 }}>{goal.name}</span>
        {status === "saving" && <span style={{ fontSize: 10, color: PAPER.faint }}>saving…</span>}
        {status === "saved" && <span style={{ fontSize: 10, color: PAPER.faint }}>saved</span>}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => onBlur(e.target.value)}
        placeholder="what happened today?"
        rows={2}
        style={{
          width: "100%", boxSizing: "border-box", padding: "7px 9px",
          borderRadius: 8, border: `1px solid ${PAPER.line}`,
          background: "#FFFFFF", color: PAPER.ink,
          fontFamily: FONT.sans, fontSize: 12.5, lineHeight: 1.5, resize: "vertical",
        }}
      />
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const topBarStyle = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "0 20px", height: 56, flexShrink: 0,
  background: PAPER.bg,
};

const desktopSidebarStyle = {
  width: 248, flexShrink: 0,
  background: PAPER.bg,
  overflow: "hidden",
  display: "flex", flexDirection: "column",
  paddingRight: 48,
  boxSizing: "border-box",
};

const mainPanelStyle = {
  flex: 1, display: "flex", flexDirection: "column",
  background: "#FFFFFF",
  borderTopLeftRadius: 18,
  overflow: "hidden",
  minWidth: 0,
};

const dayHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  padding: `16px 0 10px ${LABEL_W + 6}px`,
  flexShrink: 0,
  background: "#FFFFFF",
};

const weekdayLabelStyle = {
  fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase",
  color: PAPER.faint, fontFamily: FONT.sans, fontWeight: 500,
};

const sectionHeaderStyle = {
  fontSize: 13, fontWeight: 600, color: PAPER.ink,
  letterSpacing: "0.01em", marginBottom: 2,
};

const todayBtnStyle = {
  padding: "6px 16px", borderRadius: 999,
  border: `1px solid ${PAPER.line}`, background: "#FFFFFF",
  color: PAPER.ink, fontSize: 12.5, fontFamily: FONT.sans,
  cursor: "pointer", fontWeight: 500,
};

const navArrowStyle = {
  width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: "50%", border: "none", background: "transparent",
  color: PAPER.dim, fontSize: 18, cursor: "pointer", fontFamily: FONT.sans,
};

const burgerStyle = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 36, height: 36, borderRadius: "50%", border: "none",
  background: "transparent", cursor: "pointer", padding: 0, flexShrink: 0,
};

const arrowBtn = {
  width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: "50%", border: "none", background: "transparent",
  color: PAPER.dim, fontSize: 14, cursor: "pointer", fontFamily: FONT.sans,
};

const eventRowStyle = {
  display: "flex", alignItems: "center", gap: 8,
  padding: "7px 9px", background: "#FFFFFF", borderRadius: 8,
  border: `1px solid ${PAPER.line}`,
};

const removeBtnStyle = {
  border: "none", background: "transparent", color: PAPER.faint,
  fontSize: 11, cursor: "pointer", padding: "2px 4px", fontFamily: FONT.sans,
};

const closeBtnStyle = {
  width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: 6, border: `1px solid ${PAPER.line}`, background: "transparent",
  color: PAPER.dim, fontSize: 12, cursor: "pointer", fontFamily: FONT.sans,
};

const addGoalBtnStyle = {
  display: "flex", alignItems: "center", gap: 9, padding: "8px 10px",
  borderRadius: 8, border: `1px solid ${PAPER.line}`, borderLeft: "3px solid transparent",
  background: "#FFFFFF", cursor: "pointer", fontFamily: FONT.sans, textAlign: "left",
};
