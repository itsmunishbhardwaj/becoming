import { describe, it, expect } from "vitest";
import { daysInMonth, isoAtDay, leadOffsetFor } from "./calendarMonth.js";

describe("daysInMonth", () => {
  it("returns 30 for September 2026", () => {
    expect(daysInMonth(2026, 8)).toBe(30);
  });
  it("returns 29 for February in a leap year", () => {
    expect(daysInMonth(2028, 1)).toBe(29);
  });
});

describe("isoAtDay", () => {
  it("builds a zero-padded ISO date", () => {
    expect(isoAtDay(2026, 8, 0)).toBe("2026-09-01");
    expect(isoAtDay(2026, 0, 4)).toBe("2026-01-05");
  });
});

describe("leadOffsetFor", () => {
  it("returns the day-of-week of the 1st (0=Sunday)", () => {
    // Sept 1, 2026 is a Tuesday
    expect(leadOffsetFor(2026, 8)).toBe(2);
  });
});
