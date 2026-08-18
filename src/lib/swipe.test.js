import { describe, it, expect } from "vitest";
import { classifySwipe } from "./swipe.js";

describe("classifySwipe", () => {
  it("fires 'next' on leftward swipe past threshold in time", () => {
    expect(classifySwipe({ dx: -80, dy: 10, dtMs: 200 })).toBe("next");
  });

  it("fires 'prev' on rightward swipe past threshold in time", () => {
    expect(classifySwipe({ dx: 120, dy: -8, dtMs: 300 })).toBe("prev");
  });

  it("returns null below distance threshold", () => {
    expect(classifySwipe({ dx: -40, dy: 5, dtMs: 200 })).toBeNull();
  });

  it("returns null when too slow", () => {
    expect(classifySwipe({ dx: -120, dy: 0, dtMs: 800 })).toBeNull();
  });

  it("returns null when motion is mostly vertical", () => {
    expect(classifySwipe({ dx: -70, dy: 100, dtMs: 200 })).toBeNull();
  });
});
