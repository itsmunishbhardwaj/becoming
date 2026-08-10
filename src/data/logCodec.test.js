import { describe, it, expect } from "vitest";
import { parseLog, serializeLog, serializeEvent } from "./logCodec.js";

const SAMPLE = `---
date: 2026-08-10
---

- wake 07:12 → [[wake-6am]]
- session 22:40 · 18min → [[cadence-reset]]
`;

describe("parseLog", () => {
  it("parses date and typed events", () => {
    const { date, events } = parseLog(SAMPLE);
    expect(date).toBe("2026-08-10");
    expect(events).toEqual([
      { verb: "wake", payload: "07:12", goalId: "wake-6am", time: "07:12" },
      {
        verb: "session",
        payload: "22:40 · 18min",
        goalId: "cadence-reset",
        time: "22:40",
        durationMin: 18,
      },
    ]);
  });
});

describe("serializeLog round-trip", () => {
  it("parse then serialize then parse is stable", () => {
    const { date, events } = parseLog(SAMPLE);
    const out = serializeLog(date, events);
    const back = parseLog(out);
    expect(back).toEqual({ date, events });
  });
});

describe("serializeEvent", () => {
  it("derives payload for wake events without payload field", () => {
    expect(serializeEvent({ verb: "wake", time: "07:12", goalId: "wake-6am" }))
      .toBe("- wake 07:12 → [[wake-6am]]");
  });

  it("derives payload for session events without payload field", () => {
    expect(serializeEvent({ verb: "session", time: "22:00", durationMin: 15, goalId: "cadence-reset" }))
      .toBe("- session 22:00 · 15min → [[cadence-reset]]");
  });
});
