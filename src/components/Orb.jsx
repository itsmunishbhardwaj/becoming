import { CATS } from "../tokens.js";

// Breathing momentum orb. Size + glow = momentum. Dormant = still + faded.
export default function Orb({ cat, momentum, dormant, color: colorProp, size: sizeProp }) {
  const color = colorProp || CATS[cat]?.color;
  const box = sizeProp || 60;
  const size = box * 0.85;
  return (
    <div
      style={{
        width: box,
        height: box,
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
          boxShadow: dormant ? "none" : `0 0 ${12 + momentum * 26}px ${color}66`,
          opacity: dormant ? 0.4 : 0.6 + momentum * 0.4,
        }}
      />
    </div>
  );
}
