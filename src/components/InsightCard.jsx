import { useState } from "react";
import { NIGHT } from "../tokens.js";

// AI Chief of Staff. Patterns framed as QUESTIONS, never declarations.
// Confirm → joins pattern graph. Reject → discarded. (docs/philosophy.md)
export default function InsightCard() {
  const [answered, setAnswered] = useState(null);
  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(169,196,245,0.12), rgba(201,184,240,0.10))",
        border: "1px solid rgba(201,184,240,0.24)",
        borderRadius: 20,
        padding: "18px 22px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: NIGHT.dim,
          marginBottom: 8,
        }}
      >
        A question from your week
      </div>
      {answered === null ? (
        <>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: NIGHT.text }}>
            Your Leetcode sessions seem stronger on gym days — 3 of your last 4 best
            sessions came after workouts. Does that match your experience?
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button
              onClick={() => setAnswered(true)}
              className="pill"
              style={{
                background: "rgba(168,218,192,0.18)",
                border: "1px solid rgba(168,218,192,0.4)",
                color: "#8FD3AE",
              }}
            >
              Yes, that's real
            </button>
            <button
              onClick={() => setAnswered(false)}
              className="pill"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${NIGHT.cardBorder}`,
                color: NIGHT.dim,
              }}
            >
              Not really
            </button>
          </div>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 14, color: NIGHT.dim, lineHeight: 1.5 }}>
          {answered
            ? "Noted. Gym → coding link added to your pattern graph."
            : "Discarded. I won't bring this one up again."}
        </p>
      )}
    </div>
  );
}
