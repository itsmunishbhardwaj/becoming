import { describe, it, expect } from "vitest";
import { computeCurrentRound, advanceGoal } from "./rounds.js";

const G = {
  id: "wake-6am",
  currentRound: 1,
  rounds: [
    { n: 1, targetValue: "08:00", startDate: "2026-08-01", endDate: "2026-08-15" },
    { n: 2, targetValue: "07:30", startDate: "2026-08-16", endDate: "2026-08-31" },
    { n: 3, targetValue: "07:00", startDate: "2026-09-01", endDate: "2026-09-30" },
  ],
};

describe("computeCurrentRound", () => {
  it("returns the round whose window covers today", () => {
    expect(computeCurrentRound(G, "2026-08-10")).toBe(1);
    expect(computeCurrentRound(G, "2026-08-16")).toBe(2);
    expect(computeCurrentRound(G, "2026-09-15")).toBe(3);
  });
  it("returns 1 when today is before the first round", () => {
    expect(computeCurrentRound(G, "2026-07-01")).toBe(1);
  });
  it("returns the last round when today is past the last endDate", () => {
    expect(computeCurrentRound(G, "2026-12-31")).toBe(3);
  });
  it("returns 1 when goal has no rounds", () => {
    expect(computeCurrentRound({ rounds: [], currentRound: 1 }, "2026-08-10")).toBe(1);
  });
});

describe("advanceGoal", () => {
  it("returns unchanged when currentRound already matches today", () => {
    const out = advanceGoal({ ...G, currentRound: 1 }, "2026-08-10");
    expect(out.changed).toBe(false);
    expect(out.goal.currentRound).toBe(1);
  });
  it("advances when today has moved into a later round", () => {
    const out = advanceGoal({ ...G, currentRound: 1 }, "2026-08-20");
    expect(out.changed).toBe(true);
    expect(out.goal.currentRound).toBe(2);
    expect(out.goal.id).toBe("wake-6am"); // preserves other fields
  });
  it("does not regress when today is earlier than currentRound", () => {
    const out = advanceGoal({ ...G, currentRound: 2 }, "2026-08-05");
    expect(out.changed).toBe(false);
    expect(out.goal.currentRound).toBe(2);
  });
});
