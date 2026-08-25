import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase query builder mock — implements the builder pattern + thenable interface.
class MockQuery {
  constructor(data = [], error = null) {
    this._data = data;
    this._error = error;
    this._calls = [];
  }
  select() { return this; }
  eq(col, val) { this._calls.push(["eq", col, val]); return this; }
  gte(col, val) { this._calls.push(["gte", col, val]); return this; }
  lte(col, val) { this._calls.push(["lte", col, val]); return this; }
  order() { return this; }
  delete() { return this; }
  upsert(_row, _opts) { return Promise.resolve({ data: this._data, error: this._error }); }
  single() {
    const d = Array.isArray(this._data) ? (this._data[0] ?? null) : this._data;
    const err = this._error ?? (Array.isArray(this._data) && this._data.length === 0 ? { code: "PGRST116" } : null);
    return Promise.resolve({ data: d, error: err });
  }
  then(resolve, reject) {
    return Promise.resolve({ data: this._data, error: this._error }).then(resolve, reject);
  }
  catch(fn) { return Promise.resolve({ data: this._data, error: this._error }).catch(fn); }
}

const fromMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("../lib/supabase.js", () => ({
  supabase: {
    from: (...args) => fromMock(...args),
    auth: { getSession: (...args) => getSessionMock(...args) },
  },
}));

import * as store from "./store.js";

const SESSION = { data: { session: { user: { id: "uid-test" } } } };

const GOAL_ROW = {
  id: "wake-6am",
  user_id: "uid-test",
  name: "Wake at 6:00 AM",
  cat: "health",
  color: null,
  type: "tracker",
  state: "active",
  baseline: "08:30",
  target: "06:00",
  end_date: "2026-12-31",
  current_round: 1,
  created_at: "2026-08-10T00:00:00Z",
  ambition: "Own the morning.",
  rounds: [{ n: 1, targetValue: "08:00", startDate: "2026-08-10", endDate: "2026-08-24" }],
  how_we_get_there: "Small steps.",
  indicators: { right: ["Wake near target"], wrong: ["Snoozing 45+ min"], stall: ["No wake logs for a week"] },
};

const EVT_ROW = {
  id: "evt-1",
  user_id: "uid-test",
  date: "2026-08-10",
  goal_id: "wake-6am",
  verb: "wake",
  payload: "07:12",
  time: "07:12",
  duration_min: null,
  created_at: "2026-08-10T07:12:00Z",
};

beforeEach(() => {
  fromMock.mockReset();
  getSessionMock.mockReset();
  getSessionMock.mockResolvedValue(SESSION);
});

// ── listGoals ──────────────────────────────────────────────────────────────

describe("listGoals", () => {
  it("maps DB rows to goal objects", async () => {
    fromMock.mockReturnValue(new MockQuery([GOAL_ROW]));
    const goals = await store.listGoals();
    expect(goals).toHaveLength(1);
    expect(goals[0].id).toBe("wake-6am");
    expect(goals[0].name).toBe("Wake at 6:00 AM");
    expect(goals[0].ambition).toBe("Own the morning.");
    expect(goals[0].endDate).toBe("2026-12-31");
    expect(goals[0].currentRound).toBe(1);
    expect(goals[0].color).toBeUndefined(); // null color not spread
  });

  it("returns empty on error", async () => {
    fromMock.mockReturnValue(new MockQuery(null, { message: "boom" }));
    const goals = await store.listGoals();
    expect(goals).toEqual([]);
  });
});

// ── getGoal ────────────────────────────────────────────────────────────────

describe("getGoal", () => {
  it("returns goal for existing id", async () => {
    fromMock.mockReturnValue(new MockQuery([GOAL_ROW]));
    const g = await store.getGoal("wake-6am");
    expect(g.id).toBe("wake-6am");
  });

  it("returns null for missing id", async () => {
    fromMock.mockReturnValue(new MockQuery([]));
    const g = await store.getGoal("nope");
    expect(g).toBeNull();
  });
});

// ── readLog ────────────────────────────────────────────────────────────────

