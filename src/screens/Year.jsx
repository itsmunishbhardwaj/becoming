import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { CATS, PAPER, FONT } from "../tokens.js";
import { MONTHS, buildYear, isMonthDormant } from "../data/mockLife.js";

function DayCell({ circles, setTip, tipData }) {
  const size = 15;
  const c = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      onMouseEnter={() => circles.length && setTip(tipData)}
      onMouseLeave={() => setTip(null)}
      style={{ display: "block", cursor: circles.length ? "pointer" : "default" }}
    >
      {circles.length === 0 && <circle cx={c} cy={c} r={0.9} fill={PAPER.faint} opacity={0.5} />}
      {circles.map((circ, i) => {
        const r = 2.2 + circ.effort * 4.2;
        const ang = (i / Math.max(circles.length, 1)) * Math.PI * 2 + i;
        const off = circles.length > 1 ? 1.8 : 0;
        return (
          <circle
            key={i}
            cx={c + Math.cos(ang) * off}
            cy={c + Math.sin(ang) * off}
            r={r}
            fill={CATS[circ.cat].color}
            opacity={0.62}
          />
        );
      })}
    </svg>
  );
}

function MonthBlock({ name, days, monthIdx, setTip }) {
  const dormant = isMonthDormant(days, monthIdx);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: dormant ? PAPER.faint : PAPER.dim,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        {name}
        {dormant && <span style={{ fontSize: 10 }}>🌙</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {days.map((circles, i) => (
          <DayCell
            key={i}
            circles={circles}
            setTip={setTip}
            tipData={{ month: name, day: i + 1, circles }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Year() {
  const year = useMemo(() => buildYear(), []);
  const [tip, setTip] = useState(null);

  const totals = useMemo(() => {
    const t = {};
    Object.keys(CATS).forEach((k) => (t[k] = 0));
    year.forEach((mo) => mo.forEach((day) => day.forEach((c) => (t[c.cat] += c.effort))));
    return t;
  }, [year]);
  const maxTotal = Math.max(...Object.values(totals));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: PAPER.bg,
        color: PAPER.ink,
        fontFamily: FONT.sans,
        padding: "0 24px 60px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <header style={{ padding: "48px 0 8px" }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: PAPER.dim,
              marginBottom: 8,
            }}
          >
            2026 · a year in progress
          </div>
          <h1 style={{ fontFamily: FONT.serif, fontWeight: 500, fontSize: 30, margin: 0, letterSpacing: "-0.01em" }}>
            Where your life went
          </h1>
        </header>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", margin: "20px 0 28px" }}>
          {Object.entries(CATS).map(([k, v]) => {
            const share = totals[k] / maxTotal;
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: PAPER.ink }}>
                <span
                  style={{
                    width: 10 + share * 8,
                    height: 10 + share * 8,
                    borderRadius: "50%",
                    background: v.color,
                    opacity: 0.75,
                  }}
                />
                {v.name}
              </div>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "26px 22px" }}>
          {MONTHS.map((name, i) => (
            <MonthBlock key={name} name={name} days={year[i]} monthIdx={i} setTip={setTip} />
          ))}
        </div>

        <div
          style={{
            marginTop: 40,
            padding: "18px 20px",
            background: PAPER.panel,
            border: `1px solid ${PAPER.panelBorder}`,
            borderRadius: 16,
            fontSize: 14,
            lineHeight: 1.6,
            color: PAPER.ink,
          }}
        >
          <span style={{ color: PAPER.dim }}>The shape of your year: </span>
          career runs steady throughout, peaking in spring.{" "}
          <span style={{ color: "#7FA0D8" }}>AI</span> burned bright Jan–Mar, then went quiet 🌙 — a pause,
          not a collapse. <span style={{ color: "#B79FD8" }}>Reading</span> faded after May. Health held its
          rhythm all year.
        </div>

        {tip && tip.circles.length > 0 && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#FFFFFF",
              border: "1px solid #ECE9F2",
              boxShadow: "0 8px 30px rgba(74,70,88,0.12)",
              borderRadius: 14,
              padding: "12px 18px",
              display: "flex",
              gap: 14,
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <span style={{ color: PAPER.dim, fontVariantNumeric: "tabular-nums" }}>
              {tip.month} {tip.day}
            </span>
            {tip.circles.map((c, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 8 + c.effort * 8,
                    height: 8 + c.effort * 8,
                    borderRadius: "50%",
                    background: CATS[c.cat].color,
                  }}
                />
                {CATS[c.cat].name}
              </span>
            ))}
          </div>
        )}

        <footer style={{ marginTop: 34, textAlign: "center", fontSize: 13 }}>
          <Link to="/" style={{ color: PAPER.faint, textDecoration: "none" }}>
            ← back to Life
          </Link>
        </footer>
      </div>
    </div>
  );
}
