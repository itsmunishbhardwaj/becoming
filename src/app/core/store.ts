import { supabase } from './supabase';
import type { Goal, Log, LogEvent, JournalEntry, Task, Contract } from './types';

async function uid(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return session.user.id;
}

function eventPayload(e: LogEvent): string {
  if (e.payload != null) return e.payload;
  if (e.verb === 'wake' && e.time) return e.time;
  if (e.verb === 'session') {
    if (e.time && e.durationMin != null) return `${e.time} · ${e.durationMin}min`;
    if (e.durationMin != null) return `${e.durationMin}min`;
    if (e.time) return e.time;
  }
  return '';
}

function rowToGoal(row: Record<string, unknown>): Goal {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    cat: row['cat'] as string,
    ...(row['color'] ? { color: row['color'] as string } : {}),
    type: row['type'] as Goal['type'],
    state: row['state'] as Goal['state'],
    baseline: (row['baseline'] ?? null) as Goal['baseline'],
    target: (row['target'] ?? null) as Goal['target'],
    endDate: (row['end_date'] ?? null) as string | null,
    currentRound: (row['current_round'] ?? 1) as number,
    createdAt: row['created_at'] as string,
    ambition: (row['ambition'] as string) || '',
    rounds: (row['rounds'] as Goal['rounds']) || [],
    howWeGetThere: (row['how_we_get_there'] as string) || '',
    indicators: (row['indicators'] as Goal['indicators']) || { right: [], wrong: [], stall: [] },
    goalTime: (row['goal_time'] ?? null) as string | null,
  };
}

function goalToRow(g: Goal, userId: string): Record<string, unknown> {
  return {
    id: g.id, user_id: userId, name: g.name, cat: g.cat,
    color: g.color || null, type: g.type, state: g.state,
    baseline: g.baseline ?? null, target: g.target ?? null,
    end_date: g.endDate ?? null, current_round: g.currentRound ?? 1,
    created_at: g.createdAt ?? new Date().toISOString(),
    ambition: g.ambition || '', rounds: g.rounds || [],
    how_we_get_there: g.howWeGetThere || '',
    indicators: g.indicators || { right: [], wrong: [], stall: [] },
    goal_time: g.goalTime ?? null,
  };
}

function rowToEvent(row: Record<string, unknown>): LogEvent {
  const e: LogEvent = { verb: row['verb'] as string, payload: row['payload'] as string, goalId: row['goal_id'] as string };
  if (row['time']) e.time = row['time'] as string;
  if (row['duration_min'] != null) e.durationMin = row['duration_min'] as number;
  return e;
}

function buildLog(date: string, eventRows: Record<string, unknown>[] | null, noteRows: Record<string, unknown>[] | null): Log {
  const events = (eventRows || []).map(rowToEvent);
  const notes: Record<string, string> = {};
  for (const n of (noteRows || [])) notes[n['goal_id'] as string] = n['text'] as string;
  return { date, events, notes };
}

export async function listGoals(): Promise<Goal[]> {
  const { data, error } = await supabase.from('goals').select('*').order('created_at');
  if (error) return [];
  return (data || []).map((r) => rowToGoal(r as Record<string, unknown>));
}

export async function getGoal(id: string): Promise<Goal | null> {
  const { data, error } = await supabase.from('goals').select('*').eq('id', id).single();
  if (error) return null;
  return rowToGoal(data as Record<string, unknown>);
}

export async function saveGoal(goal: Goal): Promise<void> {
  const userId = await uid();
  const { error } = await supabase.from('goals').upsert(goalToRow(goal, userId), { onConflict: 'user_id,id' });
  if (error) throw new Error(`saveGoal ${goal.id}: ${error.message}`);
}

export async function deleteGoal(id: string): Promise<void> {
  const userId = await uid();
  const { error } = await supabase.from('goals').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(`deleteGoal ${id}: ${error.message}`);
}

export async function readLog(date: string): Promise<Log | null> {
  const [{ data: evtRows }, { data: noteRows }] = await Promise.all([
    supabase.from('log_events').select('*').eq('date', date).order('created_at'),
    supabase.from('log_notes').select('*').eq('date', date),
  ]);
  if (!evtRows?.length && !noteRows?.length) return null;
  return buildLog(date, evtRows as Record<string, unknown>[], noteRows as Record<string, unknown>[]);
}

