import { describe, it, expect } from "vitest";
import { getType } from "./index.js";

describe("wake.buildRounds", () => {
  const wake = getType("wake");
  it("divides baseline→target into 30-min steps across timeline", () => {
    const rounds = wake.buildRounds("08:30", "06:00", "2026-08-10", "2026-12-31");
    expect(rounds[0].targetValue).toBe("08:00");
    expect(rounds[rounds.length - 1].targetValue).toBe("06:00");
    // 2h30m / 30min = 5 steps
    expect(rounds).toHaveLength(5);
    expect(rounds[0].startDate).toBe("2026-08-10");
    expect(rounds[rounds.length - 1].endDate).toBe("2026-12-31");
  });
});

describe("wake.adherenceForDay", () => {
  const wake = getType("wake");
  const round = { n: 1, targetValue: "08:00", startDate: "2026-08-10", endDate: "2026-08-24" };

  it("hit when wake ≤ target + 15min", () => {
    expect(wake.adherenceForDay({
      date: "2026-08-11", currentRound: round,
      events: [{ verb: "wake", time: "08:12", goalId: "wake-6am" }],
    })).toBe("hit");
  });

  it("soft when 15 < delta ≤ 45", () => {
    expect(wake.adherenceForDay({
      date: "2026-08-11", currentRound: round,
      events: [{ verb: "wake", time: "08:30", goalId: "wake-6am" }],
    })).toBe("soft");
  });

  it("off when > 45min late", () => {
    expect(wake.adherenceForDay({
      date: "2026-08-11", currentRound: round,
      events: [{ verb: "wake", time: "09:15", goalId: "wake-6am" }],
    })).toBe("off");
  });

  it("none when no wake event", () => {
    expect(wake.adherenceForDay({
      date: "2026-08-11", currentRound: round, events: [],
    })).toBe("none");
  });
});

describe("cadence.buildRounds", () => {
  const cad = getType("cadence");
  it("widens intervalDays linearly across timeline", () => {
    const rounds = cad.buildRounds(
      { intervalDays: 1 }, { intervalDays: 7 },
      "2026-08-10", "2026-12-31"
    );
    expect(rounds[0].targetValue).toEqual({ intervalDays: 2 });
    expect(rounds[rounds.length - 1].targetValue).toEqual({ intervalDays: 7 });
    expect(rounds.length).toBeGreaterThanOrEqual(3);
  });
});

describe("cadence.adherenceForDay", () => {
  const cad = getType("cadence");
  const round = { n: 1, targetValue: { intervalDays: 2 }, startDate: "2026-08-10", endDate: "2026-08-24" };

  it("hit when green day (multiple of intervalDays from startDate) with session", () => {
    // 2026-08-10 is start (day 0). Green days at 0, 2, 4, ...
    // 2026-08-12 is day 2 → green
    expect(cad.adherenceForDay({
      date: "2026-08-12", currentRound: round,
      events: [{ verb: "session", time: "22:00", durationMin: 15, goalId: "cadence-reset" }],
    })).toBe("hit");
  });

  it("clean skip on non-green day with no session", () => {
    // 2026-08-11 = day 1 → not green
    expect(cad.adherenceForDay({
      date: "2026-08-11", currentRound: round, events: [],
    })).toBe("clean");
  });

  it("off plan on non-green day with session (never red)", () => {
    expect(cad.adherenceForDay({
      date: "2026-08-11", currentRound: round,
      events: [{ verb: "session", time: "22:00", durationMin: 15, goalId: "cadence-reset" }],
    })).toBe("off");
  });

  it("none on green day with no session (no penalty)", () => {
    expect(cad.adherenceForDay({
      date: "2026-08-12", currentRound: round, events: [],
    })).toBe("none");
  });
});
