function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

export function createLlmMiddleware({ env = process.env } = {}) {
  const baseUrl = env.LLM_BASE_URL || "https://openrouter.ai/api/v1";
  const model = env.LLM_MODEL || "anthropic/claude-3.5-sonnet";

  return async function llmMiddleware(req, res, next) {
    const url = req.url || "";

    if (req.method === "GET" && url === "/api/llm/status") {
      return send(res, 200, { configured: Boolean(env.LLM_API_KEY) });
    }

    if (req.method === "POST" && url === "/api/llm") {
      if (!env.LLM_API_KEY) {
        return send(res, 503, { error: "LLM not configured (LLM_API_KEY missing)" });
      }
      try {
        const raw = await readBody(req);
        const { messages, model: overrideModel, temperature } = JSON.parse(raw || "{}");
        if (!Array.isArray(messages)) {
          return send(res, 400, { error: "messages must be an array" });
        }
        const upstream = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.LLM_API_KEY}`,
          },
          body: JSON.stringify({
            model: overrideModel || model,
            messages,
            temperature: temperature ?? 0.7,
          }),
        });
        if (!upstream.ok) {
          const errBody = await upstream.text().catch(() => "");
          console.warn(`[llm] upstream ${upstream.status}: ${errBody.slice(0, 400)}`);
          return send(res, 502, { error: `upstream ${upstream.status}` });
        }
        const data = await upstream.json();
        const content = data?.choices?.[0]?.message?.content ?? "";
        return send(res, 200, { content });
      } catch (err) {
        return send(res, 502, { error: String(err?.message || err) });
      }
    }

    return next();
  };
}
