import { describe, it, expect } from "vitest";
import { addDays, decideHorizon } from "./horizon.js";

describe("addDays", () => {
  it("adds the given number of days", () => {
    const result = addDays("2026-09-17", 90);
    const days = (Date.parse(result) - Date.parse("2026-09-17")) / 86400000;
    expect(days).toBe(90);
  });
});

describe("decideHorizon", () => {
  it("defaults to a 90-day quarter when safe pace fits", () => {
    const result = decideHorizon("wake", "08:30", "07:30", "2026-09-17");
    expect(result.horizonReason).toBeNull();
    const days = (Date.parse(result.endDate) - Date.parse("2026-09-17")) / 86400000;
    expect(days).toBe(90);
  });

  it("extends past 90 days with a reason when the safe pace needs longer", () => {
    const result = decideHorizon("wake", "23:00", "14:00", "2026-09-17");
    expect(result.horizonReason).toMatch(/126 days/);
    const days = (Date.parse(result.endDate) - Date.parse("2026-09-17")) / 86400000;
    expect(days).toBe(126);
  });

  it("caps extension at 180 days even if the safe pace needs more", () => {
    // wake 23:00 -> 05:00 is a 1080min delta (23:00=1380, 05:00=300 => 1080)
    // 1080/30*7 = 252 days needed, capped to 180
    const result = decideHorizon("wake", "23:00", "05:00", "2026-09-17");
    const days = (Date.parse(result.endDate) - Date.parse("2026-09-17")) / 86400000;
    expect(days).toBe(180);
    expect(result.horizonReason).toMatch(/252 days/);
  });

  it("never extends for simple goals — no ceiling to trigger it", () => {
    const result = decideHorizon("simple", null, null, "2026-09-17");
    expect(result.horizonReason).toBeNull();
    const days = (Date.parse(result.endDate) - Date.parse("2026-09-17")) / 86400000;
    expect(days).toBe(90);
  });
});
