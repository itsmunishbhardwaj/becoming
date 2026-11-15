import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PAPER, FONT } from "../tokens.js";

export default function LogBlob({ onLog }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function handleLog() {
    setOpen(false);
    onLog();
  }

  function handleNewGoal() {
    setOpen(false);
    navigate("/create");
  }

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
        />
      )}

      <div style={{
        position: "fixed",
        right: "max(22px, calc(env(safe-area-inset-right) + 16px))",
        bottom: "max(22px, calc(env(safe-area-inset-bottom) + 16px))",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 10,
        zIndex: 100,
      }}>
        {open && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <button
              onClick={() => { setOpen(false); navigate("/onboard"); }}
              style={menuItemStyle}
            >
              coach carter breakdown
            </button>
            <button
              onClick={handleNewGoal}
              style={menuItemStyle}
            >
              new goal
            </button>
            <button
              onClick={handleLog}
              style={menuItemStyle}
            >
              log
            </button>
          </div>
        )}

        <button
          aria-label={open ? "close menu" : "add"}
          onClick={() => setOpen((v) => !v)}
          className="log-blob"
          style={{
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
            transition: "transform 200ms ease",
            transform: open ? "rotate(45deg)" : "none",
          }}
        >
          +
        </button>
      </div>
    </>
  );
}

const menuItemStyle = {
  background: PAPER.card,
  border: `1px solid ${PAPER.line}`,
  borderRadius: 20,
  padding: "8px 18px",
  fontFamily: FONT.sans,
  fontSize: 13,
  letterSpacing: "0.06em",
  color: PAPER.ink,
  cursor: "pointer",
  boxShadow: PAPER.shadow,
  whiteSpace: "nowrap",
};
