import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseGoal } from "./goalCodec.js";
import { getType } from "./goalTypes/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const vault = path.join(here, "..", "..", "vault", "goals");

describe("seed vault/goals/wake-6am.md", () => {
  it("parses and matches expected shape", async () => {
    const md = await readFile(path.join(vault, "wake-6am.md"), "utf8");
    const g = parseGoal(md);
    expect(g.type).toBe("wake");
    expect(g.baseline).toBe("08:30");
    expect(g.target).toBe("06:00");
    expect(g.rounds).toHaveLength(5);
    const t = getType(g.type);
    expect(t.adherenceForDay({
      date: g.rounds[0].startDate,
      currentRound: g.rounds[0],
      events: [{ verb: "wake", time: "08:05", goalId: g.id }],
    })).toBe("hit");
  });
});

describe("seed vault/goals/cadence-reset.md", () => {
  it("parses and matches expected shape", async () => {
    const md = await readFile(path.join(vault, "cadence-reset.md"), "utf8");
    const g = parseGoal(md);
    expect(g.type).toBe("cadence");
    expect(g.baseline).toEqual({ intervalDays: 1 });
    expect(g.target).toEqual({ intervalDays: 7 });
    expect(g.rounds[0].targetValue).toEqual({ intervalDays: 2 });
    const t = getType(g.type);
    expect(t.adherenceForDay({
      date: g.rounds[0].startDate,   // day 0 of round 1 → green
      currentRound: g.rounds[0],
      events: [{ verb: "session", time: "22:00", durationMin: 12, goalId: g.id }],
    })).toBe("hit");
  });
});
