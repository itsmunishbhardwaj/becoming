import { useState } from "react";
import { NIGHT, CATS, STATE } from "../tokens.js";
import Orb from "./Orb.jsx";
import MomentumBar from "./MomentumBar.jsx";

// Accumulation framing everywhere (docs/origin-spreadsheets.md, oblig. 5):
// the big number is what was EARNED; the target is quiet context. Never
// render the remainder, never headline a percentage of missed days.
export default function GoalCard({ goal }) {
  const [open, setOpen] = useState(false);
  const dormant = goal.state === STATE.DORMANT;
  const drift = goal.state === STATE.DRIFT;
  const completed = goal.state === STATE.COMPLETED;
  const still = dormant || completed;
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
          {/* The ambition, verbatim, in the user's own voice (oblig. 8) */}
          {goal.ambition && (
            <div
              style={{
                fontFamily: "'Fraunces', serif",
                fontStyle: "italic",
                fontSize: 14.5,
                lineHeight: 1.5,
                color: NIGHT.dim,
              }}
            >
              “{goal.ambition}”
            </div>
          )}

          {/* Current period sub-target — cadence per goal, not per day (oblig. 2) */}
          {goal.period && !completed && (
            <div
              style={{
                fontSize: 12.5,
                color: NIGHT.dim,
                padding: "8px 12px",
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${NIGHT.cardBorder}`,
                borderRadius: 12,
              }}
            >
              <span style={{ color: NIGHT.faint, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 10.5 }}>
                {goal.period.label}
              </span>
              <span style={{ marginLeft: 8 }}>{goal.period.target}</span>
            </div>
          )}

          {/* Projects: earned count bold, target quiet — no remainder shown */}
          {goal.projects.map((p) => (
            <div key={p.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
              <span style={{ color: NIGHT.dim }}>{p.name}</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                <span style={{ color: NIGHT.text }}>{p.done}</span>
                <span style={{ color: NIGHT.faint }}>
                  {p.total > 1 ? ` of ${p.total}` : p.done === p.total ? " ✓" : ""}
                  {p.unit ? ` ${p.unit}` : ""}
                </span>
              </span>
            </div>
          ))}

          {/* Habits: days KEPT. Misses are never rendered (brand rule 4). */}
          {goal.habits &&
            goal.habits.map((h) => (
              <div key={h.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                <span style={{ color: NIGHT.dim }}>
                  {h.name}
                  {h.polarity === "avoid" && (
                    <span style={{ color: NIGHT.faint, fontSize: 11.5 }}> · clean days</span>
                  )}
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  <span style={{ color: NIGHT.text }}>{h.hits}</span>
                  <span style={{ color: NIGHT.faint }}> days kept</span>
                  {h.current > 0 && <span style={{ color: NIGHT.faint }}> · {h.current} running</span>}
                </span>
              </div>
            ))}

          {/* The reward, in the user's words, waiting at the finish (oblig. 4) */}
          {goal.reward && (
            <div style={{ fontSize: 12.5, color: NIGHT.faint, marginTop: 2 }}>
              {completed ? "The reward: " : "Waiting at the finish: "}
              <em>{goal.reward}</em>
            </div>
          )}

          <div style={{ fontSize: 12, color: NIGHT.faint, marginTop: 4 }}>Open goal workspace →</div>
        </div>
      )}
    </button>
  );
}
