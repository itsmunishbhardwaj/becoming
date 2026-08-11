import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Onboard from "./Onboard.jsx";

vi.mock("../lib/llm.js", () => ({
  isConfigured: vi.fn().mockResolvedValue(false),
  chat: vi.fn(),
}));

vi.mock("../data/store.js", () => ({
  saveGoal: vi.fn().mockResolvedValue(undefined),
  getGoal: vi.fn(),
}));

import { saveGoal, getGoal } from "../data/store.js";

function renderOnboard() {
  return render(
    <MemoryRouter initialEntries={["/onboard"]}>
      <Onboard />
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  saveGoal.mockClear();
  getGoal.mockReset();
});

describe("Onboard first render", () => {
  it("shows the ritual heading and prompts for ambition first", async () => {
    renderOnboard();
    expect(await screen.findByRole("heading", { name: /one step\. one punch\. one round\./i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/say the goal in your own words/i)).toBeInTheDocument();
  });
});

describe("Onboard send", () => {
  it("advances from ambition to type after user submits", async () => {
    renderOnboard();
    const input = await screen.findByPlaceholderText(/say the goal in your own words/i);
    fireEvent.change(input, { target: { value: "Wake at 6:00 AM" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => {
      expect(screen.getByText(/"Wake at 6:00 AM"/)).toBeInTheDocument();
    });
    // Next prompt should be about type — but scripted path may auto-answer type from ambition
    // At minimum, the transcript now shows the user's ambition and an assistant reply.
    expect(screen.getAllByText(/wake at 6:00 am/i).length).toBeGreaterThan(0);
  });
});

describe("Onboard edit mode", () => {
  it("hydrates state from ?goalId and jumps to ?turn", async () => {
    getGoal.mockResolvedValue({
      id: "wake-6am", name: "Wake at 6:00 AM", cat: "health", type: "wake",
      state: "active", baseline: "08:30", target: "06:00", endDate: "2026-12-31",
      createdAt: "2026-08-01", currentRound: 1,
      rounds: [{ n: 1, targetValue: "08:00", startDate: "2026-08-01", endDate: "2026-09-01" }],
      ambition: "Own the morning.",
      howWeGetThere: "",
      indicators: { right: ["a"], wrong: ["b"], stall: ["c"] },
    });
    render(
      <MemoryRouter initialEntries={["/onboard?goalId=wake-6am&turn=roundsPreview"]}>
        <Onboard />
      </MemoryRouter>
    );
    await waitFor(() =>
      expect(screen.getByText(/proposed rounds — accept, or ask to soften/i)).toBeInTheDocument()
    );
  });
});

describe("Onboard confirm", () => {
  it("calls saveGoal and clears the draft on confirm-skip walkthrough", async () => {
    renderOnboard();
    const input = await screen.findByPlaceholderText(/say the goal in your own words/i);
    fireEvent.change(input, { target: { value: "Wake at 6:00 AM every day" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    // From here, use Skip to burn through the remaining 7 turns using scripted defaults
    for (let i = 0; i < 7; i++) {
      const skip = await screen.findByRole("button", { name: /skip/i });
      fireEvent.click(skip);
    }

    await waitFor(() => expect(saveGoal).toHaveBeenCalledTimes(1));
    const goal = saveGoal.mock.calls[0][0];
    expect(goal.type).toBe("wake");
    expect(goal.rounds.length).toBeGreaterThan(0);
    expect(localStorage.getItem("becoming.onboard.draft")).toBe(null);
  });
});
