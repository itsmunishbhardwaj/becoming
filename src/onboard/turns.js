export const TURNS = Object.freeze([
  "ambition","type","baseline","target","endDate",
  "roundsPreview","indicators","confirm",
]);

function uid() {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "goal";
}

function classifyCat(ambition) {
  const t = ambition.toLowerCase();
  if (/(sleep|wake|gym|run|body|health|weight)/.test(t)) return "health";
  if (/(read|book)/.test(t)) return "reading";
  if (/(job|career|interview|coding|ship|startup|work)/.test(t)) return "career";
  if (/(friend|family|call|meet|partner|love|relation)/.test(t)) return "relationships";
  if (/(money|save|invest|fund)/.test(t)) return "finance";
  if (/(write|draw|paint|create)/.test(t)) return "creativity";
  return "health";
}

export function initialState() {
  return { sessionId: uid(), answers: {} };
}

const HHMM = /^\d{1,2}:\d{2}$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function validate(turnId, value) {
  switch (turnId) {
    case "ambition":
      return typeof value === "string" && value.trim().length > 0
        ? { ok: true }
        : { ok: false, error: "Say the goal in your own words." };
    case "type":
      return value === "wake" || value === "cadence"
        ? { ok: true }
        : { ok: false, error: "Type must be wake or cadence." };
    case "baseline":
    case "target":
      if (typeof value === "string" && HHMM.test(value)) return { ok: true };
      if (
        value && typeof value === "object" &&
        Number.isInteger(value.intervalDays) && value.intervalDays > 0
      ) return { ok: true };
      return { ok: false, error: "Use HH:MM for wake, or { intervalDays: N > 0 } for cadence." };
    case "endDate":
      return typeof value === "string" && ISO.test(value)
        ? { ok: true }
        : { ok: false, error: "Use YYYY-MM-DD." };
    case "roundsPreview":
      return Array.isArray(value) && value.length > 0
        ? { ok: true }
        : { ok: false, error: "Need at least one round." };
    case "indicators":
      return value && Array.isArray(value.right) && Array.isArray(value.wrong) && Array.isArray(value.stall)
        ? { ok: true }
        : { ok: false, error: "Indicators need right, wrong, stall arrays." };
    case "confirm":
      return value === true
        ? { ok: true }
        : { ok: false, error: "Confirm with true." };
    default:
      return { ok: false, error: `Unknown turn ${turnId}` };
  }
}

export function applyInput(state, turnId, value) {
  const v = validate(turnId, value);
  if (!v.ok) throw new Error(`invalid input for ${turnId}: ${v.error}`);
  const answers = { ...state.answers, [turnId]: value };
  const next = { ...state, answers };
  if (turnId === "ambition") {
    next.name = value.trim();
    next.cat = classifyCat(value);
  }
  return next;
}

export function nextTurn(state) {
  for (const id of TURNS) {
    if (state.answers[id] === undefined) return { id, done: false };
  }
  return { done: true };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function finalize(state) {
  const a = state.answers;
  if (!a.ambition || !a.type || !a.baseline || !a.target || !a.endDate || !a.roundsPreview || !a.indicators) {
    throw new Error("finalize called before all turns answered");
  }
  const createdAt = today();
  const id = slugify(state.name || a.ambition);
  return {
    id,
    name: state.name || a.ambition,
    cat: state.cat || "health",
    type: a.type,
    state: "active",
    baseline: a.baseline,
    target: a.target,
    endDate: a.endDate,
    currentRound: 1,
    createdAt,
    ambition: a.ambition,
    rounds: a.roundsPreview,
    howWeGetThere: "",     // filled by prompting layer / user edits
    indicators: a.indicators,
  };
}
