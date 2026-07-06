import { useState } from "react";
import { NIGHT, CATS, STATE } from "../tokens.js";
import Orb from "./Orb.jsx";
import MomentumBar from "./MomentumBar.jsx";

export default function GoalCard({ goal }) {
  const [open, setOpen] = useState(false);
  const dormant = goal.state === STATE.DORMANT;
  const drift = goal.state === STATE.DRIFT;
  const color = CATS[goal.cat].color;

  return (
    <button
      onClick={() => setOpen((v) => !v)}
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
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Orb cat={goal.cat} momentum={goal.momentum} dormant={dormant} />
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
                🌙 Dormant since {goal.last}
              </span>
            ) : (
              <span
                style={{
                  fontSize: 13,
                  color,
                  fontVariantNumeric: "tabular-nums",
                  flexShrink: 0,
                }}
              >
                {Math.round(goal.momentum * 100)}%
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: NIGHT.dim, marginTop: 4 }}>
            {dormant ? (
              <em style={{ color: NIGHT.faint }}>“{goal.dormantNote}”</em>
            ) : (
              <>
                {goal.last} · {goal.lastDetail}
                {goal.streak && <span style={{ color: NIGHT.faint }}> · {goal.streak}</span>}
                {drift && <span style={{ color: "#C9A15C" }}> · quiet lately</span>}
              </>
            )}
          </div>
        </div>
      </div>

      {!dormant && <MomentumBar cat={goal.cat} momentum={goal.momentum} dormant={dormant} />}

      {open && (
        <div
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: `1px solid ${NIGHT.cardBorder}`,
            display: "grid",
            gap: 10,
          }}
        >
          {goal.projects.map((p) => (
            <div key={p.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
              <span style={{ color: NIGHT.dim }}>{p.name}</span>
              <span style={{ color: NIGHT.faint, fontVariantNumeric: "tabular-nums" }}>
                {p.done} / {p.total}
              </span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: NIGHT.faint, marginTop: 4 }}>Open goal workspace →</div>
        </div>
      )}
    </button>
  );
}
