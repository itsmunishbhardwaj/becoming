import { describe, it, expect } from "vitest";
import {
  TURNS, initialState, applyInput, nextTurn, validate, finalize,
} from "./turns.js";

describe("TURNS order", () => {
  it("lists 8 turns in ritual order", () => {
    expect(TURNS).toEqual([
      "ambition","type","baseline","target","endDate",
      "roundsPreview","indicators","confirm",
    ]);
  });
});

describe("initialState", () => {
  it("returns a fresh state with a unique sessionId and empty answers", () => {
    const a = initialState();
    const b = initialState();
    expect(a.sessionId).toBeTruthy();
    expect(b.sessionId).toBeTruthy();
    expect(a.sessionId).not.toBe(b.sessionId);
    expect(a.answers).toEqual({});
  });
});

describe("validate", () => {
  it("ambition requires a non-empty string", () => {
    expect(validate("ambition", "")).toEqual({ ok: false, error: expect.any(String) });
    expect(validate("ambition", "Wake at 6am")).toEqual({ ok: true });
  });
  it("type accepts only wake or cadence", () => {
    expect(validate("type", "wake")).toEqual({ ok: true });
    expect(validate("type", "cadence")).toEqual({ ok: true });
    expect(validate("type", "sleep")).toEqual({ ok: false, error: expect.any(String) });
  });
  it("baseline (wake) requires HH:MM", () => {
    expect(validate("baseline", "08:30")).toEqual({ ok: true });
    expect(validate("baseline", "eight thirty")).toEqual({ ok: false, error: expect.any(String) });
  });
  it("baseline (cadence) accepts { intervalDays: n }", () => {
    expect(validate("baseline", { intervalDays: 1 })).toEqual({ ok: true });
    expect(validate("baseline", { intervalDays: 0 })).toEqual({ ok: false, error: expect.any(String) });
  });
  it("endDate requires ISO YYYY-MM-DD", () => {
    expect(validate("endDate", "2026-12-31")).toEqual({ ok: true });
    expect(validate("endDate", "12/31/26")).toEqual({ ok: false, error: expect.any(String) });
  });
});

describe("applyInput + nextTurn", () => {
  it("walks the ritual in order", () => {
    let s = initialState();
    expect(nextTurn(s).id).toBe("ambition");

    s = applyInput(s, "ambition", "Wake at 6:00 AM every day");
    expect(nextTurn(s).id).toBe("type");
    expect(s.answers.ambition).toBe("Wake at 6:00 AM every day");

    s = applyInput(s, "type", "wake");
    expect(nextTurn(s).id).toBe("baseline");

    s = applyInput(s, "baseline", "08:30");
    s = applyInput(s, "target", "06:00");
    s = applyInput(s, "endDate", "2026-12-31");
    expect(nextTurn(s).id).toBe("roundsPreview");

    s = applyInput(s, "roundsPreview", [
      { n: 1, targetValue: "08:00", startDate: "2026-08-11", endDate: "2026-09-10" },
    ]);
    s = applyInput(s, "indicators", { right: ["a"], wrong: ["b"], stall: ["c"] });
    expect(nextTurn(s).id).toBe("confirm");

    s = applyInput(s, "confirm", true);
    expect(nextTurn(s)).toEqual({ done: true });
  });
});

describe("finalize", () => {
  it("produces a Goal shape matching goalCodec expectations", () => {
    let s = initialState();
    s = applyInput(s, "ambition", "Wake at 6:00 AM");
    s = applyInput(s, "type", "wake");
    s = applyInput(s, "baseline", "08:30");
    s = applyInput(s, "target", "06:00");
    s = applyInput(s, "endDate", "2026-12-31");
    s = applyInput(s, "roundsPreview", [
      { n: 1, targetValue: "08:00", startDate: "2026-08-11", endDate: "2026-09-10" },
    ]);
    s = applyInput(s, "indicators", { right: ["wake on time"], wrong: ["snooze"], stall: ["no logs"] });
    s = applyInput(s, "confirm", true);
    const goal = finalize(s);
    expect(goal.id).toBeTruthy();
    expect(goal.type).toBe("wake");
    expect(goal.state).toBe("active");
    expect(goal.baseline).toBe("08:30");
    expect(goal.target).toBe("06:00");
    expect(goal.rounds).toHaveLength(1);
    expect(goal.ambition).toBe("Wake at 6:00 AM");
    expect(goal.indicators.right).toEqual(["wake on time"]);
    expect(goal.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(goal.currentRound).toBe(1);
    expect(goal.cat).toBeTruthy();
  });
});
