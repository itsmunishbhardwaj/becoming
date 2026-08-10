import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "./Home.jsx";

vi.mock("../data/store.js", () => ({
  listGoals: vi.fn(),
}));
import { listGoals } from "../data/store.js";

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

beforeEach(() => {
  listGoals.mockReset();
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
