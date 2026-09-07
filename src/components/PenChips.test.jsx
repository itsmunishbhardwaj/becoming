import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import PenChips from "./PenChips.jsx";

const GOALS = [{ id: "gym", name: "Gym", cat: "health" }];

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function renderChips(props = {}) {
  return render(
    <PenChips goals={GOALS} penId={null} onPick={() => {}} {...props} />
  );
}

describe("PenChips hold-to-preview", () => {
  it("does not fire onHoldStart on a quick tap", () => {
    const onHoldStart = vi.fn();
    const onPick = vi.fn();
    const { getByText } = renderChips({ onHoldStart, onPick });
    const btn = getByText("Gym").closest("button");
    fireEvent.pointerDown(btn);
    fireEvent.pointerUp(btn);
    fireEvent.click(btn);
    expect(onHoldStart).not.toHaveBeenCalled();
    expect(onPick).toHaveBeenCalledWith("gym");
  });

  it("fires onHoldStart after the hold threshold, and onHoldEnd on release", () => {
    const onHoldStart = vi.fn();
    const onHoldEnd = vi.fn();
    const { getByText } = renderChips({ onHoldStart, onHoldEnd });
    const btn = getByText("Gym").closest("button");
    fireEvent.pointerDown(btn);
    vi.advanceTimersByTime(500);
    expect(onHoldStart).toHaveBeenCalledWith("gym");
    expect(onHoldEnd).not.toHaveBeenCalled();
    fireEvent.pointerUp(btn);
    expect(onHoldEnd).toHaveBeenCalledTimes(1);
  });

  it("suppresses the click (does not call onPick) after a hold fires", () => {
    const onHoldStart = vi.fn();
    const onPick = vi.fn();
    const { getByText } = renderChips({ onHoldStart, onPick });
    const btn = getByText("Gym").closest("button");
    fireEvent.pointerDown(btn);
    vi.advanceTimersByTime(500);
    fireEvent.pointerUp(btn);
    fireEvent.click(btn);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("fires onHoldEnd when the pointer leaves before release", () => {
    const onHoldStart = vi.fn();
    const onHoldEnd = vi.fn();
    const { getByText } = renderChips({ onHoldStart, onHoldEnd });
    const btn = getByText("Gym").closest("button");
    fireEvent.pointerDown(btn);
    vi.advanceTimersByTime(500);
    fireEvent.pointerLeave(btn);
    expect(onHoldEnd).toHaveBeenCalledTimes(1);
  });

  it("cancels the pending hold timer if released before the threshold", () => {
    const onHoldStart = vi.fn();
    const onHoldEnd = vi.fn();
    const { getByText } = renderChips({ onHoldStart, onHoldEnd });
    const btn = getByText("Gym").closest("button");
    fireEvent.pointerDown(btn);
    vi.advanceTimersByTime(200);
    fireEvent.pointerUp(btn);
    vi.advanceTimersByTime(500);
    expect(onHoldStart).not.toHaveBeenCalled();
    expect(onHoldEnd).not.toHaveBeenCalled();
  });
});
