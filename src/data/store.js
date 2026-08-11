import { parseGoal, serializeGoal } from "./goalCodec.js";
import { parseLog, serializeLog, serializeEvent } from "./logCodec.js";

let baseUrl = "";  // browser default: same origin

export function __setBaseUrl(u) { baseUrl = u; }

async function req(path, opts = {}) {
  const r = await fetch(`${baseUrl}${path}`, opts);
  return r;
}

export async function listGoals() {
  const r = await req("/api/vault/goals");
  if (!r.ok) return [];
  const { goals } = await r.json();
  const results = await Promise.all(goals.map((id) => getGoal(id)));
  return results.filter(Boolean);
}

export async function getGoal(id) {
  const r = await req(`/api/vault/goals/${encodeURIComponent(id)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`getGoal ${id}: ${r.status}`);
  const md = await r.text();
  return parseGoal(md);
}

export async function saveGoal(goal) {
  const md = serializeGoal(goal);
  const r = await req(`/api/vault/goals/${encodeURIComponent(goal.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "text/markdown" },
    body: md,
  });
  if (!r.ok) throw new Error(`saveGoal ${goal.id}: ${r.status}`);
}

export async function readLog(date) {
  const r = await req(`/api/vault/logs/${encodeURIComponent(date)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`readLog ${date}: ${r.status}`);
  const md = await r.text();
  return parseLog(md);
}

export async function readLogsInRange({ from, to }) {
  const r = await req(
    `/api/vault/logs?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
  if (!r.ok) throw new Error(`readLogsInRange: ${r.status}`);
  const { dates } = await r.json();
  const results = await Promise.all(dates.map((d) => readLog(d)));
  return results.filter(Boolean);
}

export async function deleteLogEvent(date, event) {
  const line = serializeEvent(event);
  const r = await req(`/api/vault/logs/${encodeURIComponent(date)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ line }),
  });
  if (r.status === 404) return; // idempotent — nothing to delete
  if (!r.ok) throw new Error(`deleteLogEvent ${date}: ${r.status}`);
}

export async function appendLog(date, event) {
  const existing = (await readLog(date)) || { date, events: [] };
  const line = serializeEvent(event);
  const already = existing.events.some((e) => serializeEvent(e) === line);
  if (already) return;
  const merged = { date, events: [...existing.events, event] };
  const md = serializeLog(date, merged.events);
  const r = await req(`/api/vault/logs/${encodeURIComponent(date)}`, {
    method: "PUT",
    headers: { "Content-Type": "text/markdown" },
    body: md,
  });
  if (!r.ok) throw new Error(`appendLog ${date}: ${r.status}`);
}
