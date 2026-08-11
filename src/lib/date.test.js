import { describe, it, expect } from "vitest";
import { todayLocalISO, addDaysLocalISO } from "./date.js";

describe("todayLocalISO", () => {
  it("returns a string in YYYY-MM-DD shape", () => {
    const result = todayLocalISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("uses local calendar components, not UTC (23:30 test)", () => {
    // 2026-08-11 at 23:30 local — UTC would be next day for UTC+0 or west
    const local = new Date(2026, 7, 11, 23, 30); // month is 0-indexed
    expect(todayLocalISO(local)).toBe("2026-08-11");
  });

  it("addDaysLocalISO handles month and year rollover", () => {
    expect(addDaysLocalISO("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysLocalISO("2026-01-31", 1)).toBe("2026-02-01");
  });
});
