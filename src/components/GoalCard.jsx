import { Link } from "react-router-dom";
import { PAPER, CATS, STATE } from "../tokens.js";
import Orb from "./Orb.jsx";
import MomentumBar from "./MomentumBar.jsx";

// Accumulation framing everywhere (docs/origin-spreadsheets.md, oblig. 5):
// the big number is what was EARNED; the target is quiet context. Never
// render the remainder, never headline a percentage of missed days.
export default function GoalCard({ goal }) {
  const dormant = goal.state === STATE.DORMANT;
  const drift = goal.state === STATE.DRIFT;
  const completed = goal.state === STATE.COMPLETED;
  const still = dormant || completed;
  const color = CATS[goal.cat].color;

  return (
    <Link
      to={`/goal/${goal.id}`}
      className="goal-card"
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: PAPER.card,
        border: `1px solid ${PAPER.cardBorder}`,
        borderRadius: 20,
        padding: "20px 22px",
        cursor: "pointer",
        color: PAPER.ink,
        opacity: dormant ? 0.72 : 1,
        textDecoration: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Orb cat={goal.cat} momentum={goal.momentum} dormant={still} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 19,
                fontWeight: 500,
                letterSpacing: "0.01em",
              }}
            >
              {goal.name}
            </span>
            {dormant ? (
              <span style={{ fontSize: 12, color: PAPER.dim, whiteSpace: "nowrap", flexShrink: 0 }}>
                🌙 Resting since {goal.last}
              </span>
            ) : completed ? (
              <span style={{ fontSize: 12, color, whiteSpace: "nowrap", flexShrink: 0 }}>
                ✓ became real · {goal.last}
              </span>
            ) : (
              // Accumulation headline: what exists now, in category color.
              <span
                style={{
                  fontSize: 13,
                  color,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {goal.headline.n} {goal.headline.unit}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: PAPER.dim, marginTop: 4 }}>
            {dormant ? (
              <em style={{ color: PAPER.faint }}>“{goal.dormantNote}”</em>
            ) : completed ? (
              <em style={{ color: PAPER.faint }}>“{goal.retro}”</em>
            ) : (
              <>
                {goal.last} · {goal.lastDetail}
                {goal.streak && <span style={{ color: PAPER.faint }}> · {goal.streak}</span>}
                {drift && <span style={{ color: PAPER.whisper }}> · quiet lately</span>}
              </>
            )}
          </div>
        </div>
      </div>

      {!still && <MomentumBar cat={goal.cat} momentum={goal.momentum} dormant={dormant} />}

    </Link>
  );
}
