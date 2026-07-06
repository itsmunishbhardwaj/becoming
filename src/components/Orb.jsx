import { CATS } from "../tokens.js";

// Breathing momentum orb. Size + glow = momentum. Dormant = still + faded.
export default function Orb({ cat, momentum, dormant }) {
  const color = CATS[cat].color;
  const size = 14 + momentum * 26;
  return (
    <div
      style={{
        width: 44,
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div
        className={dormant ? "" : "orb-breathe"}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, ${color}, ${color}66 70%)`,
          boxShadow: dormant ? "none" : `0 0 ${10 + momentum * 22}px ${color}66`,
          opacity: dormant ? 0.4 : 0.6 + momentum * 0.4,
        }}
      />
    </div>
  );
}
