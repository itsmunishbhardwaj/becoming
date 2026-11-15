import { useState } from "react";
import { Link } from "react-router-dom";
import { PAPER, FONT, RADIUS } from "../tokens.js";
import { goalColor } from "../lib/goalColor.js";

// Staggered animation offsets matching prototype orb-breathe phases
const ORB_DELAYS = ["0s", "-2.1s", "-4.4s", "-1.6s", "-3.2s", "-5.7s", "-1.0s", "-3.9s"];

export default function GoalCard({ goal, index = 0, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const color = goalColor(goal);
  const m = goal.momentum ?? 0;
  const dormant = goal.state === "dormant" || goal.state === "completed";

  return (
    <Link
      to={`/goal/${goal.id}`}
      unstable_viewTransition
      className={`goal-row goal-row-${index}`}
      style={{
        display: "grid",
        gridTemplateColumns: "52px 1fr auto",
        gap: "0 16px",
        alignItems: "center",
        padding: "18px 0",
        borderTop: index === 0 ? `1px solid ${PAPER.line}` : "none",
        borderBottom: `1px solid ${PAPER.line}`,
        cursor: "pointer",
        color: PAPER.ink,
        textDecoration: "none",
        opacity: dormant ? 0.55 : 1,
        transition: "opacity 150ms cubic-bezier(0.23, 1, 0.32, 1)",
      }}
    >
      {/* Orb — view-transition-name enables morph to goal detail page */}
      <div
        className="goal-orb orb-breathe"
        style={{
          width: 52,
          height: 52,
          borderRadius: RADIUS.blob,
          background: `radial-gradient(circle at 35% 30%, ${color}, ${color}99 80%)`,
          flexShrink: 0,
          animationDelay: dormant ? "0s" : ORB_DELAYS[index % ORB_DELAYS.length],
          animation: dormant ? "none" : undefined,
          viewTransitionName: `orb-${goal.id}`,
        }}
      />

      {/* Goal inner — name + momentum bar */}
      <div style={{ minWidth: 0 }}>
        <div
          className="goal-name-text"
          style={{
            fontFamily: FONT.serif,
            fontWeight: 600,
            fontSize: 20,
            lineHeight: 1.35,
            color: PAPER.ink,
            letterSpacing: "-0.01em",
            marginBottom: 8,
            textWrap: "pretty",
            viewTransitionName: `goal-name-${goal.id}`,
          }}
        >
          {goal.name}
        </div>

        {/* Momentum bar */}
        <div style={{
          height: 2,
          background: PAPER.track,
          borderRadius: 99,
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${Math.round(m * 100)}%`,
            background: color,
            borderRadius: 99,
            transition: "width 600ms cubic-bezier(0.23, 1, 0.32, 1)",
          }} />
        </div>

        {goal.state === "drift" && (
          <div style={{ fontSize: 12, color: PAPER.whisper, marginTop: 5 }}>quiet lately</div>
        )}
      </div>

      {/* Day count + delete */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        <div
          className="goal-count-num"
          style={{
            fontFamily: FONT.serif,
            fontSize: 32,
            fontWeight: 300,
            color: PAPER.faint,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            textAlign: "right",
            whiteSpace: "nowrap",
          }}
        >
          {goal.headline?.n ?? ""}
          <span style={{
            display: "block",
            fontFamily: FONT.sans,
            fontSize: 10.5,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: PAPER.faint,
            textAlign: "right",
            marginTop: 3,
          }}>
            {goal.headline?.unit ?? ""}
          </span>
        </div>

        {onDelete && !confirming && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirming(true); }}
            style={{
              background: "none",
              border: "none",
              padding: "2px 4px",
              cursor: "pointer",
              fontFamily: FONT.sans,
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: PAPER.whisper,
            }}
          >
            delete
          </button>
        )}

        {confirming && (
          <div
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(goal.id); }}
              style={{
                background: "none",
                border: `1px solid ${PAPER.line}`,
                borderRadius: 4,
                padding: "2px 8px",
                cursor: "pointer",
                fontFamily: FONT.sans,
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: PAPER.ink,
              }}
            >
              yes
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirming(false); }}
              style={{
                background: "none",
                border: "none",
                padding: "2px 4px",
                cursor: "pointer",
                fontFamily: FONT.sans,
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: PAPER.whisper,
              }}
            >
              cancel
            </button>
          </div>
        )}
      </div>
    </Link>
  );
}
