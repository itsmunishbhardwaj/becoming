import { CATS, RADIUS } from "../tokens.js";

// Breathing momentum orb. Size + glow = momentum. Dormant = still + faded.
export default function Orb({ cat, momentum, dormant, color: colorProp, size: sizeProp }) {
  const color = colorProp || CATS[cat]?.color;
  const box = sizeProp || 60;
  const size = box * 0.88;
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
          borderRadius: RADIUS.blob,
          background: `radial-gradient(circle at 35% 30%, ${color}, ${color}66 70%)`,
          boxShadow: dormant ? "none" : `0 0 ${10 + momentum * 22}px ${color}55`,
          opacity: dormant ? 0.4 : 0.65 + momentum * 0.35,
        }}
      />
    </div>
  );
}
