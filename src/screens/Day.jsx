import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { PAPER, FONT, TYPE, RADIUS } from "../tokens.js";
import { listGoals, readLog, appendLog, deleteLogEvent, saveNote } from "../data/store.js";
import { goalColor } from "../lib/goalColor.js";

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
  if (goal.type === "wake") return { verb: "wake", time: "07:00", goalId: goal.id };
  if (goal.type === "cadence") return { verb: "session", durationMin: 10, goalId: goal.id };
  return { verb: "done", goalId: goal.id };
}

export default function Day() {
  const { date } = useParams();
  const nav = useNavigate();
  const [goals, setGoals] = useState([]);
  const [events, setEvents] = useState(null); // null = loading
  const [notes, setNotes] = useState({}); // { goalId: text }
  const [noteStatus, setNoteStatus] = useState({}); // { goalId: "saving" | "saved" | undefined }
  const [busy, setBusy] = useState(false);

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

  const shell = (
    <style>{`
      .day-shell { max-width: 720px; margin: 0 auto; }
      @media (min-width: 900px)  { .day-shell { max-width: 960px; } }
      @media (min-width: 1200px) { .day-shell { max-width: 1120px; } }
    `}</style>
  );

  if (!ISO_RE.test(date)) {
    return (
      <div style={pageStyle}>
        {shell}
        <div className="day-shell" style={containerStyle}>
          <Link to="/year" style={backLink}>← Year</Link>
          <p style={{ color: PAPER.dim, marginTop: 20 }}>Bad date.</p>
        </div>
      </div>
    );
  }

  if (events === null) {
    return (
      <div style={pageStyle}>
        {shell}
        <div className="day-shell" style={containerStyle}>
          <Link to="/year" style={backLink}>← Year</Link>
          <p style={{ color: PAPER.faint, marginTop: 20 }}>Reading your vault…</p>
        </div>
      </div>
    );
  }

  const goalById = Object.fromEntries(goals.map((g) => [g.id, g]));

  return (
    <div style={pageStyle}>
      {shell}
      <div className="day-shell" style={containerStyle}>
        <Link to="/year" style={backLink}>← Year</Link>

        <header style={{ marginTop: 12, marginBottom: 24 }}>
          <div style={kickerStyle}>{humanDate(date).split(",")[0].toUpperCase()}</div>
          <h1 style={h1Style}>{humanDate(date).split(", ").slice(1).join(", ")}</h1>
        </header>

        {events.length === 0 ? (
          <p style={{ fontFamily: FONT.serif, fontStyle: "italic", fontSize: TYPE.ambition, color: PAPER.dim }}>
            A quiet day. Rest counts too.
          </p>
        ) : (
          <section style={{ marginBottom: 32 }}>
            <div style={sectionKicker}>LOGGED</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {events.map((evt, i) => {
                const g = goalById[evt.goalId];
                const color = goalColor(g);
                return (
                  <div key={i} style={eventRow}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: PAPER.ink }}>{formatEvent(evt)}</div>
                      <div style={{ fontSize: 12, color: PAPER.dim, marginTop: 2 }}>
                        {g ? g.name : evt.goalId}
                      </div>
                    </div>
                    <button onClick={() => onDelete(evt)} disabled={busy} style={dangerPill} title="Remove this event">
                      remove
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {goals.filter((g) => g.state === "active" || g.state === "drift").length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={sectionKicker}>NOTES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
              {goals
                .filter((g) => g.state === "active" || g.state === "drift")
                .map((g) => (
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

        {goals.filter((g) => g.state === "active" || g.state === "drift").length > 0 && (
          <section>
            <div style={sectionKicker}>ADD</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {goals
                .filter((g) => g.state === "active" || g.state === "drift")
                .map((g) => (
                  <button
                    key={g.id}
                    onClick={() => onAdd(g)}
                    disabled={busy}
                    style={{
                      ...pillStyle,
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 9, height: 9, borderRadius: 999,
                        background: goalColor(g),
                      }}
                    />
                    {g.name}
                  </button>
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function NoteBlock({ goal, initial, status, onBlur }) {
  const [text, setText] = useState(initial);
  const ref = useRef(initial);

  useEffect(() => {
    setText(initial);
    ref.current = initial;
  }, [initial]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: 999, background: goalColor(goal), flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: PAPER.ink, flex: 1 }}>{goal.name}</span>
        {status === "saving" && <span style={{ fontSize: 11, color: PAPER.faint }}>saving…</span>}
        {status === "saved" && <span style={{ fontSize: 11, color: PAPER.faint }}>saved</span>}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => onBlur(e.target.value)}
        placeholder="what happened for this goal today?"
        rows={2}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "10px 12px",
          borderRadius: RADIUS.r1,
          border: `1px solid ${PAPER.line}`,
          background: PAPER.card,
          color: PAPER.ink,
          fontFamily: FONT.sans,
          fontSize: 13.5,
          lineHeight: 1.5,
          resize: "vertical",
        }}
      />
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: PAPER.bg,
  color: PAPER.ink,
  fontFamily: FONT.sans,
  padding: "clamp(28px, 4vw, 56px) clamp(20px, 4vw, 64px) 96px",
};
const containerStyle = { margin: "0 auto" };
const backLink = { color: PAPER.dim, fontSize: 13, textDecoration: "none" };
const kickerStyle = {
  fontSize: 11.5, letterSpacing: "1.8px", textTransform: "uppercase",
  color: PAPER.faint, fontWeight: 500,
};
const h1Style = {
  fontFamily: FONT.serif, fontWeight: 400, fontSize: TYPE.h1,
  lineHeight: 1.25, margin: "6px 0 0", color: PAPER.ink,
};
const sectionKicker = {
  fontSize: 11, letterSpacing: "1.6px", textTransform: "uppercase",
  color: PAPER.faint, fontWeight: 500,
};
const eventRow = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "12px 14px",
  background: PAPER.card,
  border: `1px solid ${PAPER.line}`,
  borderRadius: RADIUS.r1,
};
const pillStyle = {
  padding: "9px 14px",
  borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.line}`,
  background: PAPER.card,
  fontSize: 13,
  color: PAPER.ink,
  fontFamily: FONT.sans,
  cursor: "pointer",
};
const dangerPill = {
  padding: "6px 12px",
  borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.line}`,
  background: "transparent",
  color: PAPER.dim,
  fontSize: 12,
  fontFamily: FONT.sans,
  cursor: "pointer",
};
