import { parseFrontMatter, serializeFrontMatter } from './md';
import type { Log, LogEvent } from './types';

const LINE_RE = /^-\s+(\w+)(?:\s+(.+?))?\s*→\s+\[\[([^\]]+)\]\]\s*$/;

function parsePayload(verb: string, payload: string | undefined): Omit<LogEvent, 'goalId'> {
  const out: Omit<LogEvent, 'goalId'> = { verb, payload: payload || '' };
  if (verb === 'wake') {
    const m = (payload || '').match(/^(\d{1,2}:\d{2})$/);
    if (m) (out as LogEvent).time = m[1];
  } else if (verb === 'session') {
    let m;
    if ((m = (payload || '').match(/^(\d{1,2}:\d{2})\s*·\s*(\d+)\s*min$/))) {
      (out as LogEvent).time = m[1];
      (out as LogEvent).durationMin = Number(m[2]);
    } else if ((m = (payload || '').match(/^(\d+)\s*min$/))) {
      (out as LogEvent).durationMin = Number(m[1]);
    }
  }
  return out;
}

function derivePayload(e: LogEvent): string {
  if (e.payload != null) return e.payload;
  if (e.verb === 'wake' && e.time) return e.time;
  if (e.verb === 'session') {
    if (e.time && e.durationMin != null) return `${e.time} · ${e.durationMin}min`;
    if (e.durationMin != null) return `${e.durationMin}min`;
    if (e.time) return e.time;
  }
  return '';
}

export function serializeEvent(e: LogEvent): string {
  const payload = e.payload ?? derivePayload(e);
  return payload
    ? `- ${e.verb} ${payload} → [[${e.goalId}]]`
    : `- ${e.verb} → [[${e.goalId}]]`;
}

export function parseLog(src: string): Log {
  const { data, body } = parseFrontMatter(src);
  const events: LogEvent[] = [];
  for (const raw of body.split('\n')) {
    const m = raw.match(LINE_RE);
    if (!m) continue;
    const [, verb, payload, goalId] = m;
    events.push({ ...parsePayload(verb, payload), goalId });
  }
  const notes =
    data['notes'] && typeof data['notes'] === 'object' && !Array.isArray(data['notes'])
      ? (data['notes'] as Record<string, string>)
      : {};
  return { date: data['date'] as string, events, notes };
}

export function serializeLog(date: string, events: LogEvent[], notes: Record<string, string>): string {
  const body = '\n' + events.map(serializeEvent).join('\n') + '\n';
  const cleaned: Record<string, string> = {};
  if (notes && typeof notes === 'object') {
    for (const [k, v] of Object.entries(notes)) {
      if (typeof v === 'string' && v.trim() !== '') cleaned[k] = v;
    }
  }
  const data: Record<string, unknown> = { date };
  if (Object.keys(cleaned).length > 0) data['notes'] = cleaned;
  return serializeFrontMatter(data as Record<string, string | number | boolean | null | object>, body);
}
