import { useEffect, useState } from "react";
import { PAPER, FONT, RADIUS } from "../tokens.js";
import { parseLogSmart } from "../lib/logParserLLM.js";
import { chat, isConfigured } from "../lib/llm.js";
import { listGoals, appendLog } from "../data/store.js";
import { todayLocalISO } from "../lib/date.js";
import { goalColor } from "../lib/goalColor.js";

function routeEvent(evt, goals) {
  if (evt.verb === "wake") {
    return goals.find((g) => typeof g.baseline === "string" && (g.state === "active" || g.state === "drift")) || null;
  }
  if (evt.verb === "session") {
    return goals.find((g) => g.baseline?.intervalDays != null && (g.state === "active" || g.state === "drift")) || null;
  }
  return null;
}

function payloadFor(evt) {
  if (evt.verb === "wake" && evt.time) return evt.time;
  if (evt.verb === "session") {
    if (evt.time && evt.durationMin != null) return `${evt.time} · ${evt.durationMin}min`;
    if (evt.durationMin != null) return `${evt.durationMin}min`;
  }
  return evt.raw;
}

export default function LogSheet({ open, onClose, onSaved }) {
  const [text, setText] = useState("");
  const [goals, setGoals] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 260);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listGoals().then(setGoals).catch(() => setGoals([]));
    setText("");
    setError(null);
  }, [open]);

  const [parsed, setParsed] = useState([]);
  useEffect(() => {
    const handle = setTimeout(() => {
      parseLogSmart({ text, goals, llmChat: chat, isConfigured })
        .then(setParsed)
        .catch(() => setParsed([]));
    }, 350);
    return () => clearTimeout(handle);
  }, [text, goals]);

  const rows = parsed.map((evt) => {
    const goal = routeEvent(evt, goals);
    return { evt, goal };
  });

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const date = todayLocalISO();
      for (const { evt, goal } of rows) {
        if (!goal) continue;
        await appendLog(date, {
          verb: evt.verb,
          time: evt.time,
          durationMin: evt.durationMin,
          payload: payloadFor(evt),
          goalId: goal.id,
        });
      }
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError("Couldn't save. Try again in a moment.");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  const closingAttr = closing || undefined;

  return (
    <div
      className="ls-scrim"
      data-closing={closingAttr}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: PAPER.scrim, zIndex: 40,
      }}
    >
      <div
        className="ls-sheet"
        data-closing={closingAttr}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          background: PAPER.bg, color: PAPER.ink,
          borderTopLeftRadius: 26, borderTopRightRadius: 22,
          padding: "22px 24px 30px",
          boxShadow: PAPER.sheetShadow,
          fontFamily: FONT.sans,
          maxHeight: "85vh", overflowY: "auto",
        }}
      >
        <div style={{
          width: 38, height: 4, borderRadius: 999, background: PAPER.line,
          margin: "0 auto 14px",
        }} />
        <div style={{
          fontSize: 11, letterSpacing: "1.6px", textTransform: "uppercase",
          color: PAPER.faint, fontWeight: 500, marginBottom: 10,
        }}>
          LOG YOUR DAY — JUST WRITE
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="woke 07:12 · session 22:00 · 15min"
          rows={4}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "13px 15px", borderRadius: RADIUS.r2,
            border: `1px solid ${PAPER.line}`, background: PAPER.card,
            fontSize: 14.5, fontFamily: FONT.sans, color: PAPER.ink,
            lineHeight: 1.55, resize: "vertical",
          }}
        />

        {rows.length > 0 && (
          <>
            <div style={{ marginTop: 14, fontSize: 12, color: PAPER.dim }}>
              Understood — no forms, no tags:
            </div>
            <div className="ls-rows" style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {rows.map(({ evt, goal }, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px",
                  borderRadius: i % 2 === 0 ? RADIUS.r1 : RADIUS.r2,
                  background: PAPER.card, border: `1px solid ${PAPER.line}`,
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: 999,
                    background: goalColor(goal),
                    display: "inline-block", flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 13.5, color: PAPER.ink, flex: 1 }}>
                    {evt.raw}
                  </span>
                  <span style={{ fontSize: 11.5, color: goal ? PAPER.dim : PAPER.whisper }}>
                    {goal ? `→ ${goal.id}` : "no matching goal — skipped"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {error && <div style={{ marginTop: 10, color: PAPER.whisper, fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button
            className="ls-btn"
            onClick={onClose}
            style={{
              padding: "9px 16px", borderRadius: RADIUS.pill,
              border: `1px solid ${PAPER.line}`, background: "transparent",
              color: PAPER.dim, fontSize: 13, fontFamily: FONT.sans, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            className="ls-btn"
            onClick={save}
            disabled={saving || rows.length === 0}
            style={{
              padding: "9px 16px", borderRadius: RADIUS.pill,
              border: `1px solid ${PAPER.affirmLine}`,
              background: PAPER.affirm, color: PAPER.affirmInk,
              fontSize: 13, fontFamily: FONT.sans,
              cursor: rows.length === 0 ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            Looks right — save
          </button>
        </div>
      </div>
    </div>
  );
}
