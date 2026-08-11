import { describe, it, expect } from "vitest";
import { parseLogText } from "./logParser.js";

describe("parseLogText — wake events", () => {
  it("parses 'woke 07:12'", () => {
    expect(parseLogText("woke 07:12")).toEqual([
      { verb: "wake", time: "07:12", raw: "woke 07:12" },
    ]);
  });
  it("parses 'wake 06:45'", () => {
    expect(parseLogText("wake 06:45")).toEqual([
      { verb: "wake", time: "06:45", raw: "wake 06:45" },
    ]);
  });
  it("parses 'wake at 07:30'", () => {
    expect(parseLogText("wake at 07:30")).toEqual([
      { verb: "wake", time: "07:30", raw: "wake at 07:30" },
    ]);
  });
});

describe("parseLogText — session events", () => {
  it("parses 'session 22:40 · 18min'", () => {
    expect(parseLogText("session 22:40 · 18min")).toEqual([
      { verb: "session", time: "22:40", durationMin: 18, raw: "session 22:40 · 18min" },
    ]);
  });
  it("parses 'session 15 min' (no time)", () => {
    expect(parseLogText("session 15 min")).toEqual([
      { verb: "session", durationMin: 15, raw: "session 15 min" },
    ]);
  });
  it("parses 'masturbated 22:00 · 20min'", () => {
    const out = parseLogText("masturbated 22:00 · 20min");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ verb: "session", time: "22:00", durationMin: 20 });
  });
});

describe("parseLogText — multi-line + skip", () => {
  it("parses multiple lines and skips blanks + unrecognized", () => {
    const text = `woke 07:00

random note about the day
session 22:15 · 10min
`;
    const out = parseLogText(text);
    expect(out).toHaveLength(2);
    expect(out[0].verb).toBe("wake");
    expect(out[1].verb).toBe("session");
  });
  it("returns empty array for empty or nonsense input", () => {
    expect(parseLogText("")).toEqual([]);
    expect(parseLogText("   \n\n  ")).toEqual([]);
    expect(parseLogText("hello world")).toEqual([]);
  });
});
