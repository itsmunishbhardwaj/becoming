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

export async function deleteGoal(id) {
  const userId = await uid();
  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(`deleteGoal ${id}: ${error.message}`);
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

// ── Journal ────────────────────────────────────────────────────────────────

function rowToJournal(row) {
  return {
    id: row.id,
    date: row.date,
    text: row.text,
    prompt: row.prompt ?? null,
    goalIds: row.goal_ids ?? [],
    createdAt: row.created_at,
    editedAt: row.edited_at ?? null,
  };
}

export async function listJournal({ from, to, goalId, prompt } = {}) {
  const userId = await uid();
  let q = supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (from) q = q.gte("date", from);
  if (to) q = q.lte("date", to);
  if (prompt) q = q.eq("prompt", prompt);
  const { data, error } = await q;
  if (error) throw new Error(`listJournal: ${error.message}`);
  let rows = data || [];
  if (goalId) rows = rows.filter((r) => (r.goal_ids ?? []).includes(goalId));
  return rows.map(rowToJournal);
}

export async function saveJournal(entry) {
  const userId = await uid();
  const now = new Date().toISOString();
  const row = {
    user_id: userId,
    date: entry.date,
    text: entry.text,
    prompt: entry.prompt ?? null,
    goal_ids: entry.goalIds ?? [],
    ...(entry.id ? { id: entry.id, edited_at: now } : { created_at: now }),
  };
  const { data, error } = await supabase
    .from("journal_entries")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(`saveJournal: ${error.message}`);
  return rowToJournal(data);
}

export async function deleteJournal(id) {
  const userId = await uid();
  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(`deleteJournal ${id}: ${error.message}`);
}

// ── Tasks ──────────────────────────────────────────────────────────────────

function rowToTask(row) {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    order: row.order,
    done: row.done,
    doneAt: row.done_at ?? null,
    dueTime: row.due_time ?? null,
    goalId: row.goal_id ?? null,
    carriedFrom: row.carried_from ?? null,
  };
}

export async function listTasks(date) {
  const userId = await uid();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .order("order");
  if (error) throw new Error(`listTasks: ${error.message}`);
  return (data || []).map(rowToTask);
}

export async function addTask(date, title, goalId = null) {
  const userId = await uid();
  const { data: existing } = await supabase
    .from("tasks")
    .select("order")
    .eq("user_id", userId)
    .eq("date", date)
    .order("order", { ascending: false })
    .limit(1);
  const nextOrder = existing?.length ? (existing[0].order + 1) : 0;
  const { data, error } = await supabase
    .from("tasks")
    .insert({ user_id: userId, title, date, order: nextOrder, goal_id: goalId })
    .select()
    .single();
  if (error) throw new Error(`addTask: ${error.message}`);
  return rowToTask(data);
}

export async function setTaskDone(id, done) {
  const userId = await uid();
  const { data, error } = await supabase
    .from("tasks")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`setTaskDone ${id}: ${error.message}`);
  return rowToTask(data);
}

export async function reorderTasks(date, ids) {
  const userId = await uid();
  await Promise.all(
    ids.map((id, i) =>
      supabase.from("tasks").update({ order: i }).eq("user_id", userId).eq("id", id).eq("date", date)
    )
  );
}

export async function carryTask(id, toDate) {
  const userId = await uid();
  const { data: orig, error: fetchErr } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();
  if (fetchErr) throw new Error(`carryTask fetch: ${fetchErr.message}`);
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title: orig.title,
      date: toDate,
      order: 0,
      goal_id: orig.goal_id,
      carried_from: orig.date,
    })
    .select()
    .single();
  if (error) throw new Error(`carryTask insert: ${error.message}`);
  return rowToTask(data);
}

export async function listTaskLog(date) {
  const userId = await uid();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .eq("done", true)
    .order("done_at");
  if (error) throw new Error(`listTaskLog: ${error.message}`);
  return (data || []).map(rowToTask);
}

// ── Contracts ──────────────────────────────────────────────────────────────

function rowToContract(row) {
  return {
    id: row.id,
    goalId: row.goal_id,
    change: row.change,
    terms: row.terms,
    signatureSvg: row.signature_svg ?? null,
    signedAt: row.signed_at ?? null,
    retiredAt: row.retired_at ?? null,
    createdAt: row.created_at,
  };
}

export async function listContracts() {
  const userId = await uid();
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listContracts: ${error.message}`);
  return (data || []).map(rowToContract);
}

export async function getContract(id) {
  const userId = await uid();
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();
  if (error) return null;
  return rowToContract(data);
}

export async function saveContract(contract) {
  const userId = await uid();
  const row = {
    user_id: userId,
    goal_id: contract.goalId,
    change: contract.change ?? "",
    terms: contract.terms ?? "",
    signature_svg: contract.signatureSvg ?? null,
    signed_at: contract.signedAt ?? null,
    ...(contract.id ? { id: contract.id } : {}),
  };
  const { data, error } = await supabase
    .from("contracts")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(`saveContract: ${error.message}`);
  return rowToContract(data);
}

export async function retireContract(id) {
  const userId = await uid();
  const { error } = await supabase
    .from("contracts")
    .update({ retired_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(`retireContract ${id}: ${error.message}`);
}
