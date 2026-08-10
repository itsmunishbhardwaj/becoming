const FM_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

function coerce(raw) {
  const v = raw.trim();
  if (v === "") return "";
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v[0] === "{" || v[0] === "[" || v[0] === '"') {
    try { return JSON.parse(v); } catch { /* fall through */ }
  }
  return v;
}

export function parseFrontMatter(src) {
  const m = src.match(FM_RE);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1);
    data[key] = coerce(val);
  }
  return { data, body: m[2] };
}

function encode(v) {
  if (v === null) return "null";
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

export function serializeFrontMatter(data, body) {
  const lines = Object.entries(data).map(([k, v]) => `${k}: ${encode(v)}`);
  return `---\n${lines.join("\n")}\n---\n${body}`;
}

const SECTION_RE = /^## (.+)$/gm;

export function parseSections(body) {
  const out = {};
  const matches = [...body.matchAll(SECTION_RE)];
  for (let i = 0; i < matches.length; i++) {
    const heading = matches[i][1].trim();
    const start = matches[i].index + matches[i][0].length + 1;
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
    out[heading] = body.slice(start, end);
  }
  return out;
}

export function serializeSections(sections, order) {
  return order
    .filter((h) => sections[h] != null)
    .map((h) => `## ${h}\n${sections[h].endsWith("\n") ? sections[h] : sections[h] + "\n"}`)
    .join("\n");
}
