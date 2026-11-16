import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { PAPER, FONT, TYPE, RADIUS } from "../tokens.js";
import { listGoals, readLog, appendLog, deleteLogEvent, saveNote } from "../data/store.js";
import { goalColor } from "../lib/goalColor.js";
import TimeGrid from "../components/TimeGrid.jsx";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

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

function humanDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function defaultEventFor(goal) {
  if (typeof goal.baseline === "string") return { verb: "wake", time: "07:00", goalId: goal.id };
  if (goal.baseline?.intervalDays != null) return { verb: "session", durationMin: 10, goalId: goal.id };
  return { verb: "done", goalId: goal.id };
}

export default function Day() {
  const { date } = useParams();
  const nav = useNavigate();
  const [goals, setGoals] = useState([]);
  const [events, setEvents] = useState(null);
  const [notes, setNotes] = useState({});
  const [noteStatus, setNoteStatus] = useState({});
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktop, setDesktop] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);

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
    } finally {
      setBusy(false); }
  }

  const goalById = Object.fromEntries(goals.map((g) => [g.id, g]));
  const markedGoalIds = new Set((events || []).map((e) => e.goalId));
  const activeGoals = goals.filter((g) => g.state === "active" || g.state === "drift");

  const topOffset = desktop ? 48 : 0;
  const bottomOffset = desktop ? 0 : 60;

  return (
    <div style={{
      position: "fixed",
      top: topOffset,
      bottom: bottomOffset,
      left: 0,
      right: 0,
      overflow: "hidden",
      background: PAPER.bg,
      color: PAPER.ink,
      fontFamily: FONT.sans,
    }}>
      {/* Sidebar drawer — slides in from left */}
      <aside
        aria-label="Day details"
        style={{
          position: "absolute",
          top: 0, bottom: 0, left: 0,
          width: "min(300px, 85vw)",
          background: PAPER.card,
          borderRight: `1px solid ${PAPER.line}`,
          zIndex: 20,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.24s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 20px 48px" }}>
          {/* Back + close row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <Link to="/year" style={backLink} onClick={() => setSidebarOpen(false)}>← Year</Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close panel"
              style={closeBtn}
            >
              ✕
            </button>
          </div>

          {/* Date */}
          {ISO_RE.test(date) && (
            <header style={{ marginBottom: 28 }}>
              <div style={kickerStyle}>{humanDate(date).replace(/^[^,]+,\s*/, "")}</div>
              <h1 style={h1Style}>{new Date(date + "T00:00:00").getDate()}</h1>
            </header>
          )}

          {/* Loading */}
          {events === null && (
            <p style={{ color: PAPER.faint, fontSize: 13 }}>Reading your vault…</p>
          )}

          {/* Empty state */}
          {events !== null && events.length === 0 && (
            <p style={{ fontFamily: FONT.serif, fontStyle: "italic", fontSize: TYPE.ambition, color: PAPER.dim, margin: "0 0 24px" }}>
              A quiet day. Rest counts too.
            </p>
          )}

          {/* Logged events */}
          {events !== null && events.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div style={sectionKicker}>Logged</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                {events.map((evt, i) => {
                  const g = goalById[evt.goalId];
                  const color = goalColor(g);
                  return (
                    <div key={i} style={eventRow}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: PAPER.ink }}>{formatEvent(evt)}</div>
                        <div style={{ fontSize: 11.5, color: PAPER.dim, marginTop: 1 }}>{g ? g.name : evt.goalId}</div>
                      </div>
                      <button onClick={() => onDelete(evt)} disabled={busy} style={dangerPill} title="Remove">
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Notes */}
          {events !== null && activeGoals.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div style={sectionKicker}>Notes</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
                {activeGoals.map((g) => (
                  <NoteBlock
                    key={g.id}
                    goal={g}
                    initial={notes[g.id] || ""}
                    status={noteStatus[g.id]}
                    onBlur={(text) => onNoteBlur(g.id, text)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Add */}
          {events !== null && activeGoals.length > 0 && (
            <section>
              <div style={sectionKicker}>Add</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
                {activeGoals.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => onAdd(g)}
                    disabled={busy}
                    style={{ ...pillStyle, display: "flex", alignItems: "center", gap: 7 }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: goalColor(g) }} />
                    {g.name}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </aside>

      {/* Scrim — click to close sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.18)",
            zIndex: 10,
          }}
        />
      )}

      {/* Time grid — fills full viewport minus nav */}
      {ISO_RE.test(date) ? (
        <TimeGrid
          date={date}
          goals={activeGoals}
          markedGoalIds={markedGoalIds}
          onToggleGoal={onTimeGridToggle}
          onMenuOpen={() => setSidebarOpen((v) => !v)}
        />
      ) : (
        <div style={{ padding: 32 }}>
          <p style={{ color: PAPER.dim }}>Couldn't load this day.</p>
        </div>
      )}
    </div>
  );
}

function NoteBlock({ goal, initial, status, onBlur }) {
  const [text, setText] = useState(initial);

  useEffect(() => {
    setText(initial);
  }, [initial]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: goalColor(goal), flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, color: PAPER.ink, flex: 1 }}>{goal.name}</span>
        {status === "saving" && <span style={{ fontSize: 10.5, color: PAPER.faint }}>saving…</span>}
        {status === "saved" && <span style={{ fontSize: 10.5, color: PAPER.faint }}>saved</span>}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => onBlur(e.target.value)}
        placeholder="what happened today?"
        rows={2}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "8px 10px",
          borderRadius: RADIUS.r1,
          border: `1px solid ${PAPER.line}`,
          background: PAPER.bg,
          color: PAPER.ink,
          fontFamily: FONT.sans,
          fontSize: 13,
          lineHeight: 1.5,
          resize: "vertical",
        }}
      />
    </div>
  );
}

const backLink = { color: PAPER.dim, fontSize: 13, textDecoration: "none" };
const kickerStyle = {
  fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
  color: PAPER.faint, fontWeight: 500, marginBottom: 4,
};
const h1Style = {
  fontFamily: FONT.serif, fontWeight: 300,
  fontSize: "clamp(48px, 8vw, 80px)",
  lineHeight: 0.95, margin: "0", color: PAPER.ink, letterSpacing: "-0.03em",
};
const sectionKicker = {
  fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
  color: PAPER.faint, fontWeight: 500,
};
const eventRow = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "9px 11px",
  background: PAPER.panel,
  border: `1px solid ${PAPER.line}`,
  borderRadius: RADIUS.r2,
};
const pillStyle = {
  padding: "7px 12px",
  borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.line}`,
  background: PAPER.panel,
  fontSize: 12.5,
  color: PAPER.ink,
  fontFamily: FONT.sans,
  cursor: "pointer",
};
const dangerPill = {
  padding: "3px 7px",
  borderRadius: RADIUS.pill,
  border: "none",
  background: "transparent",
  color: PAPER.faint,
  fontSize: 12,
  fontFamily: FONT.sans,
  cursor: "pointer",
};
const closeBtn = {
  width: 28, height: 28,
  display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: 7,
  border: `1px solid ${PAPER.line}`,
  background: "transparent",
  color: PAPER.dim,
  fontSize: 12,
  cursor: "pointer",
  fontFamily: FONT.sans,
};
