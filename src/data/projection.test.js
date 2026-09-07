import { describe, it, expect } from "vitest";
import { projectedDates } from "./projection.js";

describe("projectedDates", () => {
  it("returns every day in range for a simple (non-cadence) goal", () => {
    const goal = { id: "read", baseline: null, endDate: "2026-09-10" };
    const dates = projectedDates({ goal, from: "2026-09-08", to: "2026-09-10" });
    expect(dates).toEqual(["2026-09-08", "2026-09-09", "2026-09-10"]);
  });

  it("returns every day in range for a wake goal (string baseline)", () => {
    const goal = { id: "wake-6am", baseline: "08:00", endDate: "2026-09-10" };
    const dates = projectedDates({ goal, from: "2026-09-08", to: "2026-09-09" });
    expect(dates).toEqual(["2026-09-08", "2026-09-09"]);
  });

  it("only returns scheduled days for a cadence goal", () => {
    const goal = {
      id: "gym",
      baseline: { intervalDays: 2 },
      endDate: "2026-09-10",
      rounds: [
        { n: 1, targetValue: { intervalDays: 2 }, startDate: "2026-09-01", endDate: "2026-09-10" },
      ],
    };
    // interval 2 -> scheduled every other day starting at round start
    const dates = projectedDates({ goal, from: "2026-09-01", to: "2026-09-05" });
    expect(dates).toEqual(["2026-09-01", "2026-09-03", "2026-09-05"]);
  });

  it("excludes dates outside any round window for a cadence goal", () => {
    const goal = {
      id: "gym",
      baseline: { intervalDays: 2 },
      endDate: "2026-09-10",
      rounds: [
        { n: 1, targetValue: { intervalDays: 2 }, startDate: "2026-09-05", endDate: "2026-09-10" },
      ],
    };
    const dates = projectedDates({ goal, from: "2026-09-01", to: "2026-09-10" });
    expect(dates.every((d) => d >= "2026-09-05")).toBe(true);
  });
});
