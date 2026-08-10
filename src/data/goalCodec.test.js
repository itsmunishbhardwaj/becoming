import { describe, it, expect } from "vitest";
import { parseGoal, serializeGoal } from "./goalCodec.js";

const SAMPLE = `---
id: wake-6am
name: Wake at 6:00 AM
cat: health
type: wake
state: active
baseline: "08:30"
target: "06:00"
endDate: 2026-12-31
currentRound: 1
createdAt: 2026-08-10
---
## Ambition
Own the morning before the world does.

## Rounds
| # | Target | Start | End |
|---|--------|-------|-----|
| 1 | 08:00 | 2026-08-10 | 2026-08-24 |
| 2 | 07:30 | 2026-08-25 | 2026-09-07 |

## How we get there
30 min earlier every 2 weeks.

## Right direction
- Wake within 15 min of target 5+ days/week
- Bedtime moves earlier naturally

## Wrong direction
- Snoozing past target by 45+ min

## No movement
- 7+ days no wake logged
`;

describe("parseGoal", () => {
  it("parses front-matter, ambition, rounds table, indicators", () => {
    const g = parseGoal(SAMPLE);
    expect(g.id).toBe("wake-6am");
    expect(g.type).toBe("wake");
    expect(g.baseline).toBe("08:30");
    expect(g.currentRound).toBe(1);
    expect(g.ambition).toBe("Own the morning before the world does.");
    expect(g.rounds).toEqual([
      { n: 1, targetValue: "08:00", startDate: "2026-08-10", endDate: "2026-08-24" },
      { n: 2, targetValue: "07:30", startDate: "2026-08-25", endDate: "2026-09-07" },
    ]);
    expect(g.howWeGetThere).toBe("30 min earlier every 2 weeks.");
    expect(g.indicators.right).toEqual([
      "Wake within 15 min of target 5+ days/week",
      "Bedtime moves earlier naturally",
    ]);
    expect(g.indicators.wrong).toEqual(["Snoozing past target by 45+ min"]);
    expect(g.indicators.stall).toEqual(["7+ days no wake logged"]);
  });
});

describe("serializeGoal round-trip", () => {
  it("parse then serialize then parse yields same shape", () => {
    const g1 = parseGoal(SAMPLE);
    const out = serializeGoal(g1);
    const g2 = parseGoal(out);
    expect(g2).toEqual(g1);
  });
});

describe("cadence goal round-trip", () => {
  it("stores intervalDays via 'every Nd' in rounds table", () => {
    const src = `---
id: cadence-reset
name: Cadence reset
cat: health
type: cadence
state: active
baseline: {"intervalDays":1}
target: {"intervalDays":7}
endDate: 2026-12-31
currentRound: 1
createdAt: 2026-08-10
---
## Ambition
A healthy rhythm.

## Rounds
| # | Target | Start | End |
|---|--------|-------|-----|
| 1 | every 2d | 2026-08-10 | 2026-08-24 |
| 2 | every 3d | 2026-08-25 | 2026-09-07 |

## How we get there
Widen intervals across four months.

## Right direction
- Green days matched

## Wrong direction
- Sessions on non-green days

## No movement
- No logs in 14 days
`;
    const g1 = parseGoal(src);
    expect(g1.baseline).toEqual({ intervalDays: 1 });
    expect(g1.rounds[0].targetValue).toEqual({ intervalDays: 2 });
    const g2 = parseGoal(serializeGoal(g1));
    expect(g2).toEqual(g1);
  });
});
