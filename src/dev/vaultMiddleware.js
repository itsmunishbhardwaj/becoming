import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ID_RE = /^[a-z0-9-]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function send(res, status, body, contentType = "application/json") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

export function createVaultMiddleware({ vaultRoot }) {
  const goalsDir = path.join(vaultRoot, "goals");
  const logsDir = path.join(vaultRoot, "logs");

  return async function vaultMiddleware(req, res, next) {
    const url = req.url || "";
    if (!url.startsWith("/api/vault/")) return next();

    try {
      // GET /api/vault/goals
      if (req.method === "GET" && url === "/api/vault/goals") {
        await mkdir(goalsDir, { recursive: true });
        const files = await readdir(goalsDir);
        const goals = files
          .filter((f) => f.endsWith(".md"))
          .map((f) => f.slice(0, -3));
        return send(res, 200, { goals });
      }

      // GET/PUT /api/vault/goals/:id
      let m = url.match(/^\/api\/vault\/goals\/([^/?#]+)$/);
      if (m && req.method === "GET") {
        const id = decodeURIComponent(m[1]);
        if (!ID_RE.test(id)) return send(res, 400, { error: "bad id" });
        try {
          const md = await readFile(path.join(goalsDir, `${id}.md`), "utf8");
          return send(res, 200, md, "text/markdown");
        } catch (err) {
          if (err.code === "ENOENT") return send(res, 404, { error: "not found" });
          throw err;
        }
      }
      if (m && req.method === "PUT") {
        const id = decodeURIComponent(m[1]);
        if (!ID_RE.test(id)) return send(res, 400, { error: "bad id" });
        await mkdir(goalsDir, { recursive: true });
        const body = await readBody(req);
        await writeFile(path.join(goalsDir, `${id}.md`), body, "utf8");
        return send(res, 200, { ok: true });
      }

      // GET /api/vault/logs?from=&to= (params accepted in any order)
      if (req.method === "GET" && url.startsWith("/api/vault/logs?")) {
        const params = new URL(`http://x${url}`).searchParams;
        const from = params.get("from");
        const to = params.get("to");
        if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to))
          return send(res, 400, { error: "bad range" });
        await mkdir(logsDir, { recursive: true });
        const files = await readdir(logsDir);
        const dates = files
          .filter((f) => f.endsWith(".md"))
          .map((f) => f.slice(0, -3))
          .filter((d) => DATE_RE.test(d) && d >= from && d <= to)
          .sort();
        return send(res, 200, { dates });
      }

      // GET/PUT /api/vault/logs/:date
      m = url.match(/^\/api\/vault\/logs\/([^/?#]+)$/);
      if (m && req.method === "GET") {
        const date = decodeURIComponent(m[1]);
        if (!DATE_RE.test(date)) return send(res, 400, { error: "bad date" });
        try {
          const md = await readFile(path.join(logsDir, `${date}.md`), "utf8");
          return send(res, 200, md, "text/markdown");
        } catch (err) {
          if (err.code === "ENOENT") return send(res, 404, { error: "not found" });
          throw err;
        }
      }
      if (m && req.method === "PUT") {
        const date = decodeURIComponent(m[1]);
        if (!DATE_RE.test(date)) return send(res, 400, { error: "bad date" });
        await mkdir(logsDir, { recursive: true });
        const body = await readBody(req);
        await writeFile(path.join(logsDir, `${date}.md`), body, "utf8");
        return send(res, 200, { ok: true });
      }
      if (m && req.method === "DELETE") {
        const date = decodeURIComponent(m[1]);
        if (!DATE_RE.test(date)) return send(res, 400, { error: "bad date" });
        const file = path.join(logsDir, `${date}.md`);
        let src;
        try {
          src = await readFile(file, "utf8");
        } catch (err) {
          if (err.code === "ENOENT") return send(res, 404, { error: "not found" });
          throw err;
        }
        const body = await readBody(req);
        const { line } = JSON.parse(body || "{}");
        if (typeof line !== "string") return send(res, 400, { error: "line required" });
        const lines = src.split("\n");
        const filtered = lines.filter((l) => l !== line);
        const next = filtered.join("\n");
        if (next !== src) await writeFile(file, next, "utf8");
        return send(res, 200, { ok: true });
      }

      return send(res, 404, { error: "no route" });
    } catch (err) {
      return send(res, 500, { error: String(err.message || err) });
    }
  };
}
