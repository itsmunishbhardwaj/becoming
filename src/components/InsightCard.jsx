import { useState } from "react";
import { NIGHT } from "../tokens.js";
import { QUESTIONS } from "../data/mockLife.js";

// AI Chief of Staff. Patterns framed as QUESTIONS, never declarations.
// Confirm → joins pattern graph. Reject → discarded. (docs/philosophy.md)
//
// Both answers are styled identically — rejecting the AI, or resting a
// drifting goal, must cost nothing (docs/brand.md rule 7; origin doc:
// drift becomes one gentle question, never a standing 0%).
const pillStyle = {
  background: "rgba(255,255,255,0.05)",
  border: `1px solid ${NIGHT.cardBorder}`,
  color: NIGHT.text,
};

export default function InsightCard() {
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(null);
  const q = QUESTIONS[idx];
  const hasNext = idx < QUESTIONS.length - 1;
  if (!q) return null;

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
        {q.kicker}
      </div>
      {answered === null ? (
        <>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: NIGHT.text }}>{q.text}</p>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={() => setAnswered("yes")} className="pill" style={pillStyle}>
              {q.yes.label}
            </button>
            <button onClick={() => setAnswered("no")} className="pill" style={pillStyle}>
              {q.no.label}
            </button>
          </div>
        </>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: 14, color: NIGHT.dim, lineHeight: 1.5 }}>
            {answered === "yes" ? q.yes.response : q.no.response}
          </p>
          {hasNext && (
            <button
              onClick={() => {
                setIdx(idx + 1);
                setAnswered(null);
              }}
              className="pill"
              style={{ ...pillStyle, marginTop: 12, color: NIGHT.dim }}
            >
              One more question →
            </button>
          )}
        </>
      )}
    </div>
  );
}