describe("readLog", () => {
  it("returns null when no data for date", async () => {
    fromMock.mockReturnValue(new MockQuery([]));
    const log = await store.readLog("2026-08-10");
    expect(log).toBeNull();
  });

  it("maps event rows to log shape", async () => {
    fromMock.mockImplementation((table) =>
      table === "log_events" ? new MockQuery([EVT_ROW]) : new MockQuery([])
    );
    const log = await store.readLog("2026-08-10");
    expect(log.date).toBe("2026-08-10");
    expect(log.events).toHaveLength(1);
    expect(log.events[0].verb).toBe("wake");
    expect(log.events[0].time).toBe("07:12");
    expect(log.events[0].goalId).toBe("wake-6am");
    expect(log.notes).toEqual({});
  });
});

// ── readLogsInRange ────────────────────────────────────────────────────────

describe("readLogsInRange", () => {
  it("groups events by date and sorts", async () => {
    const rows = [
      { ...EVT_ROW, date: "2026-08-12", id: "e2" },
      { ...EVT_ROW, date: "2026-08-10", id: "e1" },
    ];
    fromMock.mockImplementation((table) =>
      table === "log_events" ? new MockQuery(rows) : new MockQuery([])
    );
    const logs = await store.readLogsInRange({ from: "2026-08-01", to: "2026-08-31" });
    expect(logs.map(l => l.date)).toEqual(["2026-08-10", "2026-08-12"]);
    expect(logs[0].events).toHaveLength(1);
  });
});

// ── appendLog ──────────────────────────────────────────────────────────────

describe("appendLog", () => {
  it("derives payload and calls upsert", async () => {
    const q = new MockQuery();
    const upsertSpy = vi.spyOn(q, "upsert");
    fromMock.mockReturnValue(q);

    await store.appendLog("2026-08-10", { verb: "wake", time: "07:12", goalId: "wake-6am" });

    expect(upsertSpy).toHaveBeenCalledOnce();
    const [row] = upsertSpy.mock.calls[0];
    expect(row.verb).toBe("wake");
    expect(row.payload).toBe("07:12");
    expect(row.goal_id).toBe("wake-6am");
    expect(row.user_id).toBe("uid-test");
    expect(row.date).toBe("2026-08-10");
  });

  it("uses explicit payload when provided", async () => {
    const q = new MockQuery();
    const upsertSpy = vi.spyOn(q, "upsert");
    fromMock.mockReturnValue(q);

    await store.appendLog("2026-08-10", {
      verb: "session", payload: "22:00 · 15min", goalId: "cadence-reset",
    });

    const [row] = upsertSpy.mock.calls[0];
    expect(row.payload).toBe("22:00 · 15min");
  });
});

// ── deleteLogEvent ─────────────────────────────────────────────────────────

describe("deleteLogEvent", () => {
  it("deletes by user, date, goal, verb, payload", async () => {
    const q = new MockQuery();
    fromMock.mockReturnValue(q);

    await store.deleteLogEvent("2026-08-10", { verb: "wake", time: "07:12", goalId: "wake-6am" });

    const eqCalls = q._calls.filter(([m]) => m === "eq").map(([, col, val]) => [col, val]);
    expect(eqCalls).toContainEqual(["user_id", "uid-test"]);
    expect(eqCalls).toContainEqual(["date", "2026-08-10"]);
    expect(eqCalls).toContainEqual(["goal_id", "wake-6am"]);
    expect(eqCalls).toContainEqual(["verb", "wake"]);
    expect(eqCalls).toContainEqual(["payload", "07:12"]);
  });
});

// ── saveNote ───────────────────────────────────────────────────────────────

describe("saveNote", () => {
  it("upserts when text is non-empty", async () => {
    const q = new MockQuery();
    const upsertSpy = vi.spyOn(q, "upsert");
    fromMock.mockReturnValue(q);

    await store.saveNote("2026-08-10", "wake-6am", "felt tired");

    expect(upsertSpy).toHaveBeenCalledOnce();
    const [row] = upsertSpy.mock.calls[0];
    expect(row.text).toBe("felt tired");
    expect(row.goal_id).toBe("wake-6am");
  });

  it("deletes when text is empty", async () => {
    const q = new MockQuery();
    fromMock.mockReturnValue(q);

    await store.saveNote("2026-08-10", "wake-6am", "   ");

    const eqCalls = q._calls.filter(([m]) => m === "eq").map(([, col]) => col);
    expect(eqCalls).toContain("goal_id");
  });
});
