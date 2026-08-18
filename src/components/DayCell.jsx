import { useMemo } from "react";
import { PAPER } from "../tokens.js";
import { goalColor } from "../lib/goalColor.js";
import Blob from "./Blob.jsx";

function markStyleFor(status, catColor) {
  if (status === "none" || status === "clean") return null;
  const base = { width: 5.6, height: 4.6, borderRadius: 999, display: "inline-block" };
  const op = status === "soft" ? 0.55 : 0.85;
  return { ...base, background: catColor, opacity: op };
}

// Renders one day cell in a calendar grid. Reused across Year / Month / Week.
//
// Halo: when isToday && showHalo, a low-opacity white circle is rendered as
// the first SVG child so blobs (opacity 0.78–0.85) stay legible on top.
//
// Refs: passing `cellRef` (from a parent's `Record<iso, HTMLElement>` map)
// enables scroll-into-view for the Today button and hit-testing for pinch.
export default function DayCell({
  monthIdx,
  monthName,
  dayIdx,
  isoDate,
  goals,
  adherenceMaps,
  focus,
  pen,
  onToggle,
  onOpen,
  setTip,
  isToday = false,
  showHalo = false,
  blobScale = 1,
  cellRef,
  hideDayNumber = false,
}) {
  const size = 26;
  const c = size / 2;

  const marks = useMemo(() => {
    const visible = pen ? goals.filter((g) => g.id === pen.id) : goals;
    return visible
      .map((g) => {
        const map = adherenceMaps[g.id] || {};
        const status = map[isoDate] || "none";
        const style = markStyleFor(status, goalColor(g));
        return { g, status, style };
      })
      .filter(({ style }) => style !== null);
  }, [goals, adherenceMaps, isoDate, pen]);

  const hasContent = marks.length > 0;
  const showText = !hasContent && !hideDayNumber;

  const tipData = { month: monthName, day: dayIdx + 1, iso: isoDate, marks };

  const haloOn = isToday && showHalo;

  return (
    <svg
      ref={cellRef}
      viewBox={`0 0 ${size} ${size}`}
      data-iso={isoDate}
      onClick={onToggle}
      onDoubleClick={(e) => { e.stopPropagation(); onOpen(); }}
      onMouseEnter={() => setTip?.(tipData)}
      onMouseLeave={() => setTip?.(null)}
      style={{
        display: "block", width: "100%", height: "auto",
        cursor: "pointer",
        overflow: (haloOn || blobScale > 1) ? "visible" : undefined,
      }}
    >
      {haloOn && (
        <>
          <defs>
            <radialGradient id={`halo-${isoDate}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor={PAPER.ink} stopOpacity="0.55" />
              <stop offset="45%"  stopColor={PAPER.ink} stopOpacity="0.32" />
              <stop offset="80%"  stopColor={PAPER.ink} stopOpacity="0.10" />
              <stop offset="100%" stopColor={PAPER.ink} stopOpacity="0" />
            </radialGradient>
            <filter id={`halo-blur-${isoDate}`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
          </defs>
          <circle
            cx={c} cy={c} r={24}
            fill={`url(#halo-${isoDate})`}
            filter={`url(#halo-blur-${isoDate})`}
          />
        </>
      )}

      {showText && (
        <text
          x={c} y={16} textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="9" fontWeight="400"
          fill={PAPER.ink} opacity="0.4"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {dayIdx + 1}
        </text>
      )}

      {marks.map(({ g, status }, i) => {
        const ang = (i / Math.max(marks.length, 1)) * Math.PI * 2 + i;
        const off = marks.length > 1 ? 2 : 0;
        const faded = focus && g.id !== focus.id;
        const op = status === "soft" ? 0.55 : faded ? 0.15 : 0.85;
        const color = goalColor(g);
        return (
          <g key={g.id} opacity={faded && status !== "off" ? 0.15 : 1}>
            <Blob
              cx={c + Math.cos(ang) * off}
              cy={c + Math.sin(ang) * off}
              color={color}
              seed={(dayIdx + 1) + i * 31}
              big={marks.length === 1}
              opacity={op}
              scale={blobScale}
            />
          </g>
        );
      })}
    </svg>
  );
}
