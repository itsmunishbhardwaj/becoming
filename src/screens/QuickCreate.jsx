import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PAPER, FONT, TYPE, RADIUS, CATS } from "../tokens.js";
import { saveGoal } from "../data/store.js";
import { getType } from "../data/goalTypes/index.js";
import { todayLocalISO } from "../lib/date.js";

function slugify(s) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "goal";
}

function endOfYearISO() {
  return `${new Date().getFullYear()}-12-31`;
}

export default function QuickCreate() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [cat, setCat] = useState("health");
  const [type, setType] = useState("wake");
  const [baselineTime, setBaselineTime] = useState("08:30");
  const [targetTime, setTargetTime] = useState("06:30");
  const [baselineDays, setBaselineDays] = useState(1);
  const [targetDays, setTargetDays] = useState(7);
  const [endDate, setEndDate] = useState(endOfYearISO());
  const [ambition, setAmbition] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function onCreate(e) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Give the goal a name.");
    if (!endDate) return setError("Pick an end date.");

    const baseline = type === "wake" ? baselineTime : { intervalDays: Number(baselineDays) };
    const target = type === "wake" ? targetTime : { intervalDays: Number(targetDays) };
    const startDate = todayLocalISO();

    let rounds;
    try {
      rounds = getType(type).buildRounds(baseline, target, startDate, endDate);
    } catch (err) {
      return setError(`Could not build rounds: ${err.message}`);
    }

    const goal = {
      id: slugify(name),
      name: name.trim(),
      cat,
      type,
      state: "active",
      baseline,
      target,
      endDate,
      currentRound: 1,
      createdAt: startDate,
      ambition: ambition.trim() || name.trim(),
      rounds,
      howWeGetThere: "",
      indicators: { right: [], wrong: [], stall: [] },
    };

    setSaving(true);
    try {
      await saveGoal(goal);
      nav("/");
    } catch (err) {
      setSaving(false);
      setError(`Could not save: ${err.message}`);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "36px 26px 60px" }}>
        <Link to="/" style={backLink}>← Life</Link>

        <header style={{ marginTop: 12, marginBottom: 24 }}>
          <div style={kickerStyle}>QUICK CREATE</div>
          <h1 style={h1Style}>Name it. Track it.</h1>
          <p style={{ color: PAPER.dim, fontSize: 13.5, margin: "8px 0 0", lineHeight: 1.5 }}>
            Skip the Balboa breakdown. For when you already know what you're doing.
          </p>
        </header>

        <form onSubmit={onCreate} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Field label="Goal name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Wake at 6:00 AM"
              style={inputStyle}
              autoFocus
            />
          </Field>

          <Field label="Category">
            <select value={cat} onChange={(e) => setCat(e.target.value)} style={inputStyle}>
              {Object.entries(CATS).map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Type">
            <div style={{ display: "flex", gap: 8 }}>
              <TypePill selected={type === "wake"} onClick={() => setType("wake")}>Wake time</TypePill>
              <TypePill selected={type === "cadence"} onClick={() => setType("cadence")}>Cadence</TypePill>
            </div>
          </Field>

          {type === "wake" ? (
            <div style={{ display: "flex", gap: 12 }}>
              <Field label="Wake now" style={{ flex: 1 }}>
                <input type="time" value={baselineTime} onChange={(e) => setBaselineTime(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Wake goal" style={{ flex: 1 }}>
                <input type="time" value={targetTime} onChange={(e) => setTargetTime(e.target.value)} style={inputStyle} />
              </Field>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 12 }}>
              <Field label="Every N days now" style={{ flex: 1 }}>
                <input type="number" min={1} value={baselineDays} onChange={(e) => setBaselineDays(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Every N days goal" style={{ flex: 1 }}>
                <input type="number" min={1} value={targetDays} onChange={(e) => setTargetDays(e.target.value)} style={inputStyle} />
              </Field>
            </div>
          )}

          <Field label="End date">
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Ambition (optional)">
            <textarea
              value={ambition}
              onChange={(e) => setAmbition(e.target.value)}
              placeholder="In your own words — why this matters"
              rows={3}
              style={{ ...inputStyle, resize: "vertical", fontFamily: FONT.serif, fontStyle: "italic" }}
            />
          </Field>

          {error && <div style={{ color: PAPER.whisper, fontSize: 13 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center" }}>
            <button type="submit" disabled={saving} style={primaryPill}>
              {saving ? "Saving…" : "Create goal"}
            </button>
            <Link to="/onboard" style={secondaryLink}>Guided breakdown instead →</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </label>
  );
}

function TypePill({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 18px",
        borderRadius: RADIUS.pill,
        border: `1px solid ${selected ? PAPER.ink : PAPER.line}`,
        background: selected ? PAPER.ink : PAPER.card,
        color: selected ? PAPER.bg : PAPER.ink,
        fontSize: 13,
        fontFamily: FONT.sans,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: PAPER.bg,
  color: PAPER.ink,
  fontFamily: FONT.sans,
};
const backLink = { color: PAPER.dim, fontSize: 13, textDecoration: "none" };
const kickerStyle = {
  fontSize: 11.5, letterSpacing: "1.8px", textTransform: "uppercase",
  color: PAPER.faint, fontWeight: 500,
};
const h1Style = {
  fontFamily: FONT.serif, fontWeight: 400, fontSize: TYPE.h1,
  lineHeight: 1.25, margin: "8px 0 0", color: PAPER.ink,
};
const fieldLabelStyle = {
  fontSize: 11, letterSpacing: "1.4px", textTransform: "uppercase",
  color: PAPER.faint, fontWeight: 500,
};
const inputStyle = {
  padding: "10px 14px",
  borderRadius: RADIUS.r1,
  border: `1px solid ${PAPER.line}`,
  background: PAPER.card,
  fontSize: 14,
  fontFamily: FONT.sans,
  color: PAPER.ink,
  width: "100%",
  boxSizing: "border-box",
};
const primaryPill = {
  padding: "11px 22px",
  borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.ink}`,
  background: PAPER.ink,
  color: PAPER.bg,
  fontSize: 13.5,
  fontFamily: FONT.sans,
  cursor: "pointer",
};
const secondaryLink = {
  color: PAPER.dim,
  fontSize: 12.5,
  textDecoration: "none",
};
