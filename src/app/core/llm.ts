let baseUrl = '';

export function __setBaseUrl(u: string): void { baseUrl = u; }

async function req(path: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(`${baseUrl}${path}`, opts);
}

export async function chat(
  messages: { role: string; content: string }[],
  opts: { model?: string; temperature?: number; signal?: AbortSignal } = {},
): Promise<string> {
  const body: Record<string, unknown> = { messages };
  if (opts.model != null) body['model'] = opts.model;
  if (opts.temperature != null) body['temperature'] = opts.temperature;
  const r = await req('/api/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!r.ok) throw new Error(`llm: ${r.status} ${await r.text().catch(() => '')}`);
  const data = await r.json() as { content: string };
  return data.content;
}

export async function isConfigured(): Promise<boolean> {
  try {
    const r = await req('/api/llm/status');
    if (!r.ok) return false;
    const data = await r.json() as { configured: boolean };
    return Boolean(data.configured);
  } catch {
    return false;
  }
}
