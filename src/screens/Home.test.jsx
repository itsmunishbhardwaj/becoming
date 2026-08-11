import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "./Home.jsx";

vi.mock("../data/store.js", () => ({
  listGoals: vi.fn(),
  readLogsInRange: vi.fn().mockResolvedValue([]),
  saveGoal: vi.fn().mockResolvedValue(undefined),
}));
import { listGoals, readLogsInRange, saveGoal } from "../data/store.js";

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

beforeEach(() => {
  listGoals.mockReset();
  readLogsInRange.mockReset();
  saveGoal.mockReset();
  readLogsInRange.mockResolvedValue([]);
  saveGoal.mockResolvedValue(undefined);
});

describe("Home empty state", () => {
  it("shows the CTA when no goals exist", async () => {
    listGoals.mockResolvedValue([]);
    renderHome();
    await waitFor(() =>
      expect(screen.getByText(/set your first goal/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/no goals yet/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /who are you becoming/i })).toBeInTheDocument();
  });
});

describe("Home auto-advances rounds", () => {
  it("bumps currentRound + saves when today is past round window", async () => {
    // A goal where round 1 ends 2026-08-01 but currentRound is stuck at 1
    listGoals.mockResolvedValue([{
      id: "wake-6am", name: "Wake at 6:00 AM", cat: "health", state: "active", type: "wake",
      baseline: "08:30", target: "06:00", endDate: "2026-12-31", createdAt: "2026-01-01",
      currentRound: 1,
      rounds: [
        { n: 1, targetValue: "08:00", startDate: "2026-01-01", endDate: "2026-01-31" },
        { n: 2, targetValue: "07:30", startDate: "2026-02-01", endDate: "2026-12-31" },
      ],
      ambition: "", howWeGetThere: "",
      indicators: { right: [], wrong: [], stall: [] },
      headline: { n: 0, unit: "days marked" },
    }]);
    readLogsInRange.mockResolvedValue([]);
    renderHome();
    await waitFor(() => expect(saveGoal).toHaveBeenCalledTimes(1));
    const saved = saveGoal.mock.calls[0][0];
    expect(saved.currentRound).toBe(2);
  });
});

describe("Home insights", () => {
  it("renders an insight when a goal has drifted 7+ days", async () => {
    listGoals.mockResolvedValue([{
      id: "wake-6am", name: "Wake at 6:00 AM", cat: "health", state: "active", type: "wake",
      baseline: "08:30", target: "06:00", endDate: "2026-12-31", createdAt: "2026-01-01",
      currentRound: 1,
      rounds: [{ n: 1, targetValue: "08:00", startDate: "2026-01-01", endDate: "2026-12-31" }],
      ambition: "", howWeGetThere: "",
      indicators: { right: [], wrong: [], stall: [] },
      headline: { n: 0, unit: "days marked" },
    }]);
    readLogsInRange.mockResolvedValue([]);
    renderHome();
    await waitFor(() => expect(screen.getByText(/a quiet one/i)).toBeInTheDocument());
    expect(screen.getByText(/still on it/i)).toBeInTheDocument();
  });
});

describe("Home populated state", () => {
  it("renders one GoalCard per goal", async () => {
    listGoals.mockResolvedValue([
      { id: "wake-6am", name: "Wake at 6:00 AM", cat: "health", state: "active",
        ambition: "", type: "wake", baseline: "08:30", target: "06:00",
        rounds: [], currentRound: 1, indicators: { right: [], wrong: [], stall: [] },
        headline: { n: 0, unit: "days marked" } },
      { id: "cadence-reset", name: "Cadence reset", cat: "relationships", state: "active",
        ambition: "", type: "cadence", baseline: { intervalDays: 1 }, target: { intervalDays: 7 },
        rounds: [], currentRound: 1, indicators: { right: [], wrong: [], stall: [] },
        headline: { n: 0, unit: "days marked" } },
    ]);
    renderHome();
    await waitFor(() => {
      expect(screen.getByText("Wake at 6:00 AM")).toBeInTheDocument();
      expect(screen.getByText("Cadence reset")).toBeInTheDocument();
    });
  });
});
