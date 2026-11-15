import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PAPER, FONT, RADIUS } from "../tokens.js";
import { getSession, signOut, onAuthStateChange } from "../lib/auth.js";

// Fixed top-right profile affordance. Visible on both desktop (sits inside
// the 48px top nav) and mobile (floats over screen content). Shows the
// user's avatar or initial; tapping opens a small panel with their name,
// email, and a sign-out button. Outside click / Escape close the panel.

export default function ProfileMenu() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    getSession().then((s) => setUser(s?.user ?? null));
    const { data: { subscription } } = onAuthStateChange((s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const meta = user.user_metadata || {};
  const isAnonymous = !!user.is_anonymous;
  const displayName = meta.full_name || meta.name || (isAnonymous ? "Guest" : user.email) || "Signed in";
  const email = user.email || "";
  const avatar = meta.avatar_url || meta.picture;
  const initial = (displayName[0] || "?").toUpperCase();

  async function handleSignOut() {
    setSigningOut(true);
    try { await signOut(); } catch (e) { /* no-op */ }
    // onAuthStateChange flips user to null → App re-renders SignIn.
    setOpen(false);
    setSigningOut(false);
  }

  return (
    <div ref={wrapRef} style={wrapStyle}>
      <button
        type="button"
        className="press"
        aria-label={`Profile — ${displayName}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={avatarBtn}
      >
        {avatar ? (
          <img src={avatar} alt="" style={avatarImg} referrerPolicy="no-referrer" />
        ) : (
          <span style={initialText}>{initial}</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            style={panelStyle}
            role="menu"
          >
            <div style={headerBlock}>
              <div style={nameText}>{displayName}</div>
              {email && email !== displayName && (
                <div style={emailText}>{email}</div>
              )}
              {isAnonymous && (
                <div style={{ ...emailText, fontStyle: "italic", color: PAPER.faint }}>
                  Anonymous session — data stays local to this device.
                </div>
              )}
            </div>
            <button
              type="button"
              className="press"
              onClick={handleSignOut}
              disabled={signingOut}
              style={signOutBtn}
              role="menuitem"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const wrapStyle = {
  position: "fixed",
  top: 8,
  right: "max(16px, calc(env(safe-area-inset-right) + 10px))",
  zIndex: 200,
};

const avatarBtn = {
  width: 32,
  height: 32,
  borderRadius: 999,
  padding: 0,
  background: PAPER.panel,
  border: `1px solid ${PAPER.line}`,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  color: PAPER.ink,
  fontFamily: FONT.sans,
};

const avatarImg = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const initialText = {
  fontFamily: FONT.serif,
  fontSize: 14,
  fontWeight: 500,
  color: PAPER.ink,
  letterSpacing: 0,
};

const panelStyle = {
  position: "absolute",
  top: 40,
  right: 0,
  minWidth: 240,
  background: PAPER.card,
  border: `1px solid ${PAPER.line}`,
  borderRadius: RADIUS.r2,
  boxShadow: "0 8px 28px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.05)",
  overflow: "hidden",
  transformOrigin: "top right",
};

const headerBlock = {
  padding: "14px 16px",
  borderBottom: `1px solid ${PAPER.line}`,
};

const nameText = {
  fontFamily: FONT.serif,
  fontSize: 15,
  fontWeight: 500,
  color: PAPER.ink,
  lineHeight: 1.3,
};

const emailText = {
  fontFamily: FONT.sans,
  fontSize: 12,
  color: PAPER.dim,
  marginTop: 3,
  wordBreak: "break-all",
  lineHeight: 1.4,
};

const signOutBtn = {
  width: "100%",
  textAlign: "left",
  padding: "12px 16px",
  background: "transparent",
  border: "none",
  color: PAPER.ink,
  fontFamily: FONT.sans,
  fontSize: 13.5,
  cursor: "pointer",
  display: "block",
};
