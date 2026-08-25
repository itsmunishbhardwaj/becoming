import { CATS, RADIUS } from "../tokens.js";

// Breathing momentum orb. Size + glow = momentum. Dormant = still + faded.
export default function Orb({ cat, momentum, dormant, color: colorProp, size: sizeProp, viewTransitionName }) {
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
          background: `radial-gradient(circle at 35% 30%, ${color}, ${color}99 80%)`,
          boxShadow: "none",
          opacity: dormant ? 0.45 : 1,
          viewTransitionName: viewTransitionName || undefined,
        }}
      />
    </div>
  );
}
