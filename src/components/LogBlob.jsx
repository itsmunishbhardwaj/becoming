import { PAPER, FONT } from "../tokens.js";

export default function LogBlob({ onClick }) {
  return (
    <button
      aria-label="log your day"
      onClick={onClick}
      className="log-blob"
      style={{
        position: "fixed",
        right: "max(22px, calc(env(safe-area-inset-right) + 16px))",
        bottom: "max(22px, calc(env(safe-area-inset-bottom) + 16px))",
        width: 54,
        height: 54,
        borderRadius: "67% 33% 52% 48% / 42% 58% 35% 65%",
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
