import { PAPER, FONT, TYPE } from "../tokens.js";

export default function CoachCarter() {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={h1Style}>Coach Carter</h1>
        <p style={bodyStyle}>
          Goal planning, the Coach Carter breakdown pipeline, and contracts will be built here.
        </p>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: PAPER.bg,
  color: PAPER.ink,
  fontFamily: FONT.sans,
  padding: "clamp(28px, 4vw, 56px) clamp(20px, 4vw, 64px) 120px",
};

const containerStyle = {
  maxWidth: 680,
  margin: "0 auto",
};

const h1Style = {
  fontFamily: FONT.serif,
  fontWeight: 300,
  fontSize: "clamp(36px, 6vw, 56px)",
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
  color: PAPER.ink,
  margin: "0 0 20px",
};

const bodyStyle = {
  fontFamily: FONT.serif,
  fontStyle: "italic",
  fontSize: TYPE.ambition,
  color: PAPER.dim,
  lineHeight: 1.6,
};
