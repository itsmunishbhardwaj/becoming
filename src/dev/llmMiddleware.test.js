import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "node:http";
import { createLlmMiddleware } from "./llmMiddleware.js";

let upstream;
let upstreamPort;
let lastUpstreamReq;

beforeAll(async () => {
  upstream = createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      lastUpstreamReq = {
        url: req.url,
        method: req.method,
        auth: req.headers["authorization"],
        body: JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"),
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        choices: [{ message: { role: "assistant", content: "OK from upstream" } }],
      }));
    });
  });
  await new Promise((r) => upstream.listen(0, r));
  upstreamPort = upstream.address().port;
});

afterAll(async () => {
  await new Promise((r) => upstream.close(r));
});

function mock(method, url, body) {
  const req = {
    method, url,
    on(e, cb) {
      if (e === "data" && body) cb(Buffer.from(body));
      if (e === "end") cb();
    },
  };
  const state = { status: 200, body: "" };
  const res = {
    setHeader() {},
    writeHead(s) { state.status = s; },
    end(payload) { state.body = payload ?? ""; },
  };
  return { req, res, state };
}

function makeMw({ withKey = true } = {}) {
  return createLlmMiddleware({
    env: {
      LLM_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
      LLM_API_KEY: withKey ? "test-key" : undefined,
      LLM_MODEL: "test-model",
    },
  });
}

describe("GET /api/llm/status", () => {
  it("reports configured=true when key is set", async () => {
    const mw = makeMw({ withKey: true });
    const { req, res, state } = mock("GET", "/api/llm/status");
    await new Promise((r) => mw(req, res, r));
    expect(state.status).toBe(200);
    expect(JSON.parse(state.body)).toEqual({ configured: true });
  });

  it("reports configured=false when key is missing", async () => {
    const mw = makeMw({ withKey: false });
    const { req, res, state } = mock("GET", "/api/llm/status");
    await new Promise((r) => mw(req, res, r));
    expect(JSON.parse(state.body)).toEqual({ configured: false });
  });
});

describe("POST /api/llm", () => {
  it("proxies messages+model to upstream and returns { content }", async () => {
    const mw = makeMw();
    const body = JSON.stringify({
      messages: [{ role: "user", content: "hi" }],
      model: "override-model",
      temperature: 0.3,
    });
    const { req, res, state } = mock("POST", "/api/llm", body);
    await new Promise((r) => mw(req, res, r));
    expect(state.status).toBe(200);
    expect(JSON.parse(state.body)).toEqual({ content: "OK from upstream" });
    expect(lastUpstreamReq.url).toBe("/chat/completions");
    expect(lastUpstreamReq.auth).toBe("Bearer test-key");
    expect(lastUpstreamReq.body.model).toBe("override-model");
    expect(lastUpstreamReq.body.temperature).toBe(0.3);
    expect(lastUpstreamReq.body.messages).toEqual([{ role: "user", content: "hi" }]);
  });

  it("uses env default model when body omits it", async () => {
    const mw = makeMw();
    const body = JSON.stringify({ messages: [{ role: "user", content: "hi" }] });
    const { req, res } = mock("POST", "/api/llm", body);
    await new Promise((r) => mw(req, res, r));
    expect(lastUpstreamReq.body.model).toBe("test-model");
    expect(lastUpstreamReq.body.temperature).toBe(0.7);
  });

  it("returns 503 when no API key is configured", async () => {
    const mw = makeMw({ withKey: false });
    const body = JSON.stringify({ messages: [{ role: "user", content: "hi" }] });
    const { req, res, state } = mock("POST", "/api/llm", body);
    await new Promise((r) => mw(req, res, r));
    expect(state.status).toBe(503);
    expect(JSON.parse(state.body).error).toMatch(/not configured/i);
  });
});

describe("upstream error handling", () => {
  it("returns 502 when upstream is unreachable", async () => {
    const mw = createLlmMiddleware({
      env: {
        LLM_BASE_URL: "http://127.0.0.1:1", // unreachable
        LLM_API_KEY: "test-key",
        LLM_MODEL: "test-model",
      },
    });
    const body = JSON.stringify({ messages: [{ role: "user", content: "hi" }] });
    const { req, res, state } = mock("POST", "/api/llm", body);
    await new Promise((r) => mw(req, res, r));
    expect(state.status).toBe(502);
    expect(JSON.parse(state.body).error).toBeTruthy();
  });
});
