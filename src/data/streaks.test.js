import { describe, it, expect } from "vitest";
import { getStreaks, getProgress } from "./streaks.js";

function makeLogs(goalId, dates) {
  return dates.map((d) => ({ date: d, events: [{ goalId, verb: "tap", payload: "" }] }));
}

const G = "goal-1";

describe("getStreaks", () => {
  it("returns zeros for no logs", () => {
    expect(getStreaks(G, [], "2026-01-10")).toEqual({
      current: 0, longest: 0, longestFrom: null, longestTo: null,
    });
  });

  it("current streak when today is marked", () => {
    const logs = makeLogs(G, ["2026-01-08", "2026-01-09", "2026-01-10"]);
    const { current } = getStreaks(G, logs, "2026-01-10");
    expect(current).toBe(3);
  });

  it("current streak when today is unmarked but yesterday is marked", () => {
    const logs = makeLogs(G, ["2026-01-08", "2026-01-09"]);
    const { current } = getStreaks(G, logs, "2026-01-10");
    expect(current).toBe(2);
  });

  it("current streak resets after a gap", () => {
    const logs = makeLogs(G, ["2026-01-01", "2026-01-02", "2026-01-08", "2026-01-09"]);
    const { current } = getStreaks(G, logs, "2026-01-10");
    expect(current).toBe(2);
  });

  it("longest streak spans correct dates", () => {
    const logs = makeLogs(G, [
      "2026-01-01", "2026-01-02", "2026-01-03",   // 3-day run
      "2026-01-10", "2026-01-11",                   // 2-day run
    ]);
    const { longest, longestFrom, longestTo } = getStreaks(G, logs, "2026-01-11");
    expect(longest).toBe(3);
    expect(longestFrom).toBe("2026-01-01");
    expect(longestTo).toBe("2026-01-03");
  });

  it("longest streak survives a break", () => {
    const logs = makeLogs(G, [
      "2026-01-01",                                   // 1-day run
      "2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08", // 4-day run
      "2026-01-15",                                   // 1-day run
    ]);
    const { longest } = getStreaks(G, logs, "2026-01-15");
    expect(longest).toBe(4);
  });

  it("goal with a single mark has current=1 and longest=1", () => {
    const logs = makeLogs(G, ["2026-01-10"]);
    const r = getStreaks(G, logs, "2026-01-10");
    expect(r.current).toBe(1);
    expect(r.longest).toBe(1);
  });
});

describe("getProgress", () => {
  it("returns marked count with null target when no dayTarget set", () => {
    const logs = makeLogs(G, ["2026-01-01", "2026-01-02", "2026-01-03"]);
    expect(getProgress(G, logs, null)).toEqual({ marked: 3, target: null, percent: null });
  });

  it("computes percentage from dayTarget", () => {
    const logs = makeLogs(G, ["2026-01-01", "2026-01-02"]);
    expect(getProgress(G, logs, 10)).toEqual({ marked: 2, target: 10, percent: 20 });
  });

  it("rounds percent to nearest integer", () => {
    const logs = makeLogs(G, ["2026-01-01"]);
    expect(getProgress(G, logs, 3).percent).toBe(33);
  });
});
