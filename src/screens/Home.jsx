import { Link } from "react-router-dom";
import { NIGHT, FONT } from "../tokens.js";
import { GOALS } from "../data/mockLife.js";
import GoalCard from "../components/GoalCard.jsx";
import InsightCard from "../components/InsightCard.jsx";

export default function Home() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const active = GOALS.filter((g) => g.state !== "dormant").length;
  const resting = GOALS.length - active;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: NIGHT.bgGradient,
        color: NIGHT.text,
        fontFamily: FONT.sans,
        padding: "0 20px 64px",
      }}
    >
      <style>{`
        .goal-card { transition: transform 200ms ease, border-color 200ms ease; }
        .goal-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.16); }
        .goal-card:focus-visible, .pill:focus-visible { outline: 2px solid #C9B8F0; outline-offset: 2px; }
        .pill { border-radius: 999px; padding: 7px 16px; font-size: 13px; cursor: pointer; font-family: inherit; transition: opacity 150ms; }
        .pill:hover { opacity: 0.85; }
        @keyframes breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
        .orb-breathe { animation: breathe 4.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .orb-breathe { animation: none; }
          .goal-card { transition: none; }
        }
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <header style={{ padding: "52px 2px 30px" }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: NIGHT.faint,
              marginBottom: 10,
            }}
          >
            {today}
          </div>
          <h1
            style={{
              fontFamily: FONT.serif,
              fontWeight: 500,
              fontSize: 30,
              lineHeight: 1.25,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Who are you becoming?
          </h1>
          <p style={{ color: NIGHT.dim, fontSize: 14, margin: "10px 0 0" }}>
            {active} goals in motion · {resting} resting
          </p>
        </header>

        <div style={{ marginBottom: 26 }}>
          <InsightCard />
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {GOALS.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>

        <footer style={{ marginTop: 36, textAlign: "center", fontSize: 13 }}>
          <Link to="/year" style={{ color: NIGHT.faint, textDecoration: "none" }}>
            Zoom out — <span style={{ color: NIGHT.dim }}>see your year</span>
          </Link>
        </footer>
      </div>
    </div>
  );
}
