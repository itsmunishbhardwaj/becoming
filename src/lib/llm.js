let baseUrl = "";

export function __setBaseUrl(u) { baseUrl = u; }

async function req(path, opts = {}) {
  const url = `${baseUrl}${path}`;
  return fetch(url, opts);
}

export async function chat(messages, opts = {}) {
  const body = { messages };
  if (opts.model != null) body.model = opts.model;
  if (opts.temperature != null) body.temperature = opts.temperature;
  const r = await req("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!r.ok) throw new Error(`llm: ${r.status} ${await r.text().catch(() => "")}`);
  const data = await r.json();
  return data.content;
}

export async function isConfigured() {
  try {
    const r = await req("/api/llm/status");
    if (!r.ok) return false;
    const data = await r.json();
    return Boolean(data.configured);
  } catch {
    return false;
  }
}
