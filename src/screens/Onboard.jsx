import { useEffect, useRef, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { PAPER, FONT, TYPE, RADIUS } from "../tokens.js";
import {
  initialState, applyInput, nextTurn, finalize, validate, TURNS,
} from "../onboard/turns.js";
import { runTurn, scriptedTurn } from "../onboard/prompting.js";
import { chat, isConfigured } from "../lib/llm.js";
import { saveGoal, getGoal } from "../data/store.js";

const DRAFT_KEY = "becoming.onboard.draft";

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.state || !Array.isArray(parsed.transcript)) return null;
    return parsed;
  } catch { return null; }
}
function saveDraft(state, transcript) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ state, transcript })); } catch {}
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

const PROMPTS = {
  ambition: "Say the goal in your own words — I'll shape a way there.",
  type: "Is this a wake-time goal or a cadence goal?",
  baseline: (a) => a.type === "cadence" ? "How often, roughly, right now?" : "What time do you actually wake up now?",
  target: (a) => a.type === "cadence" ? "Where do you want to land — every how many days?" : "What time do you want to wake up?",
  endDate: "By when feels doable?",
  roundsPreview: "Here are the proposed rounds — accept, or ask to soften?",
  indicators: "Draft indicators drawn — accept, or edit?",
  confirm: "Ready to lock this in?",
};

function promptFor(turnId, answers) {
  const p = PROMPTS[turnId];
  return typeof p === "function" ? p(answers) : p;
}

const PLACEHOLDER = {
  ambition: "Say the goal in your own words",
  type: "wake or cadence",
  baseline: "e.g. 08:30 or every day",
  target: "e.g. 06:00 or every 7 days",
  endDate: "e.g. 2026-12-31 or 'end of year'",
  roundsPreview: "ok",
  indicators: "ok",
  confirm: "yes",
};

