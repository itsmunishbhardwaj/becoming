import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createServer } from "node:http";
import path from "node:path";
import { createVaultMiddleware } from "../dev/vaultMiddleware.js";
import * as store from "./store.js";

let dir;
let server;
let port;

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "store-"));
  await mkdir(path.join(dir, "goals"), { recursive: true });
  await mkdir(path.join(dir, "logs"), { recursive: true });
  const mw = createVaultMiddleware({ vaultRoot: dir });
  server = createServer((req, res) => mw(req, res, () => {
    res.writeHead(404); res.end();
  }));
  await new Promise((r) => server.listen(0, r));
  port = server.address().port;
  store.__setBaseUrl(`http://127.0.0.1:${port}`);
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  await rm(dir, { recursive: true, force: true });
});

beforeEach(async () => {
  // clear vault between tests
  for (const sub of ["goals", "logs"]) {
    await rm(path.join(dir, sub), { recursive: true, force: true });
    await mkdir(path.join(dir, sub), { recursive: true });
  }
});

const SAMPLE_GOAL = `---
id: wake-6am
name: Wake at 6:00 AM
cat: health
type: wake
state: active
baseline: "08:30"
target: "06:00"
endDate: 2026-12-31
currentRound: 1
createdAt: 2026-08-10
---
## Ambition
Own the morning.

## Rounds
| # | Target | Start | End |
|---|--------|-------|-----|
| 1 | 08:00 | 2026-08-10 | 2026-08-24 |

## How we get there
Small steps.

## Right direction
- Wake near target

## Wrong direction
- Snoozing 45+ min

## No movement
- No wake logs for a week
`;

describe("listGoals + getGoal", () => {
  it("returns empty when vault has no goals", async () => {
    expect(await store.listGoals()).toEqual([]);
  });

  it("lists and reads a goal", async () => {
    await writeFile(path.join(dir, "goals", "wake-6am.md"), SAMPLE_GOAL);
    const goals = await store.listGoals();
    expect(goals).toHaveLength(1);
    expect(goals[0].id).toBe("wake-6am");
    expect(goals[0].ambition).toBe("Own the morning.");
    expect(await store.getGoal("wake-6am")).toEqual(goals[0]);
    expect(await store.getGoal("missing")).toBe(null);
  });
});

describe("saveGoal", () => {
  it("writes a parseable .md file", async () => {
    const goal = {
      id: "wake-6am",
      name: "Wake at 6:00 AM",
      cat: "health",
      type: "wake",
      state: "active",
      baseline: "08:30",
      target: "06:00",
      endDate: "2026-12-31",
      currentRound: 1,
      createdAt: "2026-08-10",
      ambition: "Own the morning.",
      rounds: [{ n: 1, targetValue: "08:00", startDate: "2026-08-10", endDate: "2026-08-24" }],
      howWeGetThere: "Small steps.",
      indicators: { right: ["Wake near target"], wrong: ["Snoozing 45+ min"], stall: ["No wake logs for a week"] },
    };
    await store.saveGoal(goal);
    const raw = await readFile(path.join(dir, "goals", "wake-6am.md"), "utf8");
    expect(raw).toContain("id: wake-6am");
    expect(raw).toContain("## Ambition");
    const back = await store.getGoal("wake-6am");
    expect(back).toEqual(goal);
  });
});

describe("appendLog", () => {
  it("creates the log file on first append", async () => {
    await store.appendLog("2026-08-10", {
      verb: "wake", payload: "07:12", goalId: "wake-6am", time: "07:12",
    });
    const log = await store.readLog("2026-08-10");
    expect(log.events).toHaveLength(1);
    expect(log.events[0].verb).toBe("wake");
  });

  it("is idempotent by exact line match", async () => {
    const evt = { verb: "wake", payload: "07:12", goalId: "wake-6am", time: "07:12" };
    await store.appendLog("2026-08-10", evt);
    await store.appendLog("2026-08-10", evt);
    const log = await store.readLog("2026-08-10");
    expect(log.events).toHaveLength(1);
  });
});

describe("readLogsInRange", () => {
  it("returns logs in ISO order, filtered by range", async () => {
    await store.appendLog("2026-08-10", {
      verb: "wake", payload: "07:00", goalId: "wake-6am",
    });
    await store.appendLog("2026-08-12", {
      verb: "wake", payload: "07:00", goalId: "wake-6am",
    });
    await store.appendLog("2026-09-01", {
      verb: "wake", payload: "07:00", goalId: "wake-6am",
    });
    const logs = await store.readLogsInRange({ from: "2026-08-01", to: "2026-08-31" });
    expect(logs.map((l) => l.date)).toEqual(["2026-08-10", "2026-08-12"]);
  });
});
