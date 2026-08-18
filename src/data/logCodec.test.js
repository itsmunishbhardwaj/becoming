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
    const { date, events, notes } = parseLog(SAMPLE);
    const out = serializeLog(date, events, notes);
    const back = parseLog(out);
    expect(back).toEqual({ date, events, notes });
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

  it("derives duration-only payload for session events with no time (calendar tap)", () => {
    expect(serializeEvent({ verb: "session", durationMin: 10, goalId: "cadence-reset" }))
      .toBe("- session 10min → [[cadence-reset]]");
  });
});

describe("payload-less events (simple goals)", () => {
  it("parses `- done → [[goal]]`", () => {
    const src = `---
date: 2026-08-11
---

- done → [[read-every-day]]
`;
    const { events } = parseLog(src);
    expect(events[0]).toEqual({ verb: "done", payload: "", goalId: "read-every-day" });
  });

  it("round-trips a done event without leading double-space", () => {
    const line = serializeEvent({ verb: "done", goalId: "read-every-day" });
    expect(line).toBe("- done → [[read-every-day]]");
    const { events } = parseLog(`---\ndate: 2026-08-11\n---\n\n${line}\n`);
    expect(events[0].verb).toBe("done");
    expect(events[0].goalId).toBe("read-every-day");
  });
});

describe("notes in frontmatter", () => {
  it("parseLog returns empty notes when absent", () => {
    const { notes } = parseLog(SAMPLE);
    expect(notes).toEqual({});
  });

  it("parseLog reads notes map", () => {
    const src = `---
date: 2026-08-11
notes: {"wake-6am":"felt tired, still made it","meditate":"10 min, quiet"}
---

- wake 07:12 → [[wake-6am]]
`;
    const { notes } = parseLog(src);
    expect(notes).toEqual({
      "wake-6am": "felt tired, still made it",
      "meditate": "10 min, quiet",
    });
  });

  it("serializeLog omits notes when empty", () => {
    const out = serializeLog("2026-08-11", [], {});
    expect(out).not.toContain("notes:");
  });

  it("serializeLog writes notes when present", () => {
    const out = serializeLog("2026-08-11", [], { "wake-6am": "good day" });
    expect(out).toContain(`notes: {"wake-6am":"good day"}`);
  });

  it("round-trips notes with newlines and unicode", () => {
    const notes = { "wake-6am": "line one\nline two — ✨" };
    const md = serializeLog("2026-08-11", [], notes);
    const back = parseLog(md);
    expect(back.notes).toEqual(notes);
  });

  it("empty-string values are omitted on serialize", () => {
    const out = serializeLog("2026-08-11", [], { "wake-6am": "kept", "meditate": "" });
    expect(out).toContain(`"wake-6am":"kept"`);
    expect(out).not.toContain(`"meditate"`);
  });
});

describe("bare-duration session", () => {
  it("session round-trip preserves durationMin when no time is present", () => {
    const src = `---
date: 2026-08-11
---

- session 12min → [[cadence-reset]]
`;
    const { events } = parseLog(src);
    expect(events[0]).toEqual({
      verb: "session",
      payload: "12min",
      goalId: "cadence-reset",
      durationMin: 12,
    });
    const back = parseLog(serializeLog("2026-08-11", events));
    expect(back.events[0]).toEqual(events[0]);
  });
});