export default function Onboard() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const editGoalId = params.get("goalId");
  const jumpTurn = params.get("turn");
  const [state, setState] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const [llmOn, setLlmOn] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    async function boot() {
      if (editGoalId) {
        clearDraft();
        const goal = await getGoal(editGoalId).catch(() => null);
        if (!goal) {
          const s = initialState();
          setState(s);
          setTranscript([{ role: "assistant", text: promptFor("ambition", s.answers) }]);
          isConfigured().then(setLlmOn).catch(() => setLlmOn(false));
          return;
        }
        // Derive onboard session type ("wake"|"cadence") from baseline shape,
        // since stored goal.type is now "tracker"|"habit".
        const sessionType = goal.baseline?.intervalDays != null ? "cadence" : "wake";
        const answers = {
          ambition: goal.ambition,
          type: sessionType,
          baseline: goal.baseline,
          target: goal.target,
          endDate: goal.endDate,
          roundsPreview: goal.rounds,
          indicators: goal.indicators,
        };
        if (jumpTurn) {
          const idx = TURNS.indexOf(jumpTurn);
          if (idx >= 0) {
            for (const t of TURNS.slice(idx)) delete answers[t];
          }
        }
        const s = { sessionId: `edit-${goal.id}`, answers, name: goal.name, cat: goal.cat };
        setState(s);
        const validJump = jumpTurn && TURNS.includes(jumpTurn) ? jumpTurn : null;
        const target = validJump || TURNS[Object.keys(answers).length];
        setTranscript([{ role: "assistant", text: promptFor(target, answers) }]);
        isConfigured().then(setLlmOn).catch(() => setLlmOn(false));
        return;
      }
      const draft = loadDraft();
      if (draft) {
        setState(draft.state);
        setTranscript(draft.transcript);
      } else {
        const s = initialState();
        setState(s);
        setTranscript([{ role: "assistant", text: promptFor("ambition", s.answers) }]);
      }
      isConfigured().then(setLlmOn).catch(() => setLlmOn(false));
    }
    boot();
  }, [editGoalId, jumpTurn]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcript]);

  if (!state) return <div style={pageStyle}><p style={{ color: PAPER.faint }}>Loading…</p></div>;

  const turn = nextTurn(state);

  async function processExtracted(userText, extractedValue, assistant) {
    const v = validate(turn.id, extractedValue);
    if (!v.ok) { setError(v.error); return; }
    let nextState;
    try { nextState = applyInput(state, turn.id, extractedValue); }
    catch (e) { setError(e.message); return; }

    const nextTranscript = [
      ...transcript,
      { role: "user", text: userText || "(skipped)" },
      { role: "assistant", text: assistant },
    ];
    setState(nextState);
    setTranscript(nextTranscript);
    setText("");
    setError(null);
    saveDraft(nextState, nextTranscript);

    const after = nextTurn(nextState);
    if (after.done) {
      try {
        const goal = finalize(nextState);
        await saveGoal(goal);
        clearDraft();
        nav("/");
        return;
      } catch (e) {
        setError("Could not save this goal — your draft is safe. Try again in a moment.");
        saveDraft(nextState, nextTranscript);
        return;
      }
    }
    setTranscript((t) => [...t, { role: "assistant", text: promptFor(after.id, nextState.answers) }]);
  }

  async function submit(userText) {
    setError(null);
    if (turn.done) return;
    const { extractedValue, assistant } = await runTurn({
      state, turnId: turn.id, userText, llmChat: llmOn ? chat : undefined,
    });
    if (extractedValue === undefined) {
      setError(assistant);
      return;
    }
    await processExtracted(userText, extractedValue, assistant);
  }

  async function onSkip() {
    setError(null);
    if (turn.done) return;
    // Provide sensible defaults for turns that can't auto-extract from empty text.
    const skipDefaults = {
      ambition: "unnamed goal",
      baseline: state.answers.type === "cadence" ? "every 3 days" : "08:00",
      target: state.answers.type === "cadence" ? "every 7 days" : "06:30",
      endDate: "end of year",
    };
    const fallback = skipDefaults[turn.id] ?? "";
    const scripted = scriptedTurn({ state, turnId: turn.id, userText: fallback });
    if (scripted.extractedValue === undefined) {
      setError("Nothing to skip — say something first.");
      return;
    }
    await processExtracted("", scripted.extractedValue, scripted.assistant);
  }

  function onSend() { submit(text); }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <header style={{ padding: "44px 26px 16px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 32 }}>
            <div style={wordmarkStyle}>Becoming</div>
            <Link to="/" style={{ color: PAPER.faint, fontSize: 12, textDecoration: "none" }}>← Life</Link>
          </div>
          <div style={kickerStyle}>Step zero — the Balboa breakdown</div>
          <h1 style={h1Style}>One step. One punch. One round.</h1>
        </header>

        <div ref={scrollRef} style={{ flex: 1, padding: "0 26px 24px", overflowY: "auto" }}>
          {transcript.map((m, i) => (
            <div key={i} style={m.role === "user" ? userBubble : assistantBubble}>
              {m.text}
            </div>
          ))}
          {error && <div style={{ color: PAPER.whisper, fontSize: 12, marginTop: 8 }}>{error}</div>}
        </div>

        <div style={inputBarStyle}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDER[turn.done ? "confirm" : turn.id]}
            onKeyDown={(e) => { if (e.key === "Enter") onSend(); }}
            style={inputStyle}
            autoFocus
          />
          <button onClick={onSkip} style={secondaryPill}>Skip</button>
          <button onClick={onSend} style={primaryPill}>Send</button>
        </div>

        <footer style={{ padding: "12px 26px 24px", textAlign: "center" }}>
          <span style={{ color: PAPER.faint, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>becoming</span>
        </footer>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: PAPER.bg,
  color: PAPER.ink,
  fontFamily: FONT.sans,
};
const wordmarkStyle = {
  fontFamily: FONT.serif, fontWeight: 300, fontSize: 13,
  letterSpacing: "0.18em", textTransform: "uppercase", color: PAPER.faint,
};
const kickerStyle = {
  fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
  color: PAPER.faint, fontWeight: 500, marginBottom: 10,
};
const h1Style = {
  fontFamily: FONT.serif, fontWeight: 400,
  fontSize: "clamp(26px, 4vw, 36px)",
  lineHeight: 1.2, margin: "0 0 0", color: PAPER.ink, letterSpacing: "-0.01em",
};
const bubbleBase = {
  padding: "10px 14px", borderRadius: 14, marginTop: 10,
  fontSize: 14, lineHeight: 1.55, maxWidth: "80%",
};
const assistantBubble = {
  ...bubbleBase,
  background: PAPER.panel, color: PAPER.ink, alignSelf: "flex-start",
};
const userBubble = {
  ...bubbleBase,
  background: PAPER.card, border: `1px solid ${PAPER.line}`,
  color: PAPER.ink, marginLeft: "auto",
};
const inputBarStyle = {
  display: "flex", gap: 8, padding: "12px 26px",
  borderTop: `1px solid ${PAPER.line}`, background: PAPER.bg,
};
const inputStyle = {
  flex: 1, padding: "10px 14px", borderRadius: 14,
  border: `1px solid ${PAPER.line}`, background: PAPER.card,
  fontSize: 14, fontFamily: FONT.sans, color: PAPER.ink,
};
const primaryPill = {
  padding: "10px 16px", borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.line}`, background: PAPER.card,
  fontSize: 13, fontFamily: FONT.sans, color: PAPER.ink, cursor: "pointer",
};
const secondaryPill = {
  padding: "10px 16px", borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.line}`, background: "transparent",
  fontSize: 13, fontFamily: FONT.sans, color: PAPER.dim, cursor: "pointer",
};
