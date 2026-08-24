import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PAPER, FONT, TYPE, RADIUS } from "../tokens.js";
import { getGoal, readLogsInRange, saveGoal } from "../data/store.js";
import { momentum } from "../data/adherence.js";
import { todayLocalISO, addDaysLocalISO } from "../lib/date.js";
import Orb from "../components/Orb.jsx";
import { goalColor, PALETTE } from "../lib/goalColor.js";

function formatTarget(goal, r) {
  if (typeof goal.baseline === "string") return `wake by ${r.targetValue}`;
  if (goal.baseline?.intervalDays != null) return `every ${r.targetValue.intervalDays}d`;
  return "one tap per day"; // tracker/simple
}

function formatEvent(evt) {
  if (evt.verb === "wake" && evt.time) return `wake ${evt.time}`;
  if (evt.verb === "session") {
    if (evt.time && evt.durationMin != null) return `session ${evt.time} · ${evt.durationMin}min`;
    if (evt.durationMin != null) return `session ${evt.durationMin}min`;
  }
  return evt.payload || evt.verb;
}

export default function Goal() {
  const { id } = useParams();
  const [goal, setGoal] = useState(undefined); // undefined = loading; null = missing
  const [logs, setLogs] = useState([]);
  const [editingColor, setEditingColor] = useState(false);
  const [savingColor, setSavingColor] = useState(false);

  async function pickColor(color) {
    if (!goal || savingColor) return;
    const next = { ...goal, color };
    setSavingColor(true);
    setGoal(next);
    try {
      await saveGoal(next);
    } catch (err) {
      setGoal(goal);
      // eslint-disable-next-line no-console
      console.error("saveGoal failed", err);
    } finally {
      setSavingColor(false);
      setEditingColor(false);
    }
  }

  useEffect(() => {
    let alive = true;
    const end = todayLocalISO();
    const start = addDaysLocalISO(end, -365);
    Promise.all([getGoal(id), readLogsInRange({ from: start, to: end })])
      .then(([g, l]) => {
        if (!alive) return;
        setGoal(g);
        setLogs(l);
      })
      .catch(() => { if (alive) { setGoal(null); setLogs([]); } });
    return () => { alive = false; };
  }, [id]);

  if (goal === undefined) {
    return <div style={pageStyle}><div style={containerStyle}><p style={{ color: PAPER.faint }}>Reading your vault…</p></div></div>;
  }
  if (goal === null) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <p style={{ color: PAPER.dim }}>Couldn't find that goal.</p>
          <p><Link to="/" style={backLinkStyle}>← Life</Link></p>
        </div>
      </div>
    );
  }

  const cur = goal.rounds[Math.max(0, goal.currentRound - 1)];
  const catHue = goalColor(goal, PAPER.dim);
  const goalMomentum = momentum({ goal, logs, asOf: todayLocalISO() });

  const recentEvents = [];
  const notesTimeline = [];
  for (const log of logs) {
    for (const e of log.events) {
      if (e.goalId === goal.id) recentEvents.push({ date: log.date, ...e });
    }
    const noteText = log.notes?.[goal.id];
    if (noteText && noteText.trim() !== "") {
      notesTimeline.push({ date: log.date, text: noteText });
    }
  }
  recentEvents.sort((a, b) => b.date.localeCompare(a.date));
  const recentTop = recentEvents.slice(0, 5);
  notesTimeline.sort((a, b) => a.date.localeCompare(b.date));

  function humanDay(iso) {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Link to="/" style={backLinkStyle}>← Life</Link>

        <header style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
          <button
            type="button"
            data-testid="goal-orb-wrap"
            data-momentum={goalMomentum.toFixed(2)}
            onClick={() => setEditingColor((v) => !v)}
            title="Change color"
            aria-label="Change goal color"
            style={{
              width: 60, height: 60, display: "grid", placeItems: "center",
              background: "transparent", border: "none", padding: 0, cursor: "pointer",
              borderRadius: 999,
            }}
          >
            <Orb cat={goal.cat} color={catHue} momentum={goalMomentum} still={goal.state !== "active" && goal.state !== "drift"} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: FONT.serif, fontWeight: 400, fontSize: TYPE.goalTitle, margin: 0, color: PAPER.ink }}>
              {goal.name}
            </h1>
            <div style={{ fontSize: 13, color: PAPER.dim, marginTop: 4 }}>
              {recentEvents.length > 0 ? `${recentEvents.length} recent events · last worked ${recentTop[0].date}` : "no logs yet"}
            </div>
          </div>
        </header>

        {editingColor && (
          <div
            style={{
              marginTop: 14,
              padding: "12px 14px",
              background: PAPER.card,
              border: `1px solid ${PAPER.line}`,
              borderRadius: RADIUS.r1,
            }}
          >
            <div style={{
              fontSize: 10.5, letterSpacing: "1.4px", textTransform: "uppercase",
              color: PAPER.faint, fontWeight: 500, marginBottom: 10,
            }}>
              COLOR {savingColor && "· saving…"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              {PALETTE.map((p) => {
                const selected = catHue === p.color;
                return (
                  <button
                    key={p.color}
                    type="button"
                    onClick={() => pickColor(p.color)}
                    disabled={savingColor}
                    aria-label={p.name}
                    aria-pressed={selected}
                    title={p.name}
                    style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: `radial-gradient(circle at 35% 30%, ${p.color}, ${p.color}99 70%)`,
                      boxShadow: selected
                        ? `0 0 0 2px ${PAPER.ink}, 0 0 12px ${p.color}80`
                        : `0 0 10px ${p.color}55`,
                      border: "none",
                      cursor: savingColor ? "default" : "pointer",
                      padding: 0,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        <blockquote style={{
          fontFamily: FONT.serif, fontStyle: "italic",
          fontSize: TYPE.ambition, lineHeight: 1.5,
          color: PAPER.ink, margin: "24px 0 0",
        }}>
          "{goal.ambition}"
        </blockquote>

        {cur && (
          <div style={{
            background: PAPER.card, border: `1px solid ${PAPER.line}`,
            borderRadius: RADIUS.r1, padding: "10px 14px", marginTop: 20,
            display: "inline-block",
          }}>
            <div style={{ fontSize: 10.5, letterSpacing: "1.3px", textTransform: "uppercase", color: PAPER.faint, fontWeight: 500 }}>
              THIS STRETCH — ROUND {cur.n}
            </div>
            <div style={{ fontSize: 12.5, color: PAPER.dim, marginTop: 4 }}>
              {formatTarget(goal, cur)} until {cur.endDate}
            </div>
          </div>
        )}

        {/* Rounds timeline */}
        <section style={{ marginTop: 26 }}>
          <div style={kickerStyle}>ROUNDS</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
            {goal.rounds.map((r) => {
              const isCurrent = r.n === goal.currentRound;
              const isPast = r.n < goal.currentRound;
              const size = isCurrent ? 10 : 6;
              return (
                <div key={r.n} title={`Round ${r.n}`}
                  style={{
                    width: size, height: size, borderRadius: 999,
                    background: isCurrent ? catHue : (isPast ? PAPER.line : "transparent"),
                    border: isPast || isCurrent ? "none" : `1.5px solid ${PAPER.line}`,
                    flexShrink: 0,
                  }}
                />
              );
            })}
          </div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
            {goal.rounds.map((r) => {
              const isCurrent = r.n === goal.currentRound;
              return (
                <div key={r.n} style={{ fontSize: 12.5, color: isCurrent ? PAPER.ink : PAPER.dim }}>
                  Round {r.n} · {formatTarget(goal, r)} · {r.startDate} → {r.endDate}
                </div>
              );
            })}
          </div>
        </section>

        {/* Notes timeline */}
        <section style={{ marginTop: 26 }}>
          <div style={kickerStyle}>NOTES</div>
          {notesTimeline.length === 0 ? (
            <p style={{ marginTop: 10, fontSize: 13, color: PAPER.dim }}>
              No notes yet — write one from a day.
            </p>
          ) : (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 16 }}>
              {notesTimeline.map(({ date, text }) => (
                <div key={date}>
                  <div style={{ fontSize: 11.5, letterSpacing: "0.08em", textTransform: "uppercase", color: PAPER.faint, marginBottom: 4 }}>
                    {humanDay(date)}
                  </div>
                  <div style={{ fontSize: 14, color: PAPER.ink, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                    {text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent activity */}
        {recentTop.length > 0 && (
          <section style={{ marginTop: 26 }}>
            <div style={kickerStyle}>RECENT ACTIVITY</div>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {recentTop.map((evt, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: PAPER.ink }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: 999,
                    background: catHue, display: "inline-block", flexShrink: 0,
                  }} />
                  <span>{evt.date}: {formatEvent(evt)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 32, flexWrap: "wrap" }}>
          <Link to={`/onboard?goalId=${goal.id}&turn=roundsPreview`} style={pillStyle}>
            Adjust rounds →
          </Link>
          <Link to={`/year?pen=${goal.id}`} style={pillStyle}>
            See its year on the calendar →
          </Link>
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: PAPER.bg,
  color: PAPER.ink,
  fontFamily: FONT.sans,
  padding: "32px 26px 96px",
};
const containerStyle = { maxWidth: 560, margin: "0 auto" };
const backLinkStyle = { color: PAPER.dim, fontSize: 13, textDecoration: "none" };
const kickerStyle = {
  fontSize: 11, letterSpacing: "1.6px", textTransform: "uppercase",
  color: PAPER.faint, fontWeight: 500,
};
const pillStyle = {
  padding: "9px 16px", borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.line}`, background: PAPER.card,
  fontSize: 13, color: PAPER.ink, textDecoration: "none",
};
