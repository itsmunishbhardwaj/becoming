import { describe, it, expect } from "vitest";
import { breakdownGoal } from "./breakdown.js";

function makeLlmChat(responses) {
  let i = 0;
  return async () => {
    const r = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return r;
  };
}

describe("breakdownGoal", () => {
  it("assembles a full breakdown on the happy path", async () => {
    const llmChat = makeLlmChat([
      JSON.stringify({ name: "Wake earlier", cat: "health", type: "wake", baseline: "08:00", target: "07:30" }),
      JSON.stringify({
        rounds: [{ n: 1, why: "Shift the whole 30 minutes in one clean move." }],
        indicators: { right: ["r"], wrong: ["w"], stall: ["s"] },
      }),
    ]);
    const result = await breakdownGoal(
      { ambition: "wake up earlier", baseline: "08:00", target: "07:30", today: "2026-09-17", existingGoals: [] },
      { llmChat }
    );
    expect(result.name).toBe("Wake earlier");
    expect(result.horizonReason).toBeNull();
    expect(result.unreachable).toBe(false);
    expect(result.rounds).toHaveLength(1);
    expect(result.rounds[0].why).toBe("Shift the whole 30 minutes in one clean move.");
    expect(result.indicators).toEqual({ right: ["r"], wrong: ["w"], stall: ["s"] });
  });

  it("sets horizonReason and a longer endDate when the safe pace needs it", async () => {
    const llmChat = makeLlmChat([
      JSON.stringify({ name: "Wake much earlier", cat: "health", type: "wake", baseline: "23:00", target: "14:00" }),
      JSON.stringify({ rounds: [], indicators: { right: [], wrong: [], stall: [] } }),
    ]);
    const result = await breakdownGoal(
      { ambition: "wake much earlier", baseline: "23:00", target: "14:00", today: "2026-09-17", existingGoals: [] },
      { llmChat }
    );
    // 23:00 -> 14:00 is a 540min delta; steps = round(540/30) = 18; 18 * 10 = 180 days (exactly the 6-month cap)
    expect(result.horizonReason).toMatch(/180 days/);
    expect(result.unreachable).toBe(false); // 180 is not > 180 (HALF_YEAR_DAYS), so still reachable
    const days = (Date.parse(result.endDate) - Date.parse("2026-09-17")) / 86400000;
    expect(days).toBe(180);
  });

  it("produces rounds that all fit within the goal's own end date (regression guard for horizon/buildRounds pacing mismatch)", async () => {
    const llmChat = makeLlmChat([
      JSON.stringify({ name: "Wake much earlier", cat: "health", type: "wake", baseline: "23:00", target: "14:00" }),
      JSON.stringify({ rounds: [], indicators: { right: [], wrong: [], stall: [] } }),
    ]);
    const result = await breakdownGoal(
      { ambition: "wake much earlier", baseline: "23:00", target: "14:00", today: "2026-09-17", existingGoals: [] },
      { llmChat }
    );
    for (const round of result.rounds) {
      expect(Date.parse(round.startDate)).toBeLessThanOrEqual(Date.parse(round.endDate));
    }
    expect(result.rounds[result.rounds.length - 1].endDate).toBe(result.endDate);
  });

  it("throws when classification never returns valid JSON", async () => {
    const llmChat = async () => "not json";
    await expect(breakdownGoal(
      { ambition: "wake up earlier", baseline: "08:30", target: "07:30", today: "2026-09-17", existingGoals: [] },
      { llmChat }
    )).rejects.toThrow(/valid JSON/);
  });

  it("falls back to why:null and template indicators when the narrative call fails", async () => {
    const llmChat = makeLlmChat([
      JSON.stringify({ name: "Wake earlier", cat: "health", type: "wake", baseline: "08:30", target: "07:30" }),
      "not json",
    ]);
    const result = await breakdownGoal(
      { ambition: "wake up earlier", baseline: "08:30", target: "07:30", today: "2026-09-17", existingGoals: [] },
      { llmChat }
    );
    expect(result.rounds[0].why).toBeNull();
    expect(result.indicators.stall).toContain("7+ days no wake logged");
  });

  it("throws immediately when no llmChat is provided", async () => {
    await expect(breakdownGoal(
      { ambition: "x", baseline: "08:30", target: "07:30", today: "2026-09-17", existingGoals: [] },
      {}
    )).rejects.toThrow(/requires an llmChat/);
  });

  it("throws immediately when today is missing or not a valid ISO date", async () => {
    const llmChat = async () => "unused";
    await expect(breakdownGoal(
      { ambition: "x", baseline: "08:30", target: "07:30", today: "not-a-date", existingGoals: [] },
      { llmChat }
    )).rejects.toThrow(/today/i);
    await expect(breakdownGoal(
      { ambition: "x", baseline: "08:30", target: "07:30", existingGoals: [] },
      { llmChat }
    )).rejects.toThrow(/today/i);
  });

  it("falls back to why:null and template indicators when the narrative call rejects (not just malformed JSON)", async () => {
    let calls = 0;
    const llmChat = async () => {
      calls += 1;
      if (calls === 1) {
        return JSON.stringify({ name: "Wake earlier", cat: "health", type: "wake", baseline: "08:30", target: "07:30" });
      }
      throw new Error("network down");
    };
    const result = await breakdownGoal(
      { ambition: "wake up earlier", baseline: "08:30", target: "07:30", today: "2026-09-17", existingGoals: [] },
      { llmChat }
    );
    expect(result.rounds[0].why).toBeNull();
    expect(result.indicators.stall).toContain("7+ days no wake logged");
  });
});
