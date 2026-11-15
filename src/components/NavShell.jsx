import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { PAPER, FONT, TYPE } from "../tokens.js";

const TABS = [
  {
    label: "Year",
    short: "Year",
    path: "/",
    matches: (p) => p === "/" || p === "/year" || p.startsWith("/day/") || p.startsWith("/month/") || p.startsWith("/week/"),
  },
  {
    label: "Goals",
    short: "Goals",
    path: "/goals",
    matches: (p) => p === "/goals" || p.startsWith("/goal/") || p === "/create",
  },
  {
    label: "Journal",
    short: "Journal",
    path: "/journal",
    matches: (p) => p.startsWith("/journal"),
  },
  {
    label: "To-do",
    short: "To-do",
    path: "/todo",
    matches: (p) => p.startsWith("/todo"),
  },
  {
    label: "Insights",
    short: "Insights",
    path: "/insights",
    matches: (p) => p.startsWith("/insights"),
  },
  {
    label: "Coach Carter",
    short: "Carter",
    path: "/coach-carter",
    matches: (p) => p.startsWith("/coach-carter") || p.startsWith("/onboard"),
  },
];

export default function NavShell() {
  const { pathname } = useLocation();
  const [desktop, setDesktop] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e) => setDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (desktop) return <TopNav pathname={pathname} />;
  return <BottomNav pathname={pathname} />;
}

function TopNav({ pathname }) {
  return (
    <nav style={topBarStyle}>
      <NavLink to="/" style={logoStyle}>Becoming</NavLink>
      <div style={topTabsStyle}>
        {TABS.map((tab) => {
          const active = tab.matches(pathname);
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              style={{ ...topTabStyle, ...(active ? topTabActive : {}) }}
            >
              {tab.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

function BottomNav({ pathname }) {
  return (
    <nav style={bottomBarStyle}>
      {TABS.map((tab) => {
        const active = tab.matches(pathname);
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            style={{ ...bottomTabStyle, ...(active ? bottomTabActive : {}) }}
          >
            <span style={active ? bottomLabelActive : bottomLabel}>{tab.short}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const topBarStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  height: 48,
  background: PAPER.card,
  borderBottom: `1px solid ${PAPER.line}`,
  display: "flex",
  alignItems: "center",
  paddingLeft: "max(22px, calc(env(safe-area-inset-left) + 16px))",
  paddingRight: "max(22px, calc(env(safe-area-inset-right) + 16px))",
  gap: 32,
  zIndex: 190,
  boxSizing: "border-box",
};

const logoStyle = {
  fontFamily: FONT.serif,
  fontWeight: 600,
  fontSize: 13,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: PAPER.dim,
  textDecoration: "none",
  flexShrink: 0,
};

const topTabsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 2,
  flex: 1,
};

const topTabStyle = {
  fontFamily: FONT.sans,
  fontSize: 13,
  color: PAPER.faint,
  textDecoration: "none",
  padding: "6px 10px",
  borderRadius: 6,
  transition: "color 0.12s, background 0.12s",
  whiteSpace: "nowrap",
};

const topTabActive = {
  color: PAPER.ink,
  fontWeight: 500,
  background: PAPER.panel,
};

const bottomBarStyle = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  height: "calc(60px + env(safe-area-inset-bottom))",
  paddingBottom: "env(safe-area-inset-bottom)",
  background: PAPER.card,
  borderTop: `1px solid ${PAPER.line}`,
  display: "flex",
  alignItems: "stretch",
  zIndex: 190,
};

const bottomTabStyle = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  transition: "background 0.12s",
};

const bottomTabActive = {
  background: PAPER.panel,
};

const bottomLabel = {
  fontFamily: FONT.sans,
  fontSize: 10.5,
  letterSpacing: "0.04em",
  color: PAPER.faint,
};

const bottomLabelActive = {
  fontFamily: FONT.sans,
  fontSize: 10.5,
  letterSpacing: "0.04em",
  color: PAPER.ink,
  fontWeight: 600,
};
