import { describe, it, expect } from "vitest";
import { planDayTap } from "./dayTap.js";

const SIMPLE_GOAL = { id: "read", baseline: null, endDate: "2026-09-30" };
const WAKE_GOAL = { id: "wake-6am", baseline: "07:00", endDate: "2026-09-30" };
const CADENCE_GOAL = {
  id: "gym",
  baseline: { intervalDays: 2 },
  endDate: "2026-09-30",
  rounds: [{ n: 1, targetValue: { intervalDays: 2 }, startDate: "2026-09-01", endDate: "2026-09-30" }],
};

describe("planDayTap", () => {
  it("returns null for a date past the goal's end date", () => {
    expect(planDayTap({ goal: SIMPLE_GOAL, dateISO: "2026-10-01", existingEvent: null })).toBeNull();
  });

  it("returns null for a fixed cadence day that's already scheduled", () => {
    // interval 2, round starts 2026-09-01 -> scheduled on the 1st, 3rd, 5th...
    expect(planDayTap({ goal: CADENCE_GOAL, dateISO: "2026-09-03", existingEvent: null })).toBeNull();
  });

  it("returns a delete plan when an event already exists that day", () => {
    const existingEvent = { verb: "done", goalId: "read" };
    expect(planDayTap({ goal: SIMPLE_GOAL, dateISO: "2026-09-05", existingEvent })).toEqual({
      type: "delete",
      event: existingEvent,
    });
  });

  it("builds a 'done' append event for a simple goal", () => {
    expect(planDayTap({ goal: SIMPLE_GOAL, dateISO: "2026-09-05", existingEvent: null })).toEqual({
      type: "append",
      event: { verb: "done", goalId: "read" },
    });
  });

  it("builds a 'wake' append event for a wake goal", () => {
    expect(planDayTap({ goal: WAKE_GOAL, dateISO: "2026-09-05", existingEvent: null })).toEqual({
      type: "append",
      event: { verb: "wake", time: "07:00", goalId: "wake-6am" },
    });
  });

  it("builds a 'session' append event for a cadence goal on a non-scheduled day", () => {
    // interval 2, round starts the 1st -> the 2nd is not a scheduled (green) day
    expect(planDayTap({ goal: CADENCE_GOAL, dateISO: "2026-09-02", existingEvent: null })).toEqual({
      type: "append",
      event: { verb: "session", durationMin: 10, goalId: "gym" },
    });
  });
});
