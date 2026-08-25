import { CATS, PAPER } from "../tokens.js";

export default function MomentumBar({ cat, momentum, dormant, color: colorProp }) {
  const color = colorProp || CATS[cat]?.color;
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
          transition: "width 400ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      />
    </div>
  );
}
