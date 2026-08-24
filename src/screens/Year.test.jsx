import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../data/store.js", () => ({
  listGoals: vi.fn(),
  readLogsInRange: vi.fn(),
  appendLog: vi.fn().mockResolvedValue(undefined),
}));

import Year from "./Year.jsx";
import { listGoals, readLogsInRange } from "../data/store.js";

const WAKE_GOAL = {
  id: "wake-6am", name: "Wake at 6:00 AM", cat: "health", type: "tracker",
  baseline: "08:30",
  state: "active", currentRound: 1,
  rounds: [{ n: 1, targetValue: "08:00", startDate: "2026-01-01", endDate: "2026-12-31" }],
};

function renderYear() {
  return render(<MemoryRouter><Year /></MemoryRouter>);
}

beforeEach(() => {
  listGoals.mockReset();
  readLogsInRange.mockReset();
});

describe("Year loads goals and log range", () => {
  it("fetches goals + log range on mount", async () => {
    listGoals.mockResolvedValue([WAKE_GOAL]);
    readLogsInRange.mockResolvedValue([]);
    renderYear();
    await waitFor(() => expect(listGoals).toHaveBeenCalled());
    expect(readLogsInRange).toHaveBeenCalled();
  });

  it("shows the pen chip for the goal", async () => {
    listGoals.mockResolvedValue([WAKE_GOAL]);
    readLogsInRange.mockResolvedValue([]);
    renderYear();
    await waitFor(() => expect(screen.getByText(/Wake at 6:00 AM/)).toBeInTheDocument());
  });
});
