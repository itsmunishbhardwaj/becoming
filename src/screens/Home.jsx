import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PAPER, FONT, TYPE, RADIUS, SPACE } from "../tokens.js";
import { listGoals, readLogsInRange, saveGoal } from "../data/store.js";
import { advanceGoal } from "../data/rounds.js";
import { momentum } from "../data/adherence.js";
import { generateInsights } from "../data/insights.js";
import GoalCard from "../components/GoalCard.jsx";
import InsightCard from "../components/InsightCard.jsx";
import LogBlob from "../components/LogBlob.jsx";
import LogSheet from "../components/LogSheet.jsx";
import { todayLocalISO, addDaysLocalISO } from "../lib/date.js";

function rangeEnd() {
  return todayLocalISO();
}

function rangeStart() {
  return addDaysLocalISO(todayLocalISO(), -13);
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function Home() {
  const [goals, setGoals] = useState(null); // null = loading
  const [logs, setLogs] = useState([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [insights, setInsights] = useState([]);
  const [showIntro, setShowIntro] = useState(() => !prefersReducedMotion());
  const [dismissedIds, setDismissedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("becoming.insights.seen") || "[]")); }
    catch { return new Set(); }
  });

  useEffect(() => {
    if (!showIntro) return;
    const t = setTimeout(() => setShowIntro(false), 2400);
    return () => clearTimeout(t);
  }, [showIntro]);

  useEffect(() => {
    Promise.all([
      listGoals(),
      readLogsInRange({ from: rangeStart(), to: rangeEnd() }),
    ])
      .then(([g, l]) => {
        const today = todayLocalISO();
        const advanced = [];
        for (const goal of g) {
          const { goal: next, changed } = advanceGoal(goal, today);
          if (changed) { saveGoal(next).catch(() => {}); }
          advanced.push(next);
        }
        setGoals(advanced);
        setLogs(l);
        setInsights(generateInsights({ goals: advanced, logs: l, today }));
      })
      .catch(() => { setGoals([]); setLogs([]); });
  }, []);

  const activeInsight = insights.find((q) => !dismissedIds.has(q.id));

  function dismissInsight(id) {
    const next = new Set(dismissedIds);
    next.add(id);
    setDismissedIds(next);
    try { localStorage.setItem("becoming.insights.seen", JSON.stringify([...next])); } catch {}
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const enriched = goals
    ? goals.map((g) => ({
        ...g,
        momentum: momentum({ goal: g, logs, asOf: todayLocalISO() }),
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
        @keyframes home-intro {
          0%   { opacity: 0; transform: translateY(6px); }
          38%  { opacity: 1; transform: translateY(0); }
          68%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
        .home-intro-word { animation: home-intro 2.4s ease-in-out forwards; }
        @media (prefers-reduced-motion: reduce) {
          .breathe { animation: none; }
          .home-intro-word { animation: none; opacity: 0; }
        }
      `}</style>

      {showIntro && (
        <div
          style={{
            position: "fixed", inset: 0, background: PAPER.bg,
            display: "grid", placeItems: "center", zIndex: 100,
            pointerEvents: "none",
          }}
        >
          <div
            className="home-intro-word"
            style={{
              fontFamily: FONT.serif, fontWeight: 400, fontSize: 56,
              color: PAPER.ink, letterSpacing: "-0.01em",
            }}
          >
            Becoming
          </div>
        </div>
      )}

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

        {activeInsight && (
          <div style={{ marginBottom: 20 }}>
            <InsightCard question={activeInsight} onAnswer={(id) => dismissInsight(id)} />
          </div>
        )}

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
              <Link to="/create" style={ctaStyle}>+ New goal</Link>
              <div style={{ marginTop: 8 }}>
                <Link to="/onboard" style={{ color: PAPER.faint, fontSize: 12, textDecoration: "none" }}>
                  or walk it out with the Balboa breakdown →
                </Link>
              </div>
            </div>
          </>
        )}

        <footer style={{ marginTop: 36, textAlign: "center", fontSize: 13 }}>
          <Link to="/year" style={{ color: PAPER.dim, textDecoration: "none" }}>
            Zoom out — see your year ↓
          </Link>
        </footer>
      </div>

      {goals && goals.length > 0 && (
        <>
          <LogBlob onClick={() => setSheetOpen(true)} />
          <LogSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            onSaved={async () => {
              const [gRaw, l] = await Promise.all([listGoals(), readLogsInRange({ from: rangeStart(), to: rangeEnd() })]);
              const today = todayLocalISO();
              const g = [];
              for (const goal of gRaw) {
                const { goal: next, changed } = advanceGoal(goal, today);
                if (changed) saveGoal(next).catch(() => {});
                g.push(next);
              }
              setGoals(g);
              setLogs(l);
              setInsights(generateInsights({ goals: g, logs: l, today }));
            }}
          />
        </>
      )}
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
      <Link to="/create" style={ctaStyle}>+ Set your first goal</Link>
      <div style={{ marginTop: 10 }}>
        <Link to="/onboard" style={{ color: PAPER.faint, fontSize: 12, textDecoration: "none" }}>
          or walk it out with the Balboa breakdown →
        </Link>
      </div>
    </div>
  );
}
