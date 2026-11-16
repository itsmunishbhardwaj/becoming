import { parseFrontMatter, serializeFrontMatter, parseSections, serializeSections } from './md';
import type { FrontMatterValue } from './md';
import type { Goal, Round } from './types';

const SECTION_ORDER = [
  'Ambition', 'Rounds', 'How we get there',
  'Right direction', 'Wrong direction', 'No movement',
];

function parseTargetCell(cell: string, type: string): string | { intervalDays: number } | null {
  const v = cell.trim();
  const cadenceMatch = v.match(/^every\s+(\d+)d$/i);
  if (cadenceMatch) return { intervalDays: Number(cadenceMatch[1]) };
  if (type === 'simple' || v === '—') return null;
  return v;
}

function serializeTargetCell(val: Round['targetValue'], type: string): string {
  if (type === 'cadence' && val && typeof val === 'object' && 'intervalDays' in val) return `every ${val.intervalDays}d`;
  if (type === 'simple') return '—';
  return String(val);
}

function parseRoundsTable(md: string, type: string): Round[] {
  const rows = md.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|'));
  const dataRows = rows.filter((r) => !/^\|\s*-+/.test(r) && !/^\|\s*#\s*\|/i.test(r));
  return dataRows.map((r) => {
    const cells = r.split('|').slice(1, -1).map((c) => c.trim());
    return {
      n: Number(cells[0]),
      targetValue: parseTargetCell(cells[1], type),
      startDate: cells[2],
      endDate: cells[3],
    };
  });
}

function serializeRoundsTable(rounds: Round[], type: string): string {
  const header = `| # | Target | Start | End |\n|---|--------|-------|-----|`;
  const body = rounds
    .map((r) => `| ${r.n} | ${serializeTargetCell(r.targetValue, type)} | ${r.startDate} | ${r.endDate} |`)
    .join('\n');
  return `${header}\n${body}\n`;
}

function parseBullets(md: string): string[] {
  return md.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim());
}

function serializeBullets(items: string[]): string {
  return items.map((i) => `- ${i}`).join('\n') + '\n';
}

function fmEncode(v: unknown): unknown {
  if (typeof v === 'string' && /^\d{1,2}:\d{2}$/.test(v)) return JSON.stringify(v);
  return v;
}

function normalizeStoredType(raw: string): Goal['type'] {
  if (raw === 'habit') return 'habit';
  return 'tracker';
}

export function parseGoal(src: string): Goal {
  const { data, body } = parseFrontMatter(src);
  const sec = parseSections(body);
  const rawType = data['type'] as string;
  return {
    id: data['id'] as string,
    name: data['name'] as string,
    cat: data['cat'] as string,
    ...(data['color'] ? { color: data['color'] as string } : {}),
    type: normalizeStoredType(rawType),
    state: data['state'] as Goal['state'],
    baseline: (data['baseline'] ?? null) as Goal['baseline'],
    target: (data['target'] ?? null) as Goal['target'],
    endDate: (data['endDate'] ?? null) as string | null,
    currentRound: data['currentRound'] as number,
    createdAt: data['createdAt'] as string,
    ambition: (sec['Ambition'] || '').trim(),
    rounds: parseRoundsTable(sec['Rounds'] || '', rawType),
    howWeGetThere: (sec['How we get there'] || '').trim(),
    indicators: {
      right: parseBullets(sec['Right direction'] || ''),
      wrong: parseBullets(sec['Wrong direction'] || ''),
      stall: parseBullets(sec['No movement'] || ''),
    },
  };
}

function codecType(g: Goal): string {
  if (g.type === 'habit') return 'habit';
  if (typeof g.baseline === 'string') return 'wake';
  if (g.baseline != null && typeof g.baseline === 'object' && 'intervalDays' in g.baseline) return 'cadence';
  return 'simple';
}

export function serializeGoal(g: Goal): string {
  const ct = codecType(g);
  const storedType = g.type === 'habit' ? 'habit' : 'tracker';
  const fmData = {
    id: g.id, name: g.name, cat: g.cat,
    ...(g.color ? { color: g.color } : {}),
    type: storedType,
    state: g.state,
    baseline: fmEncode(g.baseline),
    target: fmEncode(g.target),
    endDate: g.endDate,
    currentRound: g.currentRound,
    createdAt: g.createdAt,
  };
  const sections: Record<string, string> = {
    'Ambition': g.ambition + '\n',
    'Rounds': serializeRoundsTable(g.rounds, ct),
    'How we get there': g.howWeGetThere + '\n',
    'Right direction': serializeBullets(g.indicators.right),
    'Wrong direction': serializeBullets(g.indicators.wrong),
    'No movement': serializeBullets(g.indicators.stall),
  };
  const body = serializeSections(sections, SECTION_ORDER);
  return serializeFrontMatter(fmData as Record<string, FrontMatterValue>, body);
}
