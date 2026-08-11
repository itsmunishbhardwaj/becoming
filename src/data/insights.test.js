import { describe, it, expect } from "vitest";
import { generateInsights } from "./insights.js";

const goal = {
  id: "wake-6am", name: "Wake at 6:00 AM", type: "wake",
  state: "active", currentRound: 1,
  rounds: [{ n: 1, targetValue: "08:00", startDate: "2026-07-01", endDate: "2026-12-31" }],
};

describe("generateInsights — drift", () => {
  it("emits a drift question when the last 7 days have no log", () => {
    const insights = generateInsights({ goals: [goal], logs: [], today: "2026-08-15" });
    const drift = insights.find((i) => i.id.startsWith("drift-"));
    expect(drift).toBeTruthy();
    expect(drift.kicker.toLowerCase()).toContain("quiet");
    expect(drift.text).toContain("Wake at 6:00 AM");
  });

  it("does not emit drift when there is a log in the last 7 days", () => {
    const logs = [{ date: "2026-08-13", events: [{ verb: "wake", time: "07:30", goalId: "wake-6am" }] }];
    const insights = generateInsights({ goals: [goal], logs, today: "2026-08-15" });
    expect(insights.find((i) => i.id.startsWith("drift-"))).toBeFalsy();
  });
});

describe("generateInsights — low momentum", () => {
  it("emits low-momentum when momentum < 0.25 and 3+ events in last 30 days", () => {
    const logs = [
      { date: "2026-08-01", events: [{ verb: "wake", time: "09:15", goalId: "wake-6am" }] }, // off
      { date: "2026-08-03", events: [{ verb: "wake", time: "09:30", goalId: "wake-6am" }] }, // off
      { date: "2026-08-05", events: [{ verb: "wake", time: "09:00", goalId: "wake-6am" }] }, // off
    ];
    const insights = generateInsights({ goals: [goal], logs, today: "2026-08-15" });
    // Drift also fires here since last 7 days have no log; we assert low-mom present too
    expect(insights.some((i) => i.id.startsWith("low-mom-"))).toBe(true);
  });

  it("skips low-momentum with fewer than 3 events", () => {
    const logs = [
      { date: "2026-08-10", events: [{ verb: "wake", time: "09:15", goalId: "wake-6am" }] },
    ];
    const insights = generateInsights({ goals: [goal], logs, today: "2026-08-15" });
    expect(insights.some((i) => i.id.startsWith("low-mom-"))).toBe(false);
  });
});

describe("generateInsights — ordering", () => {
  it("puts drift before low-momentum", () => {
    const logs = [
      { date: "2026-08-01", events: [{ verb: "wake", time: "09:15", goalId: "wake-6am" }] },
      { date: "2026-08-03", events: [{ verb: "wake", time: "09:30", goalId: "wake-6am" }] },
      { date: "2026-08-05", events: [{ verb: "wake", time: "09:00", goalId: "wake-6am" }] },
    ];
    const insights = generateInsights({ goals: [goal], logs, today: "2026-08-15" });
    const kinds = insights.map((i) => i.id.split("-")[0]);
    expect(kinds[0]).toBe("drift");
  });
});
