import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import DayCell from "./DayCell.jsx";

const baseProps = {
  monthIdx: 7,
  monthName: "August",
  dayIdx: 17,
  isoDate: "2026-08-18",
  goals: [],
  adherenceMaps: {},
  focus: null,
  pen: null,
  onToggle: () => {},
  onOpen: () => {},
  isToday: false,
  showHalo: false,
};

describe("DayCell halo", () => {
  it("renders no halo when showHalo=false even if isToday", () => {
    const { container } = render(<DayCell {...baseProps} isToday showHalo={false} />);
    const svg = container.querySelector("svg");
    expect(svg.firstChild?.tagName?.toLowerCase()).not.toBe("defs");
  });

  it("renders no halo when isToday=false even if showHalo", () => {
    const { container } = render(<DayCell {...baseProps} isToday={false} showHalo />);
    const svg = container.querySelector("svg");
    expect(svg.firstChild?.tagName?.toLowerCase()).not.toBe("defs");
  });

  it("halo defs is first SVG child when isToday && showHalo", () => {
    const { container } = render(<DayCell {...baseProps} isToday showHalo />);
    const svg = container.querySelector("svg");
    expect(svg.firstChild?.tagName?.toLowerCase()).toBe("defs");
  });

  it("halo circle appears before any blobs", () => {
    const goals = [{ id: "g1", name: "Goal", type: "boolean", category: "health" }];
    const adherenceMaps = { g1: { "2026-08-18": "hit" } };
    const { container } = render(
      <DayCell {...baseProps} goals={goals} adherenceMaps={adherenceMaps} isToday showHalo />
    );
    const svg = container.querySelector("svg");
    // First child = defs (halo gradient/filter), second = circle, then blobs
    expect(svg.firstChild?.tagName?.toLowerCase()).toBe("defs");
    const circle = svg.querySelector("circle");
    expect(circle).not.toBeNull();
    // Circle comes before any <g> (blob wrapper)
    const firstG = svg.querySelector("g");
    if (firstG) {
      const allChildren = Array.from(svg.childNodes);
      const circleIdx = allChildren.indexOf(circle);
      const gIdx = allChildren.indexOf(firstG);
      expect(circleIdx).toBeLessThan(gIdx);
    }
  });
});
