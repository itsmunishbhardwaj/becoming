import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../data/store.js", () => ({
  getGoal: vi.fn(),
  readLogsInRange: vi.fn().mockResolvedValue([]),
}));

import Goal from "./Goal.jsx";
import { getGoal, readLogsInRange } from "../data/store.js";

const WAKE_GOAL = {
  id: "wake-6am",
  name: "Wake at 6:00 AM",
  cat: "health",
  state: "active",
  type: "wake",
  baseline: "08:30",
  target: "06:00",
  endDate: "2026-12-31",
  createdAt: "2026-08-01",
  currentRound: 2,
  ambition: "Own the morning.",
  howWeGetThere: "30 min earlier every 30 days.",
  rounds: [
    { n: 1, targetValue: "08:00", startDate: "2026-08-01", endDate: "2026-08-31" },
    { n: 2, targetValue: "07:30", startDate: "2026-09-01", endDate: "2026-09-30" },
    { n: 3, targetValue: "07:00", startDate: "2026-10-01", endDate: "2026-12-31" },
  ],
  indicators: { right: [], wrong: [], stall: [] },
};

function renderGoal(id = "wake-6am") {
  return render(
    <MemoryRouter initialEntries={[`/goal/${id}`]}>
      <Routes>
        <Route path="/goal/:id" element={<Goal />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  getGoal.mockReset();
  readLogsInRange.mockReset().mockResolvedValue([]);
});

describe("Goal workspace", () => {
  it("renders ambition, title, current round, and adjust link", async () => {
    getGoal.mockResolvedValue(WAKE_GOAL);
    renderGoal();
    await waitFor(() => expect(screen.getByRole("heading", { name: /Wake at 6:00 AM/i })).toBeInTheDocument());
    expect(screen.getByText(/Own the morning\./)).toBeInTheDocument();
    expect(screen.getByText(/round 2/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /adjust rounds/i })).toHaveAttribute("href", "/onboard?goalId=wake-6am&turn=roundsPreview");
    expect(screen.getByRole("link", { name: /see its year/i })).toHaveAttribute("href", "/year?pen=wake-6am");
    expect(screen.getByRole("link", { name: /life/i })).toHaveAttribute("href", "/");
  });

  it("renders a placeholder when the goal is missing", async () => {
    getGoal.mockResolvedValue(null);
    renderGoal("missing");
    await waitFor(() => expect(screen.getByText(/couldn't find/i)).toBeInTheDocument());
  });
});
