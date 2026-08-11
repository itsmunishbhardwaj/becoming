import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PAPER, FONT, TYPE, RADIUS, CATS } from "../tokens.js";
import { getGoal, readLogsInRange } from "../data/store.js";
import { todayLocalISO, addDaysLocalISO } from "../lib/date.js";
import Orb from "../components/Orb.jsx";

function catColor(cat) {
  return (CATS[cat] && CATS[cat].color) || PAPER.dim;
}

function formatTarget(goal, r) {
  if (goal.type === "wake") return `wake by ${r.targetValue}`;
  return `every ${r.targetValue.intervalDays}d`;
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

  useEffect(() => {
    let alive = true;
    const end = todayLocalISO();
    const start = addDaysLocalISO(end, -30);
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
  const catHue = catColor(goal.cat);

  const recentEvents = [];
  for (const log of logs) {
    for (const e of log.events) {
      if (e.goalId === goal.id) recentEvents.push({ date: log.date, ...e });
    }
  }
  recentEvents.sort((a, b) => b.date.localeCompare(a.date));
  const recentTop = recentEvents.slice(0, 5);

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Link to="/" style={backLinkStyle}>← Life</Link>

        <header style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
          <div style={{ width: 48, height: 48, display: "grid", placeItems: "center" }}>
            <Orb cat={goal.cat} momentum={0.5} still={goal.state !== "active" && goal.state !== "drift"} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: FONT.serif, fontWeight: 400, fontSize: TYPE.goalTitle, margin: 0, color: PAPER.ink }}>
              {goal.name}
            </h1>
            <div style={{ fontSize: 13, color: PAPER.dim, marginTop: 4 }}>
              {recentEvents.length > 0 ? `${recentEvents.length} recent events · last worked ${recentTop[0].date}` : "no logs yet"}
            </div>
          </div>
        </header>

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
