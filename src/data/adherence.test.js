import { describe, it, expect } from "vitest";
import { dailyAdherence, momentum } from "./adherence.js";

const WAKE_GOAL = {
  id: "wake-6am",
  type: "wake",
  currentRound: 1,
  rounds: [
    { n: 1, targetValue: "08:00", startDate: "2026-08-10", endDate: "2026-08-24" },
  ],
};

const CADENCE_GOAL = {
  id: "cadence-reset",
  type: "cadence",
  currentRound: 1,
  rounds: [
    { n: 1, targetValue: { intervalDays: 2 }, startDate: "2026-08-10", endDate: "2026-08-24" },
  ],
};

describe("dailyAdherence — event outside round window", () => {
  it("simple goal: an event logged before the round starts still marks as hit", () => {
    const goal = {
      id: "oil-pulling",
      type: "simple",
      currentRound: 1,
      rounds: [{ n: 1, targetValue: null, startDate: "2026-08-18", endDate: "2026-12-31" }],
    };
    const logs = [{ date: "2026-01-17", events: [{ verb: "done", goalId: "oil-pulling" }] }];
    const out = dailyAdherence({ goal, logs, from: "2026-01-17", to: "2026-01-17" });
    expect(out["2026-01-17"]).toBe("hit");
  });

  it("cadence goal: a session logged before the round starts still marks as hit", () => {
    const goal = {
      id: "cadence-reset",
      type: "cadence",
      currentRound: 1,
      rounds: [{ n: 1, targetValue: { intervalDays: 2 }, startDate: "2026-08-18", endDate: "2026-12-31" }],
    };
    const logs = [{ date: "2026-01-17", events: [{ verb: "session", durationMin: 10, goalId: "cadence-reset" }] }];
    const out = dailyAdherence({ goal, logs, from: "2026-01-17", to: "2026-01-17" });
    expect(out["2026-01-17"]).toBe("hit");
  });
});

describe("dailyAdherence — wake", () => {
  it("marks hit/soft/off/none per rule bands", () => {
    const logs = [
      { date: "2026-08-11", events: [{ verb: "wake", time: "08:05", goalId: "wake-6am" }] }, // Δ=5 → hit
      { date: "2026-08-12", events: [{ verb: "wake", time: "08:30", goalId: "wake-6am" }] }, // Δ=30 → soft
      { date: "2026-08-13", events: [{ verb: "wake", time: "09:15", goalId: "wake-6am" }] }, // Δ=75 → off
      // 2026-08-14 no log → none
    ];
    const out = dailyAdherence({ goal: WAKE_GOAL, logs, from: "2026-08-11", to: "2026-08-14" });
    expect(out).toEqual({
      "2026-08-11": "hit",
      "2026-08-12": "soft",
      "2026-08-13": "off",
      "2026-08-14": "none",
    });
  });
});

describe("dailyAdherence — cadence", () => {
  it("marks hit/clean/off/none per green-day rule", () => {
    // startDate 2026-08-10 (day 0). intervalDays=2 → green days: 10, 12, 14, ...
    const logs = [
      { date: "2026-08-10", events: [{ verb: "session", durationMin: 12, goalId: "cadence-reset" }] }, // green + session → hit
      { date: "2026-08-11", events: [] }, // non-green + no session → clean
      { date: "2026-08-13", events: [{ verb: "session", durationMin: 8,  goalId: "cadence-reset" }] }, // non-green + session → off
      // 2026-08-12 (green) with no session → still hit (schedule is fixed)
    ];
    const out = dailyAdherence({ goal: CADENCE_GOAL, logs, from: "2026-08-10", to: "2026-08-13" });
    expect(out).toEqual({
      "2026-08-10": "hit",
      "2026-08-11": "clean",
      "2026-08-12": "hit",
      "2026-08-13": "off",
    });
  });
});

describe("momentum — wake", () => {
  it("computes soft-weighted ratio over 14-day window", () => {
    // 3 hits + 1 soft over 4 logged days = (3 + 0.5) / 4 = 0.875
    const logs = [
      { date: "2026-08-11", events: [{ verb: "wake", time: "08:00", goalId: "wake-6am" }] },
      { date: "2026-08-12", events: [{ verb: "wake", time: "08:10", goalId: "wake-6am" }] },
      { date: "2026-08-13", events: [{ verb: "wake", time: "08:12", goalId: "wake-6am" }] },
      { date: "2026-08-14", events: [{ verb: "wake", time: "08:30", goalId: "wake-6am" }] }, // soft
    ];
    const m = momentum({ goal: WAKE_GOAL, logs, asOf: "2026-08-14" });
    expect(m).toBeCloseTo(0.875, 3);
  });

  it("returns 0 when no logs in window", () => {
    expect(momentum({ goal: WAKE_GOAL, logs: [], asOf: "2026-08-14" })).toBe(0);
  });
});

describe("momentum — cadence", () => {
  it("counts hits + clean_skips over full 14 days", () => {
    // 14 days ending 2026-08-23. Round starts 2026-08-10.
    // Green days in window: 10, 12, 14, 16, 18, 20, 22 → 7 green days.
    // Non-green in window: 11, 13, 15, 17, 19, 21, 23 → 7 non-green days.
    // Log a session on every green day → 7 hits.
    // Non-green days with no session → 7 cleans.
    // Momentum = (7 + 7) / 14 = 1.0.
    const logs = [];
    for (const d of ["2026-08-10","2026-08-12","2026-08-14","2026-08-16","2026-08-18","2026-08-20","2026-08-22"]) {
      logs.push({ date: d, events: [{ verb: "session", durationMin: 10, goalId: "cadence-reset" }] });
    }
    const m = momentum({ goal: CADENCE_GOAL, logs, asOf: "2026-08-23" });
    expect(m).toBeCloseTo(1, 3);
  });

  it("subtracts for off-plan sessions", () => {
    // One session on a non-green day inside window → that day counts 0 not clean.
    const logs = [
      { date: "2026-08-11", events: [{ verb: "session", durationMin: 5, goalId: "cadence-reset" }] },
    ];
    const m = momentum({ goal: CADENCE_GOAL, logs, asOf: "2026-08-11" });
    // Window: 2026-07-29 .. 2026-08-11 (14 days ending on asOf).
    // 2026-08-10 is a green day inside round 1 → "hit" (scheduled, always counts).
    // 2026-08-11 is non-green with a session → "off" → 0.
    // Days before round start (07-29..08-09) have no events → "none" → 0.
    // Numerator = 1 (just Aug 10). Denominator = 14. Result 1/14.
    expect(m).toBeCloseTo(1 / 14, 4);
  });
});
