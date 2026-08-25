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
  return "one tap per day";
}

function formatEvent(evt) {
  if (evt.verb === "wake" && evt.time) return `wake ${evt.time}`;
  if (evt.verb === "session") {
    if (evt.time && evt.durationMin != null) return `session ${evt.time} · ${evt.durationMin}min`;
    if (evt.durationMin != null) return `session ${evt.durationMin}min`;
  }
  return evt.payload || evt.verb;
}

function humanDay(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

export default function Goal() {
  const { id } = useParams();
  const [goal, setGoal] = useState(undefined);
  const [logs, setLogs] = useState([]);
  const [editingColor, setEditingColor] = useState(false);
  const [savingColor, setSavingColor] = useState(false);

  async function pickColor(color) {
    if (!goal || savingColor) return;
    const next = { ...goal, color };
    setSavingColor(true);
    setGoal(next);
    try { await saveGoal(next); }
    catch { setGoal(goal); }
    finally { setSavingColor(false); setEditingColor(false); }
  }

  useEffect(() => {
    let alive = true;
    const end = todayLocalISO();
    const start = addDaysLocalISO(end, -365);
    Promise.all([getGoal(id), readLogsInRange({ from: start, to: end })])
      .then(([g, l]) => { if (!alive) return; setGoal(g); setLogs(l); })
      .catch(() => { if (alive) { setGoal(null); setLogs([]); } });
    return () => { alive = false; };
  }, [id]);

  if (goal === undefined) {
    return <div style={pageStyle}><div style={container}><p style={{ color: PAPER.faint }}>Reading your vault…</p></div></div>;
  }
  if (goal === null) {
    return (
      <div style={pageStyle}>
        <div style={container}>
          <p style={{ color: PAPER.dim }}>Couldn't find that goal.</p>
          <p><Link to="/" style={backLink}>← Life</Link></p>
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

  return (
    <div style={pageStyle}>
      <style>{`
        .goal-layout {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        @media (min-width: 768px) {
          .goal-layout {
            flex-direction: row;
            align-items: start;
            gap: 72px;
          }
          .goal-sidebar {
            width: 200px;
            flex-shrink: 0;
            position: sticky;
            top: 52px;
          }
          .goal-main { flex: 1; max-width: 520px; }
        }
      `}</style>

      <div style={container}>
        <Link to="/" style={backLink}>← Life</Link>

        {/* Header */}
        <header style={{ marginTop: 32, marginBottom: 40 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <button
              type="button"
              data-testid="goal-orb-wrap"
              data-momentum={goalMomentum.toFixed(2)}
              onClick={() => setEditingColor((v) => !v)}
              title="Change color"
              aria-label="Change goal color"
              style={{
                width: 60, height: 60,
                display: "grid", placeItems: "center",
                background: "transparent", border: "none", padding: 0,
                cursor: "pointer", borderRadius: 999,
              }}
            >
              <Orb cat={goal.cat} color={catHue} momentum={goalMomentum}
                still={goal.state !== "active" && goal.state !== "drift"}
                viewTransitionName={`orb-${goal.id}`} />
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontFamily: FONT.serif, fontWeight: 600,
                fontSize: "clamp(28px, 4vw, 42px)",
                margin: 0, color: PAPER.ink, letterSpacing: "-0.01em", lineHeight: 1.1, textWrap: "balance",
                viewTransitionName: `goal-name-${goal.id}`,
              }}>
                {goal.name}
              </h1>
              <div style={{ fontSize: 12, color: PAPER.faint, marginTop: 6 }}>
                {recentEvents.length > 0
                  ? `${recentEvents.length} events · last ${recentTop[0].date}`
                  : "no logs yet"}
              </div>
            </div>
          </div>

          {/* Color picker */}
          {editingColor && (
            <div style={{
              marginTop: 16, padding: "14px 16px",
              background: PAPER.panel, borderRadius: 14,
            }}>
              <div style={kicker}>
                Color {savingColor && "· saving…"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
                {PALETTE.map((p) => (
                  <button
                    key={p.color}
                    type="button"
                    onClick={() => pickColor(p.color)}
                    disabled={savingColor}
                    aria-label={p.name}
                    aria-pressed={catHue === p.color}
                    title={p.name}
                    style={{
                      width: 36, height: 36,
                      borderRadius: RADIUS.blob,
                      background: `radial-gradient(circle at 35% 30%, ${p.color}, ${p.color}99 80%)`,
                      boxShadow: catHue === p.color ? `0 0 0 2px ${PAPER.ink}` : "none",
                      outline: "none",
                      border: "none", cursor: savingColor ? "default" : "pointer", padding: 0,
                    }}
                    className="orb-breathe"
                  />
                ))}
              </div>
            </div>
          )}
        </header>

        {/* Ambition quote */}
        <blockquote style={{
          fontFamily: FONT.serif, fontStyle: "italic",
          fontSize: 20, lineHeight: 1.6,
          color: PAPER.ink, margin: "0 0 40px",
          borderInlineStart: `2px solid ${catHue}`,
          paddingInlineStart: 20,
        }}>
          "{goal.ambition}"
        </blockquote>

        <div className="goal-layout">
          {/* Sidebar — rounds + links */}
          <aside className="goal-sidebar">
            {cur && (
              <div style={{ marginBottom: 28 }}>
                <div style={kicker}>This stretch</div>
                <div style={{
                  fontFamily: FONT.serif, fontSize: 15, color: PAPER.ink,
                  marginTop: 8, lineHeight: 1.5,
                }}>
                  Round {cur.n}
                </div>
                <div style={{ fontSize: 12.5, color: PAPER.dim, marginTop: 4 }}>
                  {formatTarget(goal, cur)}
                </div>
                <div style={{ fontSize: 12, color: PAPER.faint, marginTop: 2 }}>
                  until {cur.endDate}
                </div>
              </div>
            )}

            {/* Round dots */}
            <div style={{ marginBottom: 28 }}>
              <div style={kicker}>Rounds</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                {goal.rounds.map((r) => {
                  const isCurrent = r.n === goal.currentRound;
                  const isPast = r.n < goal.currentRound;
                  return (
                    <div key={r.n} title={`Round ${r.n}: ${r.startDate} → ${r.endDate}`}
                      style={{
                        width: isCurrent ? 10 : 6,
                        height: isCurrent ? 10 : 6,
                        borderRadius: 999,
                        background: isCurrent ? catHue : (isPast ? PAPER.line : "transparent"),
                        border: isPast || isCurrent ? "none" : `1.5px solid ${PAPER.line}`,
                        flexShrink: 0,
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
                {goal.rounds.map((r) => (
                  <div key={r.n} style={{
                    fontSize: 11.5,
                    color: r.n === goal.currentRound ? PAPER.ink : PAPER.faint,
                  }}>
                    R{r.n} · {formatTarget(goal, r)} · {r.endDate}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Link to={`/onboard?goalId=${goal.id}&turn=roundsPreview`} style={actionLink}>
                Adjust rounds →
              </Link>
              <Link to={`/year?pen=${goal.id}`} style={actionLink}>
                See on calendar →
              </Link>
            </div>
          </aside>

          {/* Main — notes + activity */}
          <main className="goal-main">
            {/* Notes timeline */}
            <section style={{ marginBottom: 36 }}>
              <div style={kicker}>Notes</div>
              {notesTimeline.length === 0 ? (
                <p style={{ marginTop: 12, fontSize: 13.5, color: PAPER.dim, fontStyle: "italic" }}>
                  No notes yet — write one from a day.
                </p>
              ) : (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 20 }}>
                  {notesTimeline.map(({ date, text }) => (
                    <div key={date} style={{ borderInlineStart: `1.5px solid ${PAPER.line}`, paddingInlineStart: 16 }}>
                      <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: PAPER.faint, marginBottom: 6 }}>
                        {humanDay(date)}
                      </div>
                      <div style={{ fontSize: 14, color: PAPER.ink, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent activity */}
            {recentTop.length > 0 && (
              <section>
                <div style={kicker}>Recent activity</div>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 0 }}>
                  {recentTop.map((evt, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      fontSize: 13, color: PAPER.ink,
                      padding: "10px 0",
                      borderBottom: `1px solid ${PAPER.line}`,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: catHue, flexShrink: 0 }} />
                      <span style={{ color: PAPER.dim, fontSize: 11, letterSpacing: "0.06em", flexShrink: 0 }}>
                        {humanDay(evt.date)}
                      </span>
                      <span>{formatEvent(evt)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </main>
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
  padding: "clamp(28px, 4vw, 52px) clamp(20px, 4vw, 64px) 96px",
};
const container = { maxWidth: 760, margin: "0 auto" };
const backLink = { color: PAPER.dim, fontSize: 13, textDecoration: "none" };
const kicker = {
  fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
  color: PAPER.faint, fontWeight: 500,
};
const actionLink = {
  fontSize: 12.5, color: PAPER.dim, textDecoration: "none",
  letterSpacing: "0.04em",
};
