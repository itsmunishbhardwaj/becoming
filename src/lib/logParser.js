const WAKE_RE = /^(?:wake(?:\s+at)?|woke)\s+(\d{1,2}:\d{2})\s*$/i;
const SESSION_TIME_DUR = /^(?:session|jerked?\s*off|masturbat\w*)\s+(\d{1,2}:\d{2})\s*·?\s*(\d+)\s*min\s*$/i;
const SESSION_DUR_ONLY = /^(?:session|jerked?\s*off|masturbat\w*)\s+(\d+)\s*min\s*$/i;

export function parseLogText(text) {
  if (!text) return [];
  const out = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    let m;
    if ((m = line.match(WAKE_RE))) {
      out.push({ verb: "wake", time: m[1], raw });
      continue;
    }
    if ((m = line.match(SESSION_TIME_DUR))) {
      out.push({ verb: "session", time: m[1], durationMin: Number(m[2]), raw });
      continue;
    }
    if ((m = line.match(SESSION_DUR_ONLY))) {
      out.push({ verb: "session", durationMin: Number(m[1]), raw });
      continue;
    }
    // unrecognized — skip silently
  }
  return out;
}
