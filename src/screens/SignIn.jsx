import { useState } from "react";
import { PAPER, FONT } from "../tokens.js";
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from "../lib/auth.js";

export default function SignIn() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [confirm, setConfirm] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    setErr(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setErr("Sign-in failed. Try again.");
      setLoading(false);
    }
  }

  async function handleEmail(e) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setErr(null);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password);
        setConfirm(true);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setErr(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    background: PAPER.card,
    border: `1px solid ${PAPER.line}`,
    borderRadius: 10,
    fontFamily: FONT.sans,
    fontSize: 14,
    color: PAPER.ink,
    outline: "none",
    boxSizing: "border-box",
  };

  const btnStyle = {
    width: "100%",
    padding: "11px 0",
    background: PAPER.ink,
    border: "none",
    borderRadius: 10,
    fontFamily: FONT.sans,
    fontSize: 14,
    color: PAPER.bg,
    cursor: loading ? "default" : "pointer",
    opacity: loading ? 0.5 : 1,
    transition: "opacity 120ms ease, transform 120ms ease",
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: PAPER.bg,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 24px",
    }}>
      <div className="grain" aria-hidden="true" />
      <div className="vellum-mist" aria-hidden="true" />

      {/* Wordmark */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{
          fontFamily: FONT.serif,
          fontWeight: 300,
          fontSize: 48,
          color: PAPER.ink,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}>
          Becoming
        </div>
        <div style={{
          fontFamily: FONT.sans,
          fontSize: 13,
          color: PAPER.dim,
          marginTop: 10,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>
          Your life, in motion
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 12 }}>

        {confirm ? (
          <p style={{ fontFamily: FONT.sans, fontSize: 14, color: PAPER.dim, textAlign: "center", margin: 0 }}>
            Check your email to confirm your account, then sign in.
          </p>
        ) : (
          <>
            {/* Email form */}
            <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={inputStyle}
                autoComplete="email"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={inputStyle}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
              <button type="submit" disabled={loading} style={btnStyle}>
                {loading ? "…" : mode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>

            {/* Toggle sign in / sign up */}
            <p style={{ fontFamily: FONT.sans, fontSize: 13, color: PAPER.dim, textAlign: "center", margin: 0 }}>
              {mode === "signin" ? "No account? " : "Already have one? "}
              <button
                onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErr(null); }}
                style={{ background: "none", border: "none", fontFamily: FONT.sans, fontSize: 13, color: PAPER.ink, cursor: "pointer", padding: 0, textDecoration: "underline" }}
              >
                {mode === "signin" ? "Create one" : "Sign in"}
              </button>
            </p>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: PAPER.line }} />
              <span style={{ fontFamily: FONT.sans, fontSize: 12, color: PAPER.faint }}>or</span>
              <div style={{ flex: 1, height: 1, background: PAPER.line }} />
            </div>

            {/* Google */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "11px 0",
                background: PAPER.card,
                border: `1px solid ${PAPER.line}`,
                borderRadius: 10,
                fontFamily: FONT.sans,
                fontSize: 14,
                color: PAPER.ink,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.5 : 1,
                width: "100%",
                transition: "opacity 120ms ease, transform 120ms ease",
              }}
              onMouseDown={e => { e.currentTarget.style.transform = "scale(0.97)"; }}
              onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </>
        )}

        {err && (
          <p style={{ fontFamily: FONT.sans, fontSize: 13, color: "#C0392B", textAlign: "center", margin: 0 }}>
            {err}
          </p>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
