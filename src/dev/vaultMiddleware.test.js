import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createVaultMiddleware } from "./vaultMiddleware.js";

/** Wraps mw(req, res, next) resolving when res.end fires OR next is called. */
function run(mw, req, res) {
  return new Promise((resolve, reject) => {
    const origEnd = res.end.bind(res);
    res.end = (payload) => { origEnd(payload); resolve(); };
    mw(req, res, resolve).catch(reject);
  });
}

function mockReqRes(method, url, body) {
  const req = {
    method,
    url,
    on(event, cb) {
      if (event === "data" && body) cb(Buffer.from(body));
      if (event === "end") cb();
    },
  };
  let status = 200;
  let sent = "";
  let headers = {};
  const res = {
    statusCode: 200,
    setHeader(k, v) { headers[k] = v; },
    writeHead(s, h) { status = s; Object.assign(headers, h || {}); },
    end(payload) { sent = payload ?? ""; },
  };
  Object.defineProperty(res, "statusCode", {
    get() { return status; },
    set(v) { status = v; },
  });
  return { req, res, get status() { return status; }, get body() { return sent; }, headers };
}

let dir;
let mw;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "vault-"));
  await mkdir(path.join(dir, "goals"), { recursive: true });
  await mkdir(path.join(dir, "logs"), { recursive: true });
  mw = createVaultMiddleware({ vaultRoot: dir });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("GET /api/vault/goals", () => {
  it("lists ids from goals/*.md", async () => {
    await writeFile(path.join(dir, "goals", "wake-6am.md"), "x");
    await writeFile(path.join(dir, "goals", "cadence-reset.md"), "y");
    let captured = "";
    const req = { method: "GET", url: "/api/vault/goals",
      on(e, cb) { if (e === "end") cb(); } };
    const res = {
      statusCode: 200,
      setHeader() {},
      writeHead(s) { this.statusCode = s; },
      end(payload) { captured = payload ?? ""; },
    };
    await run(mw, req, res);
    const parsed = JSON.parse(captured);
    expect(parsed.goals.sort()).toEqual(["cadence-reset", "wake-6am"]);
  });
});

describe("PUT then GET goal round-trip", () => {
  it("writes and reads back exact bytes", async () => {
    const md = "---\nid: x\n---\nbody\n";
    const put = mockReqRes("PUT", "/api/vault/goals/x", md);
    await run(mw, put.req, put.res);
    const onDisk = await readFile(path.join(dir, "goals", "x.md"), "utf8");
    expect(onDisk).toBe(md);
  });
});

describe("path escape guard", () => {
  it("rejects ../ in goal id", async () => {
    let statusOut = 0;
    const req = { method: "PUT", url: "/api/vault/goals/..%2Fetc",
      on(e, cb) { if (e === "data") cb(Buffer.from("x")); if (e === "end") cb(); } };
    const res = {
      statusCode: 200,
      setHeader() {},
      writeHead(s) { statusOut = s; this.statusCode = s; },
      end() {},
    };
    await run(mw, req, res);
    expect(statusOut).toBe(400);
  });
});

describe("GET /api/vault/logs?from=&to= reversed param order", () => {
  it("returns same dates as normal order", async () => {
    await writeFile(path.join(dir, "logs", "2026-08-05.md"), "a");
    await writeFile(path.join(dir, "logs", "2026-08-15.md"), "b");

    const normalOrder = mockReqRes("GET", "/api/vault/logs?from=2026-08-01&to=2026-08-31");
    await run(mw, normalOrder.req, normalOrder.res);
    const normalResult = JSON.parse(normalOrder.body);

    const reversedOrder = mockReqRes("GET", "/api/vault/logs?to=2026-08-31&from=2026-08-01");
    await run(mw, reversedOrder.req, reversedOrder.res);
    const reversedResult = JSON.parse(reversedOrder.body);

    expect(reversedResult.dates).toEqual(normalResult.dates);
    expect(reversedResult.dates).toEqual(["2026-08-05", "2026-08-15"]);
  });
});

describe("GET /api/vault/goals/:id ENOENT", () => {
  it("returns 404 for a nonexistent goal", async () => {
    const r = mockReqRes("GET", "/api/vault/goals/nonexistent-goal");
    await run(mw, r.req, r.res);
    expect(r.status).toBe(404);
    expect(JSON.parse(r.body)).toEqual({ error: "not found" });
  });
});