export async function readLogsInRange({ from, to }: { from: string; to: string }): Promise<Log[]> {
  const [{ data: evtRows, error: evtErr }, { data: noteRows, error: noteErr }] = await Promise.all([
    supabase.from('log_events').select('*').gte('date', from).lte('date', to).order('date').order('created_at'),
    supabase.from('log_notes').select('*').gte('date', from).lte('date', to).order('date'),
  ]);
  if (evtErr) throw new Error(`readLogsInRange events: ${evtErr.message}`);
  if (noteErr) throw new Error(`readLogsInRange notes: ${noteErr.message}`);

  const byDate: Record<string, { events: Record<string, unknown>[]; notes: Record<string, unknown>[] }> = {};
  for (const r of (evtRows || []) as Record<string, unknown>[]) {
    const d = r['date'] as string;
    if (!byDate[d]) byDate[d] = { events: [], notes: [] };
    byDate[d].events.push(r);
  }
  for (const r of (noteRows || []) as Record<string, unknown>[]) {
    const d = r['date'] as string;
    if (!byDate[d]) byDate[d] = { events: [], notes: [] };
    byDate[d].notes.push(r);
  }
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { events, notes }]) => buildLog(date, events, notes));
}

export async function appendLog(date: string, event: LogEvent): Promise<void> {
  const userId = await uid();
  const payload = eventPayload(event);
  await supabase.from('log_events').upsert({
    user_id: userId, date, goal_id: event.goalId, verb: event.verb,
    payload, time: event.time || null, duration_min: event.durationMin ?? null,
  }, { onConflict: 'user_id,date,goal_id,verb,payload', ignoreDuplicates: true });
}

export async function deleteLogEvent(date: string, event: LogEvent): Promise<void> {
  const userId = await uid();
  const payload = eventPayload(event);
  await supabase.from('log_events').delete()
    .eq('user_id', userId).eq('date', date).eq('goal_id', event.goalId)
    .eq('verb', event.verb).eq('payload', payload);
}

