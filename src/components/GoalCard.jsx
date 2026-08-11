import { Link } from "react-router-dom";
import { NIGHT, CATS, STATE } from "../tokens.js";
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
        background: NIGHT.card,
        border: `1px solid ${NIGHT.cardBorder}`,
        borderRadius: 20,
        padding: "20px 22px",
        cursor: "pointer",
        color: NIGHT.text,
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
              <span style={{ fontSize: 12, color: NIGHT.dim, whiteSpace: "nowrap", flexShrink: 0 }}>
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
          <div style={{ fontSize: 13, color: NIGHT.dim, marginTop: 4 }}>
            {dormant ? (
              <em style={{ color: NIGHT.faint }}>“{goal.dormantNote}”</em>
            ) : completed ? (
              <em style={{ color: NIGHT.faint }}>“{goal.retro}”</em>
            ) : (
              <>
                {goal.last} · {goal.lastDetail}
                {goal.streak && <span style={{ color: NIGHT.faint }}> · {goal.streak}</span>}
                {drift && <span style={{ color: NIGHT.whisper }}> · quiet lately</span>}
              </>
            )}
          </div>
        </div>
      </div>

      {!still && <MomentumBar cat={goal.cat} momentum={goal.momentum} dormant={dormant} />}

    </Link>
  );
}
