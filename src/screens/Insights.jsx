import { useEffect, useState } from "react";
import { PAPER, FONT, TYPE, RADIUS } from "../tokens.js";
import { listGoals, readLogsInRange } from "../data/store.js";
import { getStreaks, getProgress } from "../data/streaks.js";
import { generateInsights } from "../data/insights.js";
import { goalColor } from "../lib/goalColor.js";
import { todayLocalISO, addDaysLocalISO } from "../lib/date.js";
import InsightCard from "../components/InsightCard.jsx";

const YEAR = new Date().getFullYear();
const YEAR_FROM = `${YEAR}-01-01`;

function shortDate(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysBetween(from, to) {
  const a = new Date(from + "T00:00:00");
  const b = new Date(to + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

function firstMarkDate(goalId, logs) {
  for (const log of logs) {
    if (log.events.some((e) => e.goalId === goalId)) return log.date;
  }
  return null;
}

export default function Insights() {
  const today = todayLocalISO();
  const [goals, setGoals] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("dismissed-insights") || "[]")); }
    catch { return new Set(); }
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listGoals(),
      readLogsInRange({ from: YEAR_FROM, to: today }),
    ]).then(([gs, ls]) => {
      setGoals(gs);
      setLogs(ls);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [today]);

  function dismissInsight(id) {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem("dismissed-insights", JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  const activeGoals = goals.filter((g) => g.state === "active");

  const goalStats = activeGoals.map((goal) => {
    const streaks = getStreaks(goal.id, logs, today);
    const progress = getProgress(goal.id, logs, goal.dayTarget ?? null);
    const first = firstMarkDate(goal.id, logs);
    const daysFollowing = first ? daysBetween(first, today) : null;
    // "Ended" = day after longestTo, only if longest streak is not current
    const longestEnded =
      streaks.longestTo && streaks.longest > 0 && streaks.current < streaks.longest
        ? addDaysLocalISO(streaks.longestTo, 1)
        : null;
    return { goal, streaks, progress, first, daysFollowing, longestEnded };
  });

  const aiQuestions = generateInsights({ goals: activeGoals, logs, today });
  const activeInsight = aiQuestions.find((q) => !dismissedIds.has(q.id));

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <p style={{ color: PAPER.faint, fontFamily: FONT.sans, fontSize: TYPE.body, marginTop: 24 }}>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>

        <h1 style={h1Style}>Insights</h1>

        {/* Goal stats */}
        {goalStats.length === 0 ? (
          <p style={{ fontFamily: FONT.serif, fontStyle: "italic", fontSize: TYPE.ambition, color: PAPER.dim, marginTop: 16 }}>
            No active goals. Add one to see your stats.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
            {goalStats.map(({ goal, streaks, progress, first, daysFollowing, longestEnded }) => {
              const color = goalColor(goal);
              return (
                <GoalStatCard
                  key={goal.id}
                  goal={goal}
                  color={color}
                  streaks={streaks}
                  progress={progress}
                  first={first}
                  daysFollowing={daysFollowing}
                  longestEnded={longestEnded}
                  today={today}
                />
              );
            })}
          </div>
        )}

        {/* AI observations */}
        {activeInsight && (
          <section>
            <div style={sectionKicker}>What I'm noticing</div>
            <div style={{ marginTop: 10 }}>
              <InsightCard question={activeInsight} onAnswer={(id) => dismissInsight(id)} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function GoalStatCard({ goal, color, streaks, progress, first, daysFollowing, longestEnded, today }) {
  const { current, longest, longestFrom, longestTo } = streaks;
  const isCurrentLongest = current > 0 && current === longest;

  return (
    <article style={statCard}>
      {/* Goal header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: color, flexShrink: 0 }} />
        <span style={{ fontFamily: FONT.serif, fontSize: TYPE.goalName, color: PAPER.ink, flex: 1 }}>
          {goal.name}
        </span>
      </div>

      {/* Streak numbers */}
      <div style={{ display: "flex", gap: 24, marginBottom: 12, flexWrap: "wrap" }}>
        <StatBlock
          label="Current streak"
          value={current === 0 ? "—" : `${current} day${current === 1 ? "" : "s"}`}
          accent={current > 0 ? color : undefined}
        />
        <StatBlock
          label="Longest streak"
          value={longest === 0 ? "—" : `${longest} day${longest === 1 ? "" : "s"}`}
        />
        <StatBlock
          label="Marked this year"
          value={progress.marked === 0 ? "—" : String(progress.marked)}
        />
        {progress.target != null && (
          <StatBlock
            label="Target"
            value={`${progress.marked} / ${progress.target}${progress.percent != null ? ` · ${progress.percent}%` : ""}`}
          />
        )}
      </div>

      {/* Progress bar (only when target set) */}
      {progress.target != null && progress.percent != null && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ height: 4, background: PAPER.track, borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min(100, progress.percent)}%`,
              background: color,
              borderRadius: 999,
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>
      )}

      {/* Following since */}
      {first && (
        <div style={metaLine}>
          <span style={metaLabel}>Following since</span>
          <span style={metaValue}>{shortDate(first)}{daysFollowing != null ? ` · ${daysFollowing} day${daysFollowing === 1 ? "" : "s"} ago` : ""}</span>
        </div>
      )}

      {/* Longest run + ended */}
      {longest > 0 && longestFrom && longestTo && (
        <div style={metaLine}>
          <span style={metaLabel}>Longest run</span>
          <span style={metaValue}>
            {longest} day{longest === 1 ? "" : "s"}, {shortDate(longestFrom)}–{shortDate(longestTo)}
            {longestEnded ? <span style={{ color: PAPER.faint }}> · ended {shortDate(longestEnded)}</span> : isCurrentLongest ? <span style={{ color: color, fontWeight: 500 }}> · ongoing</span> : null}
          </span>
        </div>
      )}
    </article>
  );
}

function StatBlock({ label, value, accent }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 80 }}>
      <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: PAPER.faint, fontFamily: FONT.sans }}>{label}</span>
      <span style={{ fontFamily: FONT.serif, fontSize: 22, fontWeight: 300, color: accent || PAPER.ink, lineHeight: 1.1 }}>{value}</span>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const pageStyle = {
  minHeight: "100vh",
  background: PAPER.bg,
  color: PAPER.ink,
  fontFamily: FONT.sans,
  padding: "clamp(28px, 4vw, 56px) clamp(20px, 4vw, 64px) 120px",
};

const containerStyle = {
  maxWidth: 720,
  margin: "0 auto",
};

const h1Style = {
  fontFamily: FONT.serif,
  fontWeight: 300,
  fontSize: "clamp(36px, 6vw, 56px)",
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
  color: PAPER.ink,
  margin: "0 0 28px",
};

const sectionKicker = {
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: PAPER.faint,
  fontWeight: 500,
  fontFamily: FONT.sans,
};

const statCard = {
  background: PAPER.card,
  border: `1px solid ${PAPER.line}`,
  borderRadius: RADIUS.r1,
  padding: "18px 20px",
};

const metaLine = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  marginTop: 6,
  flexWrap: "wrap",
};

const metaLabel = {
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: PAPER.faint,
  fontFamily: FONT.sans,
  flexShrink: 0,
};

const metaValue = {
  fontSize: 13,
  color: PAPER.dim,
  fontFamily: FONT.sans,
};
