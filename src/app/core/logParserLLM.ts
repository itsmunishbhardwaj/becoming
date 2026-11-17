import { parseLogText } from './logParser';
import type { Goal, LogEvent } from './types';

const SYSTEM = 'You are a log-line extractor for a personal-goals app. Given a free-text log entry and a list of active goals, return a JSON array of events. Each event has: {"verb":"wake"|"session","time"?:"HH:MM","durationMin"?:number,"raw":"<the original line>"}. Include only lines that clearly log a wake or session event. Skip commentary. Reply with ONLY the JSON array — no prose, no markdown, no code fences.';

function userPrompt(text: string, goals: Goal[]): string {
  const activeGoals = goals
    .filter((g) => g.state === 'active' || g.state === 'drift')
    .map((g) => `- ${g.id} (type: ${g.type})`)
    .join('\n');
  return `Active goals:\n${activeGoals || '(none)'}\n\nFree text:\n""" ${text} """`;
}

function parseJSONArray(raw: string | null): LogEvent[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    for (const evt of parsed) {
      if (!evt || (evt.verb !== 'wake' && evt.verb !== 'session')) return null;
      if (typeof evt.raw !== 'string') return null;
    }
    return parsed as LogEvent[];
  } catch {
    return null;
  }
}

export async function parseLogSmart({
  text,
  goals,
  llmChat,
  isConfigured,
}: {
  text: string;
  goals: Goal[];
  llmChat?: ((messages: { role: string; content: string }[]) => Promise<string>) | null;
  isConfigured?: () => Promise<boolean> | boolean;
}): Promise<LogEvent[]> {
  const configured = await Promise.resolve(isConfigured ? isConfigured() : false).catch(() => false);
  if (!configured || !llmChat) return parseLogText(text);
  try {
    const reply = await llmChat([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userPrompt(text, goals) },
    ]);
    const events = parseJSONArray(reply);
    return events || parseLogText(text);
  } catch {
    return parseLogText(text);
  }
}
