import { parseFrontMatter, serializeFrontMatter } from "../lib/md.js";

// Payload is optional so payload-less verbs (`- done → [[goal]]`) parse.
const LINE_RE = /^-\s+(\w+)(?:\s+(.+?))?\s*→\s+\[\[([^\]]+)\]\]\s*$/;

function parsePayload(verb, payload) {
  const out = { verb, payload: payload || "", goalId: null };
  if (verb === "wake") {
    const m = payload.match(/^(\d{1,2}:\d{2})$/);
    if (m) out.time = m[1];
  } else if (verb === "session") {
    let m;
    if ((m = payload.match(/^(\d{1,2}:\d{2})\s*·\s*(\d+)\s*min$/))) {
      out.time = m[1];
      out.durationMin = Number(m[2]);
    } else if ((m = payload.match(/^(\d+)\s*min$/))) {
      out.durationMin = Number(m[1]);
    }
  }
  return out;
}

function derivePayload(e) {
  if (e.verb === "wake" && e.time) return e.time;
  if (e.verb === "session") {
    if (e.time && e.durationMin != null) return `${e.time} · ${e.durationMin}min`;
    if (e.durationMin != null) return `${e.durationMin}min`;
    if (e.time) return e.time;
  }
  return e.payload ?? "";
}

export function serializeEvent(e) {
  const payload = e.payload ?? derivePayload(e);
  return payload
    ? `- ${e.verb} ${payload} → [[${e.goalId}]]`
    : `- ${e.verb} → [[${e.goalId}]]`;
}

export function parseLog(src) {
  const { data, body } = parseFrontMatter(src);
  const events = [];
  for (const raw of body.split("\n")) {
    const m = raw.match(LINE_RE);
    if (!m) continue;
    const [, verb, payload, goalId] = m;
    events.push({ ...parsePayload(verb, payload), goalId });
  }
  return { date: data.date, events };
}

export function serializeLog(date, events) {
  const body = "\n" + events.map(serializeEvent).join("\n") + "\n";
  return serializeFrontMatter({ date }, body);
}
