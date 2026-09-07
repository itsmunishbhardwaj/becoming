import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("../data/store.js", () => ({
  listGoals: vi.fn(),
  readLogsInRange: vi.fn(),
  appendLog: vi.fn().mockResolvedValue(undefined),
  deleteLogEvent: vi.fn().mockResolvedValue(undefined),
}));

import Week from "./Week.jsx";
import { listGoals, readLogsInRange, appendLog } from "../data/store.js";

const GOAL = {
  id: "gym", name: "Gym", cat: "health", type: "tracker",
  baseline: null,
  endDate: "2026-09-09",
  state: "active", currentRound: 1,
  rounds: [],
};

function renderWeek() {
  return render(
    <MemoryRouter initialEntries={["/week/2026-09-06"]}>
      <Routes>
        <Route path="/week/:yyyymmdd" element={<Week />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  listGoals.mockReset();
  readLogsInRange.mockReset();
  appendLog.mockClear();
});

describe("Week respects goal end date", () => {
  it("does not log a day past the goal's end date", async () => {
    listGoals.mockResolvedValue([GOAL]);
    readLogsInRange.mockResolvedValue([]);
    renderWeek();
    await waitFor(() => expect(screen.getByText("Gym")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Gym"));

    const dayPastEnd = document.querySelector('[data-iso="2026-09-12"]');
    expect(dayPastEnd).toBeTruthy();
    fireEvent.click(dayPastEnd);
    expect(appendLog).not.toHaveBeenCalled();
  });

  it("logs a day within the goal's end date", async () => {
    listGoals.mockResolvedValue([GOAL]);
    readLogsInRange.mockResolvedValue([]);
    renderWeek();
    await waitFor(() => expect(screen.getByText("Gym")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Gym"));

    const dayWithinEnd = document.querySelector('[data-iso="2026-09-08"]');
    expect(dayWithinEnd).toBeTruthy();
    fireEvent.click(dayWithinEnd);
    await waitFor(() => expect(appendLog).toHaveBeenCalled());
  });
});
