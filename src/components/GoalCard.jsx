import { Link } from "react-router-dom";
import { PAPER, FONT, STATE } from "../tokens.js";
import Orb from "./Orb.jsx";
import MomentumBar from "./MomentumBar.jsx";
import { goalColor } from "../lib/goalColor.js";

export default function GoalCard({ goal, isFirst }) {
  const dormant = goal.state === STATE.DORMANT;
  const drift = goal.state === STATE.DRIFT;
  const completed = goal.state === STATE.COMPLETED;
  const still = dormant || completed;
  const color = goalColor(goal);

  return (
    <Link
      to={`/goal/${goal.id}`}
      className="goal-card"
      style={{
        display: "grid",
        gridTemplateColumns: "52px 1fr auto",
        gap: "0 16px",
        alignItems: "center",
        padding: "18px 0",
        borderTop: isFirst ? `1px solid ${PAPER.line}` : "none",
        borderBottom: `1px solid ${PAPER.line}`,
        cursor: "pointer",
        color: PAPER.ink,
        opacity: dormant ? 0.62 : 1,
        textDecoration: "none",
      }}
    >
      <Orb cat={goal.cat} color={color} momentum={goal.momentum} dormant={still} />

      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: FONT.serif,
          fontSize: 20,
          fontWeight: 400,
          color: PAPER.ink,
          letterSpacing: "-0.01em",
          lineHeight: 1.2,
          marginBottom: still ? 0 : 8,
          textWrap: "pretty",
        }}>
          {goal.name}
        </div>

        {dormant && (
          <div style={{ fontSize: 12, color: PAPER.dim, marginTop: 4, fontStyle: "italic" }}>
            resting intentionally
          </div>
        )}
        {completed && (
          <div style={{ fontSize: 12, color, marginTop: 4 }}>
            became real
          </div>
        )}
        {!still && (
          <MomentumBar cat={goal.cat} color={color} momentum={goal.momentum} />
        )}
        {drift && !still && (
          <div style={{ fontSize: 11.5, color: PAPER.whisper, marginTop: 5 }}>
            quiet lately
          </div>
        )}
        {goal.latestNote && !still && (
          <div style={{ fontSize: 12, color: PAPER.faint, marginTop: 6, lineHeight: 1.45, fontStyle: "italic" }}>
            {goal.latestNote.text.length > 80
              ? goal.latestNote.text.slice(0, 80).trimEnd() + "…"
              : goal.latestNote.text}
          </div>
        )}
      </div>

      <div style={{
        fontFamily: FONT.serif,
        fontSize: 34,
        fontWeight: 300,
        color: PAPER.faint,
        lineHeight: 1,
        textAlign: "right",
        whiteSpace: "nowrap",
        minWidth: 48,
      }}>
        {goal.headline?.n ?? ""}
        <span style={{
          display: "block",
          fontFamily: FONT.sans,
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: PAPER.faint,
          marginTop: 3,
          textAlign: "right",
        }}>
          {goal.headline?.unit ?? ""}
        </span>
      </div>
    </Link>
  );
}
