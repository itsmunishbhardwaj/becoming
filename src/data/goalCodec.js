import {
  parseFrontMatter,
  serializeFrontMatter,
  parseSections,
  serializeSections,
} from "../lib/md.js";

const SECTION_ORDER = [
  "Ambition",
  "Rounds",
  "How we get there",
  "Right direction",
  "Wrong direction",
  "No movement",
];

function parseTargetCell(cell, type) {
  const v = cell.trim();
  if (type === "cadence") {
    const m = v.match(/^every\s+(\d+)d$/i);
    return m ? { intervalDays: Number(m[1]) } : { intervalDays: 0 };
  }
  if (type === "simple") return null;
  return v;
}

function serializeTargetCell(val, type) {
  if (type === "cadence") return `every ${val.intervalDays}d`;
  if (type === "simple") return "—";
  return String(val);
}

function parseRoundsTable(md, type) {
  const rows = md
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"));
  const dataRows = rows.filter(
    (r) => !/^\|\s*-+/.test(r) && !/^\|\s*#\s*\|/i.test(r)
  );
  return dataRows.map((r) => {
    const cells = r.split("|").slice(1, -1).map((c) => c.trim());
    return {
      n: Number(cells[0]),
      targetValue: parseTargetCell(cells[1], type),
      startDate: cells[2],
      endDate: cells[3],
    };
  });
}

function serializeRoundsTable(rounds, type) {
  const header = `| # | Target | Start | End |\n|---|--------|-------|-----|`;
  const body = rounds
    .map(
      (r) =>
        `| ${r.n} | ${serializeTargetCell(r.targetValue, type)} | ${r.startDate} | ${r.endDate} |`
    )
    .join("\n");
  return `${header}\n${body}\n`;
}

function parseBullets(md) {
  return md
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim());
}

function serializeBullets(items) {
  return items.map((i) => `- ${i}`).join("\n") + "\n";
}

function fmEncode(v) {
  if (typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v)) return JSON.stringify(v);
  return v;
}

export function parseGoal(src) {
  const { data, body } = parseFrontMatter(src);
  const sec = parseSections(body);
  return {
    id: data.id,
    name: data.name,
    cat: data.cat,
    type: data.type,
    state: data.state,
    baseline: data.baseline,
    target: data.target,
    endDate: data.endDate,
    currentRound: data.currentRound,
    createdAt: data.createdAt,
    ambition: (sec.Ambition || "").trim(),
    rounds: parseRoundsTable(sec.Rounds || "", data.type),
    howWeGetThere: (sec["How we get there"] || "").trim(),
    indicators: {
      right: parseBullets(sec["Right direction"] || ""),
      wrong: parseBullets(sec["Wrong direction"] || ""),
      stall: parseBullets(sec["No movement"] || ""),
    },
  };
}

export function serializeGoal(g) {
  const fmData = {
    id: g.id,
    name: g.name,
    cat: g.cat,
    type: g.type,
    state: g.state,
    baseline: fmEncode(g.baseline),
    target: fmEncode(g.target),
    endDate: g.endDate,
    currentRound: g.currentRound,
    createdAt: g.createdAt,
  };
  const sections = {
    Ambition: g.ambition + "\n",
    Rounds: serializeRoundsTable(g.rounds, g.type),
    "How we get there": g.howWeGetThere + "\n",
    "Right direction": serializeBullets(g.indicators.right),
    "Wrong direction": serializeBullets(g.indicators.wrong),
    "No movement": serializeBullets(g.indicators.stall),
  };
  const body = serializeSections(sections, SECTION_ORDER);
  return serializeFrontMatter(fmData, body);
}
