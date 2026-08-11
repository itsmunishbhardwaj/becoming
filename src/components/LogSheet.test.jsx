import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LogSheet from "./LogSheet.jsx";

vi.mock("../data/store.js", () => ({
  listGoals: vi.fn(),
  appendLog: vi.fn().mockResolvedValue(undefined),
}));

import { listGoals, appendLog } from "../data/store.js";

beforeEach(() => {
  listGoals.mockReset();
  appendLog.mockReset().mockResolvedValue(undefined);
});

const WAKE_GOAL = {
  id: "wake-6am", name: "Wake at 6:00 AM", cat: "health", type: "wake",
  state: "active", rounds: [], currentRound: 1,
};
const CADENCE_GOAL = {
  id: "cadence-reset", name: "Cadence reset", cat: "relationships", type: "cadence",
  state: "active", rounds: [], currentRound: 1,
};

describe("LogSheet parse preview", () => {
  it("shows one row per parsed event with routing target", async () => {
    listGoals.mockResolvedValue([WAKE_GOAL, CADENCE_GOAL]);
    render(<LogSheet open onClose={() => {}} onSaved={() => {}} />);
    const ta = await screen.findByRole("textbox");
    fireEvent.change(ta, { target: { value: "woke 07:12\nsession 22:00 · 15min" } });
    await waitFor(() => {
      expect(screen.getAllByText(/woke 07:12/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/session 22:00/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/→\s*wake-6am/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/→\s*cadence-reset/i).length).toBeGreaterThan(0);
    });
  });

  it("marks a session as skipped when no cadence goal is active", async () => {
    listGoals.mockResolvedValue([WAKE_GOAL]);
    render(<LogSheet open onClose={() => {}} onSaved={() => {}} />);
    const ta = await screen.findByRole("textbox");
    fireEvent.change(ta, { target: { value: "session 22:00 · 15min" } });
    await waitFor(() => expect(screen.getByText(/no matching goal/i)).toBeInTheDocument());
  });
});

describe("LogSheet save", () => {
  it("appends only routable events and calls onSaved + onClose", async () => {
    listGoals.mockResolvedValue([WAKE_GOAL, CADENCE_GOAL]);
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<LogSheet open onClose={onClose} onSaved={onSaved} />);
    const ta = await screen.findByRole("textbox");
    fireEvent.change(ta, { target: { value: "woke 07:00\nrandom note\nsession 12 min" } });
    await waitFor(() => expect(screen.getByRole("button", { name: /looks right — save/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /looks right — save/i }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    // Two writes: wake + session. "random note" skipped by parser.
    expect(appendLog).toHaveBeenCalledTimes(2);
    const goalIds = appendLog.mock.calls.map(([, evt]) => evt.goalId);
    expect(goalIds.sort()).toEqual(["cadence-reset", "wake-6am"]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
