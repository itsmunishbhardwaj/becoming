import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PAPER, FONT, TYPE, RADIUS, SPACE } from "../tokens.js";
import { listGoals } from "../data/store.js";
import GoalCard from "../components/GoalCard.jsx";

export default function Home() {
  const [goals, setGoals] = useState(null); // null = loading

  useEffect(() => {
    listGoals().then(setGoals).catch(() => setGoals([]));
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const enriched = goals
    ? goals.map((g) => ({
        ...g,
        momentum: 0,
        last: "—",
        lastDetail: "no logs yet",
        streak: null,
        headline: g.headline || { n: 0, unit: "days marked" },
        period: g.rounds && g.rounds[g.currentRound - 1]
          ? { label: `Round ${g.currentRound}`, target: renderTargetLabel(g) }
          : null,
        projects: g.projects || [],
        habits: g.habits || [],
      }))
    : [];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: PAPER.bg,
        color: PAPER.ink,
        fontFamily: FONT.sans,
        padding: "36px 26px 96px",
      }}
    >
      <style>{`
        @keyframes breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        .breathe { animation: breathe 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .breathe { animation: none; } }
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <header style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11.5, letterSpacing: "1.8px", textTransform: "uppercase",
            color: PAPER.faint, marginBottom: 8, fontWeight: 500,
          }}>
            {today}
          </div>
          <h1 style={{
            fontFamily: FONT.serif, fontWeight: 400, fontSize: TYPE.h1,
            lineHeight: 1.25, margin: 0, color: PAPER.ink,
          }}>
            Who are you becoming?
          </h1>
          {goals && goals.length > 0 && (
            <p style={{ color: PAPER.dim, fontSize: TYPE.body, margin: "10px 0 0" }}>
              {goals.filter((g) => g.state === "active" || g.state === "drift").length} goals in motion
            </p>
          )}
        </header>

        {goals === null && (
          <p style={{ color: PAPER.faint, fontSize: TYPE.body }}>Reading your vault…</p>
        )}

        {goals && goals.length === 0 && <EmptyHome />}

        {goals && goals.length > 0 && (
          <>
            <div style={{ display: "grid", gap: SPACE.md }}>
              {enriched.map((g) => <GoalCard key={g.id} goal={g} />)}
            </div>
            <div style={{ marginTop: SPACE.xl, textAlign: "center" }}>
              <Link to="/onboard" style={ctaStyle}>+ New goal</Link>
            </div>
          </>
        )}

        <footer style={{ marginTop: 36, textAlign: "center", fontSize: 13 }}>
          <Link to="/year" style={{ color: PAPER.dim, textDecoration: "none" }}>
            Zoom out — see your year ↓
          </Link>
        </footer>
      </div>
    </div>
  );
}

const ctaStyle = {
  display: "inline-block",
  background: PAPER.card,
  border: `1px solid ${PAPER.line}`,
  borderRadius: RADIUS.pill,
  padding: "10px 22px",
  color: PAPER.ink,
  fontSize: TYPE.body,
  textDecoration: "none",
  fontFamily: FONT.sans,
};

function renderTargetLabel(g) {
  const r = g.rounds[g.currentRound - 1];
  if (!r) return "";
  if (g.type === "wake") return `wake by ${r.targetValue} until ${r.endDate}`;
  if (g.type === "cadence") return `every ${r.targetValue && r.targetValue.intervalDays}d until ${r.endDate}`;
  return "";
}

function EmptyHome() {
  return (
    <div style={{
      background: PAPER.card,
      border: `1px solid ${PAPER.line}`,
      borderRadius: RADIUS.r1,
      padding: "40px 28px",
      textAlign: "center",
    }}>
      <p style={{
        fontFamily: FONT.serif, fontStyle: "italic",
        fontSize: TYPE.ambition, color: PAPER.ink, margin: "0 0 8px",
      }}>
        "One step, one punch, one round at a time."
      </p>
      <p style={{ color: PAPER.dim, fontSize: TYPE.body, margin: "0 0 24px" }}>
        No goals yet. Start with one.
      </p>
      <Link to="/onboard" style={ctaStyle}>+ Set your first goal</Link>
    </div>
  );
}
