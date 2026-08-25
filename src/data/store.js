import { supabase } from "../lib/supabase.js";

// ── Helpers ────────────────────────────────────────────────────────────────

async function uid() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  return session.user.id;
}

// Mirror of logCodec derivePayload — kept local so logCodec stays portable for the iCloud export.
function eventPayload(e) {
  if (e.payload != null) return e.payload;
  if (e.verb === "wake" && e.time) return e.time;
  if (e.verb === "session") {
    if (e.time && e.durationMin != null) return `${e.time} · ${e.durationMin}min`;
    if (e.durationMin != null) return `${e.durationMin}min`;
    if (e.time) return e.time;
  }
  return "";
}

// ── Row ↔ JS mappers ───────────────────────────────────────────────────────

function rowToGoal(row) {
  return {
    id: row.id,
    name: row.name,
    cat: row.cat,
    ...(row.color ? { color: row.color } : {}),
    type: row.type,
    state: row.state,
    baseline: row.baseline ?? null,
    target: row.target ?? null,
    endDate: row.end_date ?? null,
    currentRound: row.current_round ?? 1,
    createdAt: row.created_at,
    ambition: row.ambition || "",
    rounds: row.rounds || [],
    howWeGetThere: row.how_we_get_there || "",
    indicators: row.indicators || { right: [], wrong: [], stall: [] },
  };
}

function goalToRow(g, userId) {
  return {
    id: g.id,
    user_id: userId,
    name: g.name,
    cat: g.cat,
    color: g.color || null,
    type: g.type,
    state: g.state,
    baseline: g.baseline ?? null,
    target: g.target ?? null,
    end_date: g.endDate ?? null,
    current_round: g.currentRound ?? 1,
    created_at: g.createdAt ?? new Date().toISOString(),
    ambition: g.ambition || "",
    rounds: g.rounds || [],
    how_we_get_there: g.howWeGetThere || "",
    indicators: g.indicators || { right: [], wrong: [], stall: [] },
  };
}

function rowToEvent(row) {
  const e = { verb: row.verb, payload: row.payload, goalId: row.goal_id };
  if (row.time) e.time = row.time;
  if (row.duration_min != null) e.durationMin = row.duration_min;
  return e;
}

function buildLog(date, eventRows, noteRows) {
  const events = (eventRows || []).map(rowToEvent);
  const notes = {};
  for (const n of (noteRows || [])) notes[n.goal_id] = n.text;
  return { date, events, notes };
}

// ── Store API (interface matches vault store exactly) ──────────────────────

export async function listGoals() {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("created_at");
  if (error) return [];
  return (data || []).map(rowToGoal);
}

export async function getGoal(id) {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return rowToGoal(data);
}

export async function saveGoal(goal) {
  const userId = await uid();
  const { error } = await supabase
    .from("goals")
    .upsert(goalToRow(goal, userId), { onConflict: "user_id,id" });
  if (error) throw new Error(`saveGoal ${goal.id}: ${error.message}`);
}

export async function readLog(date) {
  const [{ data: evtRows }, { data: noteRows }] = await Promise.all([
    supabase.from("log_events").select("*").eq("date", date).order("created_at"),
    supabase.from("log_notes").select("*").eq("date", date),
  ]);
  if (!evtRows?.length && !noteRows?.length) return null;
  return buildLog(date, evtRows, noteRows);
}

export async function readLogsInRange({ from, to }) {
  const [{ data: evtRows, error: evtErr }, { data: noteRows, error: noteErr }] = await Promise.all([
    supabase.from("log_events").select("*").gte("date", from).lte("date", to).order("date").order("created_at"),
    supabase.from("log_notes").select("*").gte("date", from).lte("date", to).order("date"),
  ]);
  if (evtErr) throw new Error(`readLogsInRange events: ${evtErr.message}`);
  if (noteErr) throw new Error(`readLogsInRange notes: ${noteErr.message}`);

  const byDate = {};
  for (const r of (evtRows || [])) {
    if (!byDate[r.date]) byDate[r.date] = { events: [], notes: [] };
    byDate[r.date].events.push(r);
  }
  for (const r of (noteRows || [])) {
    if (!byDate[r.date]) byDate[r.date] = { events: [], notes: [] };
    byDate[r.date].notes.push(r);
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { events, notes }]) => buildLog(date, events, notes));
}

export async function appendLog(date, event) {
  const userId = await uid();
  const payload = eventPayload(event);
  await supabase.from("log_events").upsert({
    user_id: userId,
    date,
    goal_id: event.goalId,
    verb: event.verb,
    payload,
    time: event.time || null,
    duration_min: event.durationMin ?? null,
  }, { onConflict: "user_id,date,goal_id,verb,payload", ignoreDuplicates: true });
}

export async function deleteLogEvent(date, event) {
  const userId = await uid();
  const payload = eventPayload(event);
  await supabase
    .from("log_events")
    .delete()
    .eq("user_id", userId)
    .eq("date", date)
    .eq("goal_id", event.goalId)
    .eq("verb", event.verb)
    .eq("payload", payload);
}

export async function saveNote(date, goalId, text) {
  const userId = await uid();
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (trimmed === "") {
    await supabase
      .from("log_notes")
      .delete()
      .eq("user_id", userId)
      .eq("date", date)
      .eq("goal_id", goalId);
  } else {
    await supabase.from("log_notes").upsert({
      user_id: userId,
      date,
      goal_id: goalId,
      text: trimmed,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,date,goal_id" });
  }
}
