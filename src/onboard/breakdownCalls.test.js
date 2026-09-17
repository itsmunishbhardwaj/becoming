import { describe, it, expect } from "vitest";
import { callParseClassify, callRoundNarrative, templateIndicators } from "./breakdownCalls.js";

describe("callParseClassify", () => {
  it("returns the parsed JSON on a clean response", async () => {
    const llmChat = async () => JSON.stringify({
      name: "Wake earlier", cat: "health", type: "wake", baseline: "08:30", target: "07:30",
    });
    const result = await callParseClassify({
      ambition: "wake up earlier", baseline: "08:30", target: "07:30",
      existingGoals: [], llmChat,
    });
    expect(result).toEqual({
      name: "Wake earlier", cat: "health", type: "wake", baseline: "08:30", target: "07:30",
    });
  });

  it("retries once with a stricter prompt when the first response isn't valid JSON", async () => {
    let calls = 0;
    const llmChat = async () => {
      calls += 1;
      if (calls === 1) return "sure, here's the goal: not json";
      return JSON.stringify({ name: "Wake earlier", cat: "health", type: "wake", baseline: "08:30", target: "07:30" });
    };
    const result = await callParseClassify({
      ambition: "wake up earlier", baseline: "08:30", target: "07:30",
      existingGoals: [], llmChat,
    });
    expect(calls).toBe(2);
    expect(result.type).toBe("wake");
  });

  it("throws when both attempts return invalid JSON", async () => {
    const llmChat = async () => "still not json";
    await expect(callParseClassify({
      ambition: "wake up earlier", baseline: "08:30", target: "07:30",
      existingGoals: [], llmChat,
    })).rejects.toThrow(/valid JSON/);
  });
});

describe("callRoundNarrative", () => {
  const rounds = [{ n: 1, targetValue: "07:30", startDate: "2026-09-17", endDate: "2026-12-16" }];

  it("returns parsed rounds + indicators on a clean response", async () => {
    const llmChat = async () => JSON.stringify({
      rounds: [{ n: 1, why: "Shift the whole 30 minutes in one clean move." }],
      indicators: { right: ["x"], wrong: ["y"], stall: ["z"] },
    });
    const result = await callRoundNarrative({ ambition: "wake up earlier", rounds, horizonReason: null, llmChat });
    expect(result.rounds[0].why).toBe("Shift the whole 30 minutes in one clean move.");
    expect(result.indicators).toEqual({ right: ["x"], wrong: ["y"], stall: ["z"] });
  });

  it("returns null on malformed JSON — no retry", async () => {
    let calls = 0;
    const llmChat = async () => { calls += 1; return "not json"; };
    const result = await callRoundNarrative({ ambition: "wake up earlier", rounds, horizonReason: null, llmChat });
    expect(result).toBeNull();
    expect(calls).toBe(1);
  });
});

describe("templateIndicators", () => {
  it("returns the wake template", () => {
    expect(templateIndicators("wake").stall).toContain("7+ days no wake logged");
  });
  it("returns the cadence template", () => {
    expect(templateIndicators("cadence").stall).toContain("No logs at all for 14+ days");
  });
  it("returns a simple fallback for any other type", () => {
    expect(templateIndicators("simple").stall).toEqual(["7+ days with no log"]);
  });
});
