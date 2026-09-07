import React from "react";
import { PAPER } from "../tokens.js";
import { daysInMonth, isoAtDay, leadOffsetFor } from "../lib/calendarMonth.js";
import DayCell from "./DayCell.jsx";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Pure month day-grid: DOW header + one DayCell per date. Used at full size
// by Month.jsx and at a smaller size by Goal.jsx's mini calendar — both give
// every cell a matching `cal-cell-<iso>` view-transition-name, so navigating
// between them inside document.startViewTransition morphs each cell natively.
// See docs/superpowers/specs/2026-09-07-goal-calendar-genie-design.md.
export default function MonthGrid({
  year,
  monthIdx,
  goals,
  adherenceMaps,
  focus,
  pen,
  onDayTap,
  onOpenDay,
  todayISO,
  blobScale = 1,
  projectedDates,
  cellMaxWidth = "clamp(44px, 8vw, 64px)",
  gap = "clamp(6px, 1vw, 14px)",
  showWeekPills = false,
  onWeekPillClick,
  transitionClassName = "",
  gridRef,
}) {
  const dayCount = daysInMonth(year, monthIdx);
  const leadOffset = leadOffsetFor(year, monthIdx);
  const monthName = MONTH_NAMES[monthIdx];
  const cols = showWeekPills ? "repeat(7, 1fr) 28px" : "repeat(7, 1fr)";

  const dowRowStyle = {
    display: "grid",
    gridTemplateColumns: cols,
    gap,
    justifyItems: "center",
    marginBottom: 6,
  };
  const dowCellStyle = {
    fontFamily: "'Instrument Sans', 'Inter', system-ui, sans-serif",
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.08em",
    color: PAPER.ink,
    opacity: 0.32,
  };
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: cols,
    gap,
    justifyItems: "center",
    alignItems: "center",
  };
  const cellWrapStyle = { width: "100%", maxWidth: cellMaxWidth };
  const weekPillStyle = {
    width: 22, height: 22, borderRadius: 999,
    border: `1px solid ${PAPER.line}`, background: "transparent",
    color: PAPER.dim, fontSize: 12, cursor: "pointer",
    display: "grid", placeItems: "center",
    padding: 0, flexShrink: 0,
    lineHeight: 1,
  };

  return (
    <div>
      <div style={dowRowStyle}>
        {DAY_LETTERS.map((l, i) => (
          <span key={i} style={dowCellStyle}>{l}</span>
        ))}
        {showWeekPills && <span aria-hidden="true" />}
      </div>
      <div className={transitionClassName} style={gridStyle} ref={gridRef}>
        {Array.from({ length: Math.ceil((leadOffset + dayCount) / 7) }, (_, r) => {
          const dayNum = r * 7 - leadOffset + 1;
          const d = new Date(year, monthIdx, dayNum);
          const sundayISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          return (
            <React.Fragment key={r}>
              {Array.from({ length: 7 }, (_, col) => {
                const pos = r * 7 + col;
                const i = pos - leadOffset;
                if (i < 0 || i >= dayCount) return <span key={`e-${r}-${col}`} aria-hidden="true" />;
                const iso = isoAtDay(year, monthIdx, i);
                return (
                  <div key={iso} style={cellWrapStyle}>
                    <DayCell
                      monthIdx={monthIdx}
                      monthName={monthName}
                      dayIdx={i}
                      isoDate={iso}
                      goals={goals ?? []}
                      adherenceMaps={adherenceMaps}
                      focus={focus}
                      pen={pen}
                      onToggle={() => onDayTap(iso)}
                      onOpen={() => onOpenDay?.(iso)}
                      isToday={iso === todayISO}
                      showHalo={false}
                      blobScale={blobScale}
                      projectedDates={projectedDates}
                      viewTransitionId={`cal-cell-${iso}`}
                    />
                  </div>
                );
              })}
              {showWeekPills && (
                <button
                  type="button"
                  onClick={() => onWeekPillClick?.(sundayISO)}
                  aria-label={`Week of ${sundayISO}`}
                  style={weekPillStyle}
                >
                  ›
                </button>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
