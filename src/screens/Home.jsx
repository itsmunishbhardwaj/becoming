import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "react-router-dom";
import { PAPER, FONT, TYPE, RADIUS, SPACE } from "../tokens.js";
import { listGoals, readLogsInRange, saveGoal } from "../data/store.js";
import { advanceGoal } from "../data/rounds.js";
import { momentum } from "../data/adherence.js";
import { generateInsights } from "../data/insights.js";
import { goalColor } from "../lib/goalColor.js";
import GoalCard from "../components/GoalCard.jsx";
import InsightCard from "../components/InsightCard.jsx";
import LogBlob from "../components/LogBlob.jsx";
import LogSheet from "../components/LogSheet.jsx";
import { todayLocalISO, addDaysLocalISO } from "../lib/date.js";

const YEAR = new Date().getFullYear();
const YEAR_FROM = `${YEAR}-01-01`;

function rangeEnd() { return todayLocalISO(); }
function rangeStart() { return YEAR_FROM; }

function latestNoteForGoal(goalId, logs) {
  let best = null;
  for (const log of logs) {
    const t = log.notes?.[goalId];
    if (t && t.trim() !== "" && (!best || log.date > best.date)) {
      best = { date: log.date, text: t };
    }
  }
  return best;
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function MiniYearGrid({ logs, goals }) {
  const today = todayLocalISO();

  const dateColors = useMemo(() => {
    const map = {};
    for (const log of logs) {
      if (log.date < YEAR_FROM || log.date > today) continue;
      for (const evt of log.events) {
        if (!map[log.date]) {
          const g = goals?.find((goal) => goal.id === evt.goalId);
          if (g) map[log.date] = goalColor(g);
        }
      }
    }
    return map;
  }, [logs, goals, today]);

  const jan1 = new Date(YEAR, 0, 1);
  const startDow = jan1.getDay();
  const weeks = [];

  for (let w = 0; w < 53; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const dayOffset = w * 7 + d - startDow;
      const dt = new Date(YEAR, 0, 1 + dayOffset);
      if (dt.getFullYear() !== YEAR) { days.push(null); continue; }
      const iso = `${YEAR}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      if (iso > today) { days.push({ future: true }); continue; }
      days.push({ iso, color: dateColors[iso] || null });
    }
    weeks.push(days);
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(53, 1fr)",
      gap: 2,
      marginTop: 16,
    }}>
      {weeks.map((week, w) => (
        <div key={w} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {week.map((day, d) => (
            <div
              key={d}
              style={{
                width: "100%",
                aspectRatio: "1",
                borderRadius: 1,
                background: day?.color ? day.color : PAPER.track,
                opacity: day?.color ? 0.8 : (day?.future ? 0.35 : 0.6),
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [goals, setGoals] = useState(null);
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
    const t = setTimeout(() => setShowIntro(false), 3700);
    return () => clearTimeout(t);
  }, [showIntro]);

  useEffect(() => {
    Promise.all([listGoals(), readLogsInRange({ from: rangeStart(), to: rangeEnd() })])
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
        headline: (() => {
          const n = logs.filter((l) => l.events.some((e) => e.goalId === g.id)).length;
          return { n, unit: "days marked" };
        })(),
        period: g.rounds && g.rounds[g.currentRound - 1]
          ? { label: `Round ${g.currentRound}`, target: renderTargetLabel(g) }
          : null,
        projects: g.projects || [],
        habits: g.habits || [],
        latestNote: latestNoteForGoal(g.id, logs),
      }))
    : [];

  const activeGoals = enriched.filter((g) => g.state === "active" || g.state === "drift");

  async function reload() {
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
  }

  return (
    <div style={pageStyle}>
      <style>{`
        /* Container: opacity fade-in + mist exit (blur + upward drift). */
        @keyframes home-intro-container {
          0%   { opacity: 0; }
          24%  { opacity: 1; }
          68%  { opacity: 1; filter: blur(0px); transform: translateY(0); }
          100% { opacity: 0; filter: blur(16px); transform: translateY(-22px); }
        }
        /* Real text: rises upward into position. */
        @keyframes home-intro-text-rise {
          0%   { transform: translateY(36px); }
          28%  { transform: translateY(0); }
          100% { transform: translateY(0); }
        }
        /* Reflection: drops downward into position — opposite direction. */
        @keyframes home-intro-reflect-drop {
          0%   { transform: translateY(-24px); }
          28%  { transform: translateY(0); }
          100% { transform: translateY(0); }
        }
        @keyframes home-intro-curtain {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        .home-intro-container {
          animation: home-intro-container 3s ease-out both;
          display: inline-block;
          position: relative;
        }
        .home-intro-text-inner {
          animation: home-intro-text-rise 3s ease-out both;
        }
        .home-intro-reflect-wrapper {
          animation: home-intro-reflect-drop 3s ease-out both;
          margin-top: 5px;
        }
        .home-intro-overlay {
          animation: home-intro-curtain 0.55s ease-out 3s both;
        }
        @media (prefers-reduced-motion: reduce) {
          .home-intro-container, .home-intro-overlay { display: none; }
        }

        /* ── Layout shells ─────────── */
        .home-layout {
          display: flex;
          flex-direction: column;
          min-height: 100dvh;
          padding: 44px 26px 60px;
          box-sizing: border-box;
        }
        .home-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 48px;
          flex-shrink: 0;
        }
        .home-main {
          flex: 1;
        }
        .home-footer {
          margin-top: 56px;
          flex-shrink: 0;
          padding-top: 40px;
          border-top: 1px solid ${PAPER.line};
        }
        .home-footer-nav {
          display: flex;
          gap: 24px;
          margin-top: 20px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
        }

        @media (min-width: 768px) {
          .home-layout { padding: 52px 64px 80px; }
          .home-header { margin-bottom: 56px; }
        }

        /* ── Goal rows ─────────────── */
        @media (hover: hover) and (pointer: fine) {
          .goal-row:hover { opacity: 0.65 !important; }
        }
        .goal-row:active { opacity: 0.45 !important; }
        @media (min-width: 768px) {
          .goal-row {
            grid-template-columns: 60px 1fr auto !important;
            gap: 0 20px !important;
            padding: 22px 0 !important;
          }
          .goal-orb { width: 60px !important; height: 60px !important; }
          .goal-name-text { font-size: 24px !important; }
          .goal-count-num { font-size: 40px !important; }
        }
      `}</style>

      {showIntro && (
        <div
          className="home-intro-overlay"
          style={{
            position: "fixed", inset: 0, background: PAPER.bg,
            display: "grid", placeItems: "center", zIndex: 100, pointerEvents: "none",
          }}
        >
          <div className="home-intro-container">
            {/* Real text — rises upward */}
            <div
              className="home-intro-text-inner"
              style={{
                fontFamily: FONT.serif, fontWeight: 300, fontSize: 56,
                color: PAPER.ink, letterSpacing: "-0.02em", lineHeight: 1,
              }}
            >
              Becoming
            </div>
            {/* Reflection — in normal flow below original, scaleY(-1) flips it in place */}
            <div aria-hidden="true" className="home-intro-reflect-wrapper">
              <div style={{
                fontFamily: FONT.serif, fontWeight: 300, fontSize: 56,
                color: PAPER.ink, letterSpacing: "-0.02em", lineHeight: 1,
                transform: "scaleY(-1)",
                filter: "blur(6px)",
                opacity: 0.28,
              }}>
                Becoming
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="home-layout">
        <div className="home-header">
          <div style={wordmarkStyle}>Becoming</div>
          <div style={dateLine}>{today}</div>
        </div>

        {/* Main — goals list, fills all available width */}
        <main className="home-main">
          <AnimatePresence>
            {activeInsight && (
              <motion.div
                key={activeInsight.id}
                exit={{
                  opacity: 0,
                  transform: "translateY(-10px) scale(0.97)",
                }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                style={{ marginBottom: 28 }}
              >
                <InsightCard question={activeInsight} onAnswer={(id) => dismissInsight(id)} />
              </motion.div>
            )}
          </AnimatePresence>

          {goals === null && (
            <p style={{ color: PAPER.faint, fontSize: TYPE.body }}>Reading your vault…</p>
          )}

          {goals && goals.length === 0 && <EmptyHome />}

          {goals && goals.length > 0 && (
            <>
              <div style={sectionLabel}>Your goals</div>
              <div style={{ marginTop: 4 }}>
                {enriched.map((g, i) => (
                  <GoalCard key={g.id} goal={g} index={i} />
                ))}
              </div>
              <div style={{ marginTop: 40 }}>
                <Link to="/create" className="home-cta" style={newGoalBtn}>
                  <span style={plusRing}>+</span>
                  begin something new
                </Link>
                <div style={{ marginTop: 10 }}>
                  <Link to="/onboard" style={{ color: PAPER.faint, fontSize: 12, textDecoration: "none" }}>
                    or walk it out with the Balboa breakdown →
                  </Link>
                </div>
              </div>
            </>
          )}
        </main>

        {/* Footer — year activity grid, always at bottom */}
        <footer className="home-footer">
          <div style={sectionLabel}>This year</div>
          {goals !== null && (
            <MiniYearGrid logs={logs} goals={goals} />
          )}
          <div className="home-footer-nav">
            <div style={{ display: "flex", gap: 24 }}>
              <Link to="/year" style={sideNavLink}>Year →</Link>
              <Link to={`/month/${todayLocalISO().slice(0, 7)}`} style={sideNavLink}>Month →</Link>
            </div>
            {goals && activeGoals.length > 0 && (
              <div style={{ fontSize: 12, color: PAPER.faint }}>
                {activeGoals.length} goal{activeGoals.length === 1 ? "" : "s"} in motion
              </div>
            )}
          </div>
        </footer>
      </div>

      {goals && goals.length > 0 && (
        <>
          <LogBlob onClick={() => setSheetOpen(true)} />
          <LogSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            onSaved={reload}
          />
        </>
      )}
    </div>
  );
}

function renderTargetLabel(g) {
  const r = g.rounds[g.currentRound - 1];
  if (!r) return "";
  if (typeof g.baseline === "string") return `wake by ${r.targetValue} until ${r.endDate}`;
  if (g.baseline?.intervalDays != null) return `every ${r.targetValue && r.targetValue.intervalDays}d until ${r.endDate}`;
  if (g.baseline == null) return `until ${r.endDate}`;
  return "";
}

function EmptyHome() {
  return (
    <div style={{
      borderTop: `1px solid ${PAPER.line}`,
      borderBottom: `1px solid ${PAPER.line}`,
      padding: "48px 0",
    }}>
      <p style={{
        fontFamily: FONT.serif, fontStyle: "italic",
        fontSize: 18, color: PAPER.ink, margin: "0 0 10px", lineHeight: 1.5,
      }}>
        "One step, one punch, one round at a time."
      </p>
      <p style={{ color: PAPER.dim, fontSize: TYPE.body, margin: "0 0 28px" }}>
        No goals yet. Start with one.
      </p>
      <Link to="/create" style={newGoalBtn}>
        <span style={plusRing}>+</span>
        begin something new
      </Link>
      <div style={{ marginTop: 10 }}>
        <Link to="/onboard" style={{ color: PAPER.faint, fontSize: 12, textDecoration: "none" }}>
          or walk it out with the Balboa breakdown →
        </Link>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: PAPER.bg,
  color: PAPER.ink,
  fontFamily: FONT.sans,
};
const wordmarkStyle = {
  fontFamily: FONT.serif,
  fontWeight: 600,
  fontSize: 13,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: PAPER.dim,
  flexShrink: 0,
};
const dateLine = {
  fontFamily: FONT.serif,
  fontStyle: "italic",
  fontSize: 13,
  color: PAPER.faint,
  textAlign: "right",
};
const sectionLabel = {
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: PAPER.faint,
  marginBottom: 20,
};
const sideNavLink = {
  fontSize: 12,
  color: PAPER.dim,
  textDecoration: "none",
  letterSpacing: "0.04em",
};
const newGoalBtn = {
  fontFamily: FONT.serif,
  fontStyle: "italic",
  fontSize: 15,
  color: PAPER.dim,
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  textDecoration: "none",
  transition: "color 120ms ease, opacity 120ms ease",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
};
const plusRing = {
  width: 28, height: 28,
  border: `1px solid ${PAPER.line}`,
  borderRadius: "50%",
  display: "inline-grid",
  placeItems: "center",
  fontSize: 18,
  color: PAPER.faint,
  fontStyle: "normal",
  flexShrink: 0,
};
