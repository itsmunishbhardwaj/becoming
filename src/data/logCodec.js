import { parseFrontMatter, serializeFrontMatter } from "../lib/md.js";

const LINE_RE = /^-\s+(\w+)\s+(.+?)\s+→\s+\[\[([^\]]+)\]\]\s*$/;

function parsePayload(verb, payload) {
  const out = { verb, payload, goalId: null };
  if (verb === "wake") {
    const m = payload.match(/^(\d{1,2}:\d{2})$/);
    if (m) out.time = m[1];
  } else if (verb === "session") {
    const m = payload.match(/^(\d{1,2}:\d{2})\s*·\s*(\d+)\s*min$/);
    if (m) {
      out.time = m[1];
      out.durationMin = Number(m[2]);
    }
  }
  return out;
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
  const body =
    "\n" +
    events
      .map((e) => `- ${e.verb} ${e.payload} → [[${e.goalId}]]`)
      .join("\n") +
    "\n";
  return serializeFrontMatter({ date }, body);
}
