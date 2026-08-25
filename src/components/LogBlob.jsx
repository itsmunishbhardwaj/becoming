import { PAPER, FONT } from "../tokens.js";

export default function LogBlob({ onClick }) {
  return (
    <button
      aria-label="log your day"
      onClick={onClick}
      className="log-blob"
      style={{
        position: "fixed",
        right: 22,
        bottom: 22,
        width: 54,
        height: 54,
        borderRadius: "58% 42% 55% 45% / 45% 55% 42% 58%",
        background: `linear-gradient(135deg, ${PAPER.card} 0%, ${PAPER.panel} 100%)`,
        border: `1px solid ${PAPER.line}`,
        boxShadow: PAPER.shadow,
        color: PAPER.ink,
        fontSize: 27,
        fontFamily: FONT.sans,
        fontWeight: 300,
        cursor: "pointer",
      }}
    >
      +
    </button>
  );
}
