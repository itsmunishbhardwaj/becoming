import { CATS, PAPER } from "../tokens.js";

export default function MomentumBar({ cat, momentum, dormant }) {
  const color = CATS[cat].color;
  return (
    <div
      style={{
        height: 4,
        borderRadius: 2,
        background: PAPER.trough,
        overflow: "hidden",
        marginTop: 14,
      }}
    >
      <div
        style={{
          width: `${momentum * 100}%`,
          height: "100%",
          borderRadius: 2,
          background: dormant
            ? `${color}44`
            : `linear-gradient(90deg, ${color}99, ${color})`,
          transition: "width 600ms ease",
        }}
      />
    </div>
  );
}
