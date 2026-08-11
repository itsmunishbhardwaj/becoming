import { PAPER, FONT, RADIUS } from "../tokens.js";

// ui-spec §2 exception: these two hex values are the InsightCard gradient
// defined in the Figma spec. No PAPER token covers them; a future token
// addition can migrate cleanly. Do not use them elsewhere.
const INSIGHT_GRADIENT = {
  from: "#EFEAF6", // soft lavender — spec §2
  to: "#EDF1EA",   // soft sage   — spec §2
};

// AI Chief of Staff. Patterns framed as QUESTIONS, never declarations.
// Confirm → joins pattern graph. Reject → discarded. (docs/philosophy.md)
//
// Both pills styled identically — rejecting the AI, or resting a drifting
// goal, must cost nothing visually. (docs/brand.md rule 7)
const pillStyle = {
  background: PAPER.card,
  border: `1px solid ${PAPER.line}`,
  borderRadius: 999,
  padding: "8px 15px",
  fontSize: 12.5,
  fontFamily: FONT.sans,
  color: PAPER.ink,
  cursor: "pointer",
};

export default function InsightCard({ question, onAnswer }) {
  if (!question) return null;
  return (
    <div style={{
      background: `linear-gradient(135deg, ${INSIGHT_GRADIENT.from} 0%, ${INSIGHT_GRADIENT.to} 100%)`,
      border: `1px solid ${PAPER.line}`,
      borderRadius: RADIUS.r2,
      padding: "17px 20px",
      fontFamily: FONT.sans,
    }}>
      <div style={{
        fontSize: 11, letterSpacing: "1.6px", textTransform: "uppercase",
        color: PAPER.dim, fontWeight: 500, marginBottom: 8,
      }}>
        {question.kicker.toUpperCase()}
      </div>
      <p style={{
        fontSize: 14.5, lineHeight: 1.6, color: PAPER.ink, margin: "0 0 12px",
      }}>
        {question.text}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onAnswer(question.id, "yes")} style={pillStyle}>
          {question.yes.label}
        </button>
        <button onClick={() => onAnswer(question.id, "no")} style={pillStyle}>
          {question.no.label}
        </button>
      </div>
    </div>
  );
}