export async function saveNote(date: string, goalId: string, text: string): Promise<void> {
  const userId = await uid();
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (trimmed === '') {
    await supabase.from('log_notes').delete().eq('user_id', userId).eq('date', date).eq('goal_id', goalId);
  } else {
    await supabase.from('log_notes').upsert({
      user_id: userId, date, goal_id: goalId, text: trimmed,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date,goal_id' });
  }
}

function rowToJournal(row: Record<string, unknown>): JournalEntry {
  return {
    id: row['id'] as string, date: row['date'] as string, text: row['text'] as string,
    prompt: (row['prompt'] ?? null) as string | null,
    goalIds: (row['goal_ids'] ?? []) as string[],
    createdAt: row['created_at'] as string,
    editedAt: (row['edited_at'] ?? null) as string | null,
  };
}

export async function listJournal({ from, to, goalId, prompt }: { from?: string; to?: string; goalId?: string; prompt?: string } = {}): Promise<JournalEntry[]> {
  const userId = await uid();
  let q = supabase.from('journal_entries').select('*').eq('user_id', userId)
    .order('date', { ascending: false }).order('created_at', { ascending: false });
  if (from) q = q.gte('date', from);
  if (to) q = q.lte('date', to);
  if (prompt) q = q.eq('prompt', prompt);
  const { data, error } = await q;
  if (error) throw new Error(`listJournal: ${error.message}`);
  let rows = (data || []) as Record<string, unknown>[];
  if (goalId) rows = rows.filter((r) => ((r['goal_ids'] ?? []) as string[]).includes(goalId));
  return rows.map(rowToJournal);
}

export async function saveJournal(entry: Partial<JournalEntry> & { date: string; text: string }): Promise<JournalEntry> {
  const userId = await uid();
  const now = new Date().toISOString();
  const base = {
    user_id: userId, date: entry.date, text: entry.text,
    prompt: entry.prompt ?? null, goal_ids: entry.goalIds ?? [],
  };
  const row = entry.id
    ? { ...base, id: entry.id, edited_at: now }
    : { ...base, created_at: now };
  const { data, error } = await supabase.from('journal_entries').upsert(row as never, { onConflict: 'id' }).select().single();
  if (error) throw new Error(`saveJournal: ${error.message}`);
  return rowToJournal(data as Record<string, unknown>);
}

export async function deleteJournal(id: string): Promise<void> {
  const userId = await uid();
  const { error } = await supabase.from('journal_entries').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(`deleteJournal ${id}: ${error.message}`);
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row['id'] as string, title: row['title'] as string,
    date: row['date'] as string, order: row['order'] as number,
    done: row['done'] as boolean, doneAt: (row['done_at'] ?? null) as string | null,
    dueTime: (row['due_time'] ?? null) as string | null,
    goalId: (row['goal_id'] ?? null) as string | null,
    carriedFrom: (row['carried_from'] ?? null) as string | null,
  };
}

export async function listTasks(date: string): Promise<Task[]> {
  const userId = await uid();
  const { data, error } = await supabase.from('tasks').select('*').eq('user_id', userId).eq('date', date).order('order');
  if (error) throw new Error(`listTasks: ${error.message}`);
  return (data || []).map((r) => rowToTask(r as Record<string, unknown>));
}

export async function addTask(date: string, title: string, goalId: string | null = null): Promise<Task> {
  const userId = await uid();
  const { data: existing } = await supabase.from('tasks').select('order').eq('user_id', userId).eq('date', date).order('order', { ascending: false }).limit(1);
  const nextOrder = (existing as Record<string, unknown>[] | null)?.length ? ((existing as Record<string, unknown>[])[0]['order'] as number + 1) : 0;
  const { data, error } = await supabase.from('tasks').insert({ user_id: userId, title, date, order: nextOrder, goal_id: goalId }).select().single();
  if (error) throw new Error(`addTask: ${error.message}`);
  return rowToTask(data as Record<string, unknown>);
}

export async function setTaskDone(id: string, done: boolean): Promise<Task> {
  const userId = await uid();
  const { data, error } = await supabase.from('tasks').update({ done, done_at: done ? new Date().toISOString() : null }).eq('user_id', userId).eq('id', id).select().single();
  if (error) throw new Error(`setTaskDone ${id}: ${error.message}`);
  return rowToTask(data as Record<string, unknown>);
}

export async function reorderTasks(date: string, ids: string[]): Promise<void> {
  const userId = await uid();
  await Promise.all(ids.map((id, i) =>
    supabase.from('tasks').update({ order: i }).eq('user_id', userId).eq('id', id).eq('date', date)
  ));
}

export async function carryTask(id: string, toDate: string): Promise<Task> {
  const userId = await uid();
  const { data: orig, error: fetchErr } = await supabase.from('tasks').select('*').eq('user_id', userId).eq('id', id).single();
  if (fetchErr) throw new Error(`carryTask fetch: ${fetchErr.message}`);
  const o = orig as Record<string, unknown>;
  const { data, error } = await supabase.from('tasks').insert({
    user_id: userId, title: o['title'], date: toDate, order: 0,
    goal_id: o['goal_id'], carried_from: o['date'],
  }).select().single();
  if (error) throw new Error(`carryTask insert: ${error.message}`);
  return rowToTask(data as Record<string, unknown>);
}

function rowToContract(row: Record<string, unknown>): Contract {
  return {
    id: row['id'] as string, goalId: row['goal_id'] as string,
    change: row['change'] as string, terms: row['terms'] as string,
    signatureSvg: (row['signature_svg'] ?? null) as string | null,
    signedAt: (row['signed_at'] ?? null) as string | null,
    retiredAt: (row['retired_at'] ?? null) as string | null,
    createdAt: row['created_at'] as string,
  };
}

export async function listContracts(): Promise<Contract[]> {
  const userId = await uid();
  const { data, error } = await supabase.from('contracts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw new Error(`listContracts: ${error.message}`);
  return (data || []).map((r) => rowToContract(r as Record<string, unknown>));
}

export async function saveContract(contract: Partial<Contract> & { goalId: string }): Promise<Contract> {
  const userId = await uid();
  const row = {
    user_id: userId, goal_id: contract.goalId,
    change: contract.change ?? '', terms: contract.terms ?? '',
    signature_svg: contract.signatureSvg ?? null,
    signed_at: contract.signedAt ?? null,
    ...(contract.id ? { id: contract.id } : {}),
  };
  const { data, error } = await supabase.from('contracts').upsert(row, { onConflict: 'id' }).select().single();
  if (error) throw new Error(`saveContract: ${error.message}`);
  return rowToContract(data as Record<string, unknown>);
}

export async function retireContract(id: string): Promise<void> {
  const userId = await uid();
  const { error } = await supabase.from('contracts').update({ retired_at: new Date().toISOString() }).eq('user_id', userId).eq('id', id);
  if (error) throw new Error(`retireContract ${id}: ${error.message}`);
}
