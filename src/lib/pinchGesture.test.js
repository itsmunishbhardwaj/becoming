import { describe, it, expect } from "vitest";
import { centroidOf, distanceOf, classifyPinch } from "./pinchGesture.js";

describe("centroidOf", () => {
  it("midpoint of two points", () => {
    const c = centroidOf([{ x: 0, y: 0 }, { x: 100, y: 60 }]);
    expect(c).toEqual({ x: 50, y: 30 });
  });

  it("centroid of three points", () => {
    const c = centroidOf([{ x: 0, y: 0 }, { x: 90, y: 0 }, { x: 45, y: 90 }]);
    expect(c.x).toBeCloseTo(45);
    expect(c.y).toBeCloseTo(30);
  });
});

describe("distanceOf", () => {
  it("horizontal distance", () => {
    expect(distanceOf([{ x: 0, y: 0 }, { x: 100, y: 0 }])).toBe(100);
  });

  it("diagonal (3-4-5 triple)", () => {
    expect(distanceOf([{ x: 0, y: 0 }, { x: 3, y: 4 }])).toBe(5);
  });
});

describe("classifyPinch", () => {
  it("returns 'in' on spread (ratio ≥ 1.35)", () => {
    expect(classifyPinch({ ratio: 1.5, elapsed: 200 })).toBe("in");
    expect(classifyPinch({ ratio: 1.35, elapsed: 200 })).toBe("in");
  });

  it("returns 'out' on squeeze (ratio ≤ 0.75)", () => {
    expect(classifyPinch({ ratio: 0.6, elapsed: 200 })).toBe("out");
    expect(classifyPinch({ ratio: 0.75, elapsed: 200 })).toBe("out");
  });

  it("returns null when ratio between thresholds", () => {
    expect(classifyPinch({ ratio: 1.0, elapsed: 200 })).toBeNull();
    expect(classifyPinch({ ratio: 1.1, elapsed: 200 })).toBeNull();
    expect(classifyPinch({ ratio: 0.9, elapsed: 200 })).toBeNull();
  });

  it("returns null when gesture too slow", () => {
    expect(classifyPinch({ ratio: 1.5, elapsed: 500 })).toBeNull();
  });
});
