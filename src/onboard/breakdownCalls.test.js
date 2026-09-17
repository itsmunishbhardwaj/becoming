import { describe, it, expect } from "vitest";
import { callParseClassify } from "./breakdownCalls.js";

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
