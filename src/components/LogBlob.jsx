import { PAPER, FONT, RADIUS } from "../tokens.js";

export default function LogBlob({ onClick }) {
  return (
    <>
      <style>{`
        @keyframes lb-breathe {
          0%,100% { border-radius: 58% 42% 55% 45% / 45% 55% 42% 58%; }
          50%     { border-radius: 45% 55% 42% 58% / 58% 42% 55% 45%; }
        }
        .log-blob { animation: lb-breathe 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .log-blob { animation: none; } }
      `}</style>
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
          borderRadius: RADIUS.blob,
          background: `linear-gradient(135deg, ${PAPER.card} 0%, ${PAPER.panel} 100%)`,
          border: `1px solid ${PAPER.line}`,
          boxShadow: "0 6px 20px rgba(85,80,92,0.10)",
          color: PAPER.ink,
          fontSize: 27,
          fontFamily: FONT.sans,
          fontWeight: 300,
          cursor: "pointer",
        }}
      >
        +
      </button>
    </>
  );
}
