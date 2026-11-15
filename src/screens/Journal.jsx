import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { PAPER, FONT, TYPE, RADIUS } from "../tokens.js";
import { listGoals, listJournal, saveJournal, deleteJournal } from "../data/store.js";
import { goalColor } from "../lib/goalColor.js";
import { todayLocalISO } from "../lib/date.js";

const PROMPTS = [
  { key: "highlight", label: "Highlight of the day" },
  { key: "remember",  label: "Something to remember" },
];

function humanDate(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function truncate(text, lines = 3) {
  const rows = text.split("\n").filter(Boolean);
  if (rows.length <= lines) return { text, truncated: false };
  return { text: rows.slice(0, lines).join("\n"), truncated: true };
}

export default function Journal() {
  const [searchParams] = useSearchParams();
  const prefilledGoalId = searchParams.get("goal");

  const [goals, setGoals] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // composer state
  const [text, setText] = useState("");
  const [date, setDate] = useState(todayLocalISO());
  const [prompt, setPrompt] = useState(null);
  const [selectedGoalIds, setSelectedGoalIds] = useState(prefilledGoalId ? [prefilledGoalId] : []);
  const [saving, setSaving] = useState(false);

  // filter state
  const [filterGoalId, setFilterGoalId] = useState(prefilledGoalId || "");
  const [filterPrompt, setFilterPrompt] = useState("");

  // draft autosave
  const draftTimer = useRef(null);

  const loadEntries = useCallback(async () => {
    const opts = {};
    if (filterGoalId) opts.goalId = filterGoalId;
    if (filterPrompt) opts.prompt = filterPrompt;
    const data = await listJournal(opts).catch(() => []);
    setEntries(data);
  }, [filterGoalId, filterPrompt]);

  useEffect(() => {
    listGoals()
      .then((gs) => setGoals(gs.filter((g) => g.state === "active")))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    loadEntries().finally(() => setLoading(false));
  }, [loadEntries]);

  // autosave draft to sessionStorage
  useEffect(() => {
    clearTimeout(draftTimer.current);
    if (!text.trim()) return;
    draftTimer.current = setTimeout(() => {
      sessionStorage.setItem("journal-draft", JSON.stringify({ text, date, prompt, selectedGoalIds }));
    }, 800);
    return () => clearTimeout(draftTimer.current);
  }, [text, date, prompt, selectedGoalIds]);

  // restore draft on mount
  useEffect(() => {
    if (prefilledGoalId) return; // don't restore a generic draft into a goal-scoped composer
    try {
      const raw = sessionStorage.getItem("journal-draft");
      if (raw) {
        const d = JSON.parse(raw);
        if (d.text) { setText(d.text); setDate(d.date || todayLocalISO()); setPrompt(d.prompt || null); setSelectedGoalIds(d.selectedGoalIds || []); }
      }
    } catch {}
  }, []); // eslint-disable-line

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const entry = await saveJournal({
        date,
        text: text.trim(),
        prompt: prompt || null,
        goalIds: selectedGoalIds,
      });
      setText("");
      setPrompt(null);
      setDate(todayLocalISO());
      setSelectedGoalIds(prefilledGoalId ? [prefilledGoalId] : []);
      sessionStorage.removeItem("journal-draft");
      setEntries((prev) => [entry, ...prev]);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSave();
  }

  function toggleGoalTag(id) {
    setSelectedGoalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleDelete(id) {
    await deleteJournal(id).catch(() => {});
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const promptLabel = prompt ? PROMPTS.find((p) => p.key === prompt)?.label : null;

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>

        {/* Composer */}
        <section style={composerCard}>
          {promptLabel && (
            <div style={promptLabelStyle}>{promptLabel}</div>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What happened?"
            rows={5}
            style={textareaStyle}
          />

          {/* Prompt chips */}
          <div style={chipRow}>
            {PROMPTS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPrompt((prev) => prev === p.key ? null : p.key)}
                style={{ ...chip, ...(prompt === p.key ? chipActive : {}) }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <label style={metaLabel}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={dateInput}
            />
          </div>

          {/* Goal tags */}
          {goals.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={metaLabel}>Tag goals</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {goals.map((g) => {
                  const sel = selectedGoalIds.includes(g.id);
                  const color = goalColor(g);
                  return (
                    <button
                      key={g.id}
                      onClick={() => toggleGoalTag(g.id)}
                      style={{
                        ...chip,
                        ...(sel ? { background: color + "22", border: `1px solid ${color}66`, color: PAPER.ink } : {}),
                        display: "flex", alignItems: "center", gap: 5,
                      }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: color }} />
                      {g.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button onClick={handleSave} disabled={!text.trim() || saving} style={saveBtn}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          <div style={{ fontSize: 10, color: PAPER.faint, fontFamily: FONT.sans, marginTop: 6, textAlign: "right" }}>
            ⌘ + Enter to save
          </div>
        </section>

        {/* Filter bar */}
        <div style={filterBar}>
          <select
            value={filterGoalId}
            onChange={(e) => setFilterGoalId(e.target.value)}
            style={filterSelect}
          >
            <option value="">All goals</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <select
            value={filterPrompt}
            onChange={(e) => setFilterPrompt(e.target.value)}
            style={filterSelect}
          >
            <option value="">All prompts</option>
            {PROMPTS.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
          {(filterGoalId || filterPrompt) && (
            <button onClick={() => { setFilterGoalId(""); setFilterPrompt(""); }} style={clearFilterBtn}>
              Clear
            </button>
          )}
        </div>

        {/* Entry list */}
        {loading ? (
          <p style={{ color: PAPER.faint, fontFamily: FONT.sans, fontSize: TYPE.body, marginTop: 24 }}>Loading…</p>
        ) : entries.length === 0 ? (
          <p style={{ fontFamily: FONT.serif, fontStyle: "italic", fontSize: TYPE.ambition, color: PAPER.dim, marginTop: 24 }}>
            No entries yet. Write something above.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
            {entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                goals={goals}
                onDelete={() => handleDelete(entry.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EntryCard({ entry, goals, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { text, truncated } = expanded ? { text: entry.text, truncated: false } : truncate(entry.text);
  const promptMeta = entry.prompt ? PROMPTS.find((p) => p.key === entry.prompt)?.label : null;
  const taggedGoals = goals.filter((g) => (entry.goalIds || []).includes(g.id));

  return (
    <article style={entryCard}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={entryDateStyle}>{humanDate(entry.date)}</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {entry.editedAt && <span style={editedBadge}>edited</span>}
          {confirmDelete ? (
            <>
              <button onClick={onDelete} style={dangerYes}>Delete</button>
              <button onClick={() => setConfirmDelete(false)} style={dangerNo}>Cancel</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} style={deleteBtn}>✕</button>
          )}
        </div>
      </div>

      {/* Prompt label */}
      {promptMeta && (
        <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: PAPER.faint, fontFamily: FONT.sans, marginBottom: 6 }}>
          {promptMeta}
        </div>
      )}

      {/* Text */}
      <p
        style={{ fontFamily: FONT.sans, fontSize: TYPE.body, color: PAPER.ink, margin: 0, lineHeight: 1.65, whiteSpace: "pre-wrap", cursor: truncated ? "pointer" : "default" }}
        onClick={() => truncated && setExpanded(true)}
      >
        {text}
        {truncated && <span style={{ color: PAPER.faint }}> … <span style={{ textDecoration: "underline" }}>more</span></span>}
      </p>
      {expanded && (
        <button onClick={() => setExpanded(false)} style={lessBtn}>Less</button>
      )}

      {/* Goal tags */}
      {taggedGoals.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
          {taggedGoals.map((g) => (
            <span key={g.id} style={{ ...goalTag, borderColor: goalColor(g) + "66", background: goalColor(g) + "18" }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: goalColor(g) }} />
              {g.name}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

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

const composerCard = {
  background: PAPER.card,
  border: `1px solid ${PAPER.line}`,
  borderRadius: RADIUS.r1,
  padding: "20px 22px 16px",
  marginBottom: 24,
};

const promptLabelStyle = {
  fontFamily: FONT.serif,
  fontStyle: "italic",
  fontSize: TYPE.ambition,
  color: PAPER.dim,
  marginBottom: 10,
};

const textareaStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 0",
  border: "none",
  borderBottom: `1px solid ${PAPER.line}`,
  background: "transparent",
  color: PAPER.ink,
  fontFamily: FONT.sans,
  fontSize: TYPE.body,
  lineHeight: 1.65,
  resize: "vertical",
  outline: "none",
};

const chipRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginTop: 12,
};

const chip = {
  padding: "5px 12px",
  borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.line}`,
  background: PAPER.panel,
  color: PAPER.dim,
  fontFamily: FONT.sans,
  fontSize: 12,
  cursor: "pointer",
  transition: "all 0.12s",
};

const chipActive = {
  background: PAPER.affirm,
  border: `1px solid ${PAPER.affirmLine}`,
  color: PAPER.affirmInk,
};

const metaLabel = {
  fontSize: 11,
  fontFamily: FONT.sans,
  color: PAPER.faint,
  letterSpacing: "0.08em",
};

const dateInput = {
  fontSize: 13,
  fontFamily: FONT.sans,
  color: PAPER.ink,
  background: PAPER.panel,
  border: `1px solid ${PAPER.line}`,
  borderRadius: RADIUS.pill,
  padding: "4px 10px",
  outline: "none",
};

const saveBtn = {
  padding: "9px 22px",
  borderRadius: RADIUS.pill,
  border: "none",
  background: PAPER.ink,
  color: PAPER.bg,
  fontFamily: FONT.sans,
  fontSize: TYPE.body,
  cursor: "pointer",
};

const filterBar = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  marginBottom: 4,
};

const filterSelect = {
  padding: "7px 10px",
  borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.line}`,
  background: PAPER.card,
  color: PAPER.dim,
  fontFamily: FONT.sans,
  fontSize: 12,
  cursor: "pointer",
  outline: "none",
};

const clearFilterBtn = {
  fontSize: 12,
  fontFamily: FONT.sans,
  color: PAPER.faint,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "4px 6px",
};

const entryCard = {
  background: PAPER.card,
  border: `1px solid ${PAPER.line}`,
  borderRadius: RADIUS.r2,
  padding: "16px 18px",
};

const entryDateStyle = {
  fontSize: TYPE.meta,
  fontFamily: FONT.sans,
  color: PAPER.dim,
  fontWeight: 500,
};

const editedBadge = {
  fontSize: 10,
  fontFamily: FONT.sans,
  color: PAPER.faint,
  letterSpacing: "0.08em",
};

const deleteBtn = {
  fontSize: 11,
  color: PAPER.faint,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "2px 4px",
};

const dangerYes = {
  fontSize: 12,
  fontFamily: FONT.sans,
  color: PAPER.dim,
  background: PAPER.panel,
  border: `1px solid ${PAPER.line}`,
  borderRadius: RADIUS.pill,
  padding: "3px 10px",
  cursor: "pointer",
};

const dangerNo = {
  fontSize: 12,
  fontFamily: FONT.sans,
  color: PAPER.faint,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "3px 6px",
};

const lessBtn = {
  fontSize: 12,
  fontFamily: FONT.sans,
  color: PAPER.faint,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "4px 0 0",
  display: "block",
  marginTop: 4,
};

const goalTag = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  fontFamily: FONT.sans,
  color: PAPER.dim,
  border: "1px solid",
  borderRadius: RADIUS.pill,
  padding: "3px 8px",
};
