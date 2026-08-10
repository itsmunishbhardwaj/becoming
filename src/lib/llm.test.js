import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createServer } from "node:http";
import * as llm from "./llm.js";

let server;
let port;
let received;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === "/api/llm/status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ configured: true }));
    }
    if (req.url === "/api/llm" && req.method === "POST") {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        received = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ content: "hello back" }));
      });
      return;
    }
    // Any other POST returns 500
    if (req.method === "POST") {
      res.writeHead(500);
      return res.end("server error");
    }
    res.writeHead(404);
    res.end("not found");
  });
  await new Promise((r) => server.listen(0, r));
  port = server.address().port;
  llm.__setBaseUrl(`http://127.0.0.1:${port}`);
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
});

beforeEach(() => { received = null; });

describe("chat()", () => {
  it("posts messages + opts to /api/llm and returns content string", async () => {
    const out = await llm.chat(
      [{ role: "user", content: "hi" }],
      { model: "test-model", temperature: 0.2 }
    );
    expect(out).toBe("hello back");
    expect(received.messages).toEqual([{ role: "user", content: "hi" }]);
    expect(received.model).toBe("test-model");
    expect(received.temperature).toBe(0.2);
  });
});

describe("isConfigured()", () => {
  it("returns true when server reports configured", async () => {
    expect(await llm.isConfigured()).toBe(true);
  });
});

describe("chat() error path", () => {
  it("throws when the proxy returns non-2xx", async () => {
    const orig = `http://127.0.0.1:${port}`;
    llm.__setBaseUrl(`http://127.0.0.1:${port}/bad`);
    await expect(
      llm.chat([{ role: "user", content: "x" }])
    ).rejects.toThrow(/llm/i);
    llm.__setBaseUrl(orig);
  });
});
