import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PAPER, FONT, TYPE, RADIUS, CATS } from "../tokens.js";
import { saveGoal, listGoals } from "../data/store.js";
import { getType } from "../data/goalTypes/index.js";
import { todayLocalISO } from "../lib/date.js";
import { PALETTE, autoPickColor } from "../lib/goalColor.js";

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
  const [endDate, setEndDate] = useState(endOfYearISO());
  const [ambition, setAmbition] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [colorMode, setColorMode] = useState("auto"); // "auto" | hex string
  const [existingGoals, setExistingGoals] = useState([]);

  useEffect(() => {
    listGoals().then(setExistingGoals).catch(() => setExistingGoals([]));
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Give the goal a name.");
    if (!endDate) return setError("Pick an end date.");

    const startDate = todayLocalISO();
    const rounds = getType("simple").buildRounds(null, null, startDate, endDate);
    const color = colorMode === "auto" ? autoPickColor(existingGoals, cat) : colorMode;

    const goal = {
      id: slugify(name),
      name: name.trim(),
      cat,
      color,
      type: "simple",
      state: "active",
      baseline: null,
      target: null,
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
            Every day is a tap. That's it.
          </p>
        </header>

        <form onSubmit={onCreate} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Field label="Goal name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Read every day"
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

          <Field label="Color">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setColorMode("auto")}
                aria-pressed={colorMode === "auto"}
                style={autoChipStyle(colorMode === "auto")}
                title="Pick a color automatically"
              >
                Auto
              </button>
              {PALETTE.map((p) => {
                const selected = colorMode === p.color;
                return (
                  <button
                    key={p.color}
                    type="button"
                    onClick={() => setColorMode(p.color)}
                    aria-label={p.name}
                    aria-pressed={selected}
                    title={p.name}
                    style={swatchStyle(p.color, selected)}
                  />
                );
              })}
            </div>
          </Field>

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
function swatchStyle(color, selected) {
  return {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: `radial-gradient(circle at 35% 30%, ${color}, ${color}99 70%)`,
    boxShadow: selected
      ? `0 0 0 2px ${PAPER.ink}, 0 0 12px ${color}80`
      : `0 0 10px ${color}55`,
    border: "none",
    cursor: "pointer",
    padding: 0,
  };
}
function autoChipStyle(selected) {
  return {
    padding: "6px 12px",
    borderRadius: RADIUS.pill,
    border: `1px solid ${selected ? PAPER.ink : PAPER.line}`,
    background: selected ? PAPER.ink : PAPER.card,
    color: selected ? PAPER.bg : PAPER.ink,
    fontSize: 12.5,
    fontFamily: FONT.sans,
    cursor: "pointer",
  };
}
