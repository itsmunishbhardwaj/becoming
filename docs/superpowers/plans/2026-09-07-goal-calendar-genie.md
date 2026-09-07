# Goal → Calendar Genie Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the calendar the obvious next destination from a goal page: a mini month calendar at the bottom of `Goal.jsx`, scoped to that one goal, that morphs (native per-cell view transition) into the full `Month.jsx` page when tapped or dragged up.

**Architecture:** Extract the day-grid Month.jsx already renders into a reusable `MonthGrid` component so the exact same cells (same `view-transition-name` per date) exist on both the mini calendar and the full page. Wrap the navigation between them in `document.startViewTransition` so the browser interpolates each day cell natively. A shared `planDayTap` decision function replaces logic currently duplicated across `Month.jsx`/`Week.jsx` so the end-date/cadence guard has one source of truth.

**Tech Stack:** React 18, react-router-dom v6.26 (`BrowserRouter`, not a data router — no built-in view-transition support, hence the manual `document.startViewTransition`), `motion/react` (framer-motion, already used in `LogSheet.jsx` for the drag-handle pattern this reuses), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-07-goal-calendar-genie-design.md`

## Global Constraints

- No pure white/black, no red anywhere — use `PAPER` tokens from `src/tokens.js` only (brand.md rule 1, 3).
- Irregular corner radii on cards — use `RADIUS.r1`/`r2`, never a plain rectangle (brand.md rule 5).
- Respect `prefers-reduced-motion` — skip the view transition, just navigate (brand.md rule 10).
- Category color = identity — never hardcode a hex; always `goalColor(goal)`.
- `document.startViewTransition` is unsupported in some browsers and in jsdom (test environment) — every call site must feature-detect and fall back to a plain `navigate()`.
- One PR per logical change; branch off `main`; conventional commit subjects; tests + build must pass before merge (repo `CLAUDE.md` git workflow).

---

### Task 1: `calendarMonth` date helpers

**Files:**
- Create: `src/lib/calendarMonth.js`
- Test: `src/lib/calendarMonth.test.js`

**Interfaces:**
- Produces: `daysInMonth(year, monthIdx) -> number`, `isoAtDay(year, monthIdx, dayIdx) -> "YYYY-MM-DD"`, `leadOffsetFor(year, monthIdx) -> number` (0-6, JS `Date.getDay()` of the 1st).

- [ ] **Step 1: Write the failing test**

```js
// src/lib/calendarMonth.test.js
import { describe, it, expect } from "vitest";
import { daysInMonth, isoAtDay, leadOffsetFor } from "./calendarMonth.js";

describe("daysInMonth", () => {
  it("returns 30 for September 2026", () => {
    expect(daysInMonth(2026, 8)).toBe(30);
  });
  it("returns 29 for February in a leap year", () => {
    expect(daysInMonth(2028, 1)).toBe(29);
  });
});

describe("isoAtDay", () => {
  it("builds a zero-padded ISO date", () => {
    expect(isoAtDay(2026, 8, 0)).toBe("2026-09-01");
    expect(isoAtDay(2026, 0, 4)).toBe("2026-01-05");
  });
});

describe("leadOffsetFor", () => {
  it("returns the day-of-week of the 1st (0=Sunday)", () => {
    // Sept 1, 2026 is a Tuesday
    expect(leadOffsetFor(2026, 8)).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/calendarMonth.test.js`
Expected: FAIL — `Cannot find module './calendarMonth.js'`

- [ ] **Step 3: Write minimal implementation**

```js
// src/lib/calendarMonth.js
export function daysInMonth(year, monthIdx) {
  return new Date(year, monthIdx + 1, 0).getDate();
}

export function isoAtDay(year, monthIdx, dayIdx) {
  return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(dayIdx + 1).padStart(2, "0")}`;
}

export function leadOffsetFor(year, monthIdx) {
  return new Date(year, monthIdx, 1).getDay();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/calendarMonth.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendarMonth.js src/lib/calendarMonth.test.js
git commit -m "feat: add shared calendar-month date helpers"
```

---

### Task 2: `planDayTap` shared tap decision

**Files:**
- Create: `src/data/dayTap.js`
- Test: `src/data/dayTap.test.js`

**Interfaces:**
- Consumes: `isScheduledDay` from `src/data/goalTypes/cadence.js` (existing, signature `isScheduledDay({date, currentRound}) -> boolean`).
- Produces: `planDayTap({goal, dateISO, existingEvent}) -> null | {type: "delete", event} | {type: "append", event}`.

- [ ] **Step 1: Write the failing test**

```js
// src/data/dayTap.test.js
import { describe, it, expect } from "vitest";
import { planDayTap } from "./dayTap.js";

const SIMPLE_GOAL = { id: "read", baseline: null, endDate: "2026-09-30" };
const WAKE_GOAL = { id: "wake-6am", baseline: "07:00", endDate: "2026-09-30" };
const CADENCE_GOAL = {
  id: "gym",
  baseline: { intervalDays: 2 },
  endDate: "2026-09-30",
  rounds: [{ n: 1, targetValue: { intervalDays: 2 }, startDate: "2026-09-01", endDate: "2026-09-30" }],
};

describe("planDayTap", () => {
  it("returns null for a date past the goal's end date", () => {
    expect(planDayTap({ goal: SIMPLE_GOAL, dateISO: "2026-10-01", existingEvent: null })).toBeNull();
  });

  it("returns null for a fixed cadence day that's already scheduled", () => {
    // interval 2, round starts 2026-09-01 -> scheduled on the 1st, 3rd, 5th...
    expect(planDayTap({ goal: CADENCE_GOAL, dateISO: "2026-09-03", existingEvent: null })).toBeNull();
  });

  it("returns a delete plan when an event already exists that day", () => {
    const existingEvent = { verb: "done", goalId: "read" };
    expect(planDayTap({ goal: SIMPLE_GOAL, dateISO: "2026-09-05", existingEvent })).toEqual({
      type: "delete",
      event: existingEvent,
    });
  });

  it("builds a 'done' append event for a simple goal", () => {
    expect(planDayTap({ goal: SIMPLE_GOAL, dateISO: "2026-09-05", existingEvent: null })).toEqual({
      type: "append",
      event: { verb: "done", goalId: "read" },
    });
  });

  it("builds a 'wake' append event for a wake goal", () => {
    expect(planDayTap({ goal: WAKE_GOAL, dateISO: "2026-09-05", existingEvent: null })).toEqual({
      type: "append",
      event: { verb: "wake", time: "07:00", goalId: "wake-6am" },
    });
  });

  it("builds a 'session' append event for a cadence goal on a non-scheduled day", () => {
    // interval 2, round starts the 1st -> the 2nd is not a scheduled (green) day
    expect(planDayTap({ goal: CADENCE_GOAL, dateISO: "2026-09-02", existingEvent: null })).toEqual({
      type: "append",
      event: { verb: "session", durationMin: 10, goalId: "gym" },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/dayTap.test.js`
Expected: FAIL — `Cannot find module './dayTap.js'`

- [ ] **Step 3: Write minimal implementation**

```js
// src/data/dayTap.js
import { isScheduledDay as cadenceIsScheduledDay } from "./goalTypes/cadence.js";

// Decides what tapping a calendar day should do for a goal. Returns null
// for a no-op tap (past the goal's end date, or a fixed cadence day that's
// already scheduled); otherwise the event to delete or append.
export function planDayTap({ goal, dateISO, existingEvent }) {
  if (goal.endDate && dateISO > goal.endDate) return null;
  if (goal.baseline?.intervalDays != null) {
    const round = (goal.rounds || []).find((r) => dateISO >= r.startDate && dateISO <= r.endDate);
    if (round && cadenceIsScheduledDay({ date: dateISO, currentRound: round })) return null;
  }
  if (existingEvent) return { type: "delete", event: existingEvent };
  const event =
    typeof goal.baseline === "string"
      ? { verb: "wake", time: "07:00", goalId: goal.id }
      : goal.baseline?.intervalDays != null
        ? { verb: "session", durationMin: 10, goalId: goal.id }
        : { verb: "done", goalId: goal.id };
  return { type: "append", event };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/dayTap.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/data/dayTap.js src/data/dayTap.test.js
git commit -m "feat: add planDayTap shared calendar-tap decision logic"
```

---

### Task 3: Switch `Month.jsx` to `planDayTap`

**Files:**
- Modify: `src/screens/Month.jsx:6-7` (imports), `src/screens/Month.jsx:128-149` (`onDayTap`)
- Test: `src/screens/Month.test.jsx` (existing — must still pass unchanged)

**Interfaces:**
- Consumes: `planDayTap` from Task 2 (`src/data/dayTap.js`).

- [ ] **Step 1: Confirm the existing regression test still describes the behavior**

`src/screens/Month.test.jsx` already has "does not log a day past the goal's end date" and "logs a day within the goal's end date" — these are the regression guard for this refactor. No new test needed; re-run after the change.

- [ ] **Step 2: Replace the import**

In `src/screens/Month.jsx`, remove line 7:
```js
import { isScheduledDay as cadenceIsScheduledDay } from "../data/goalTypes/cadence.js";
```
Add in its place:
```js
import { planDayTap } from "../data/dayTap.js";
```

- [ ] **Step 3: Replace `onDayTap`'s body**

Replace lines 128-149:
```js
  const onDayTap = useCallback(async ({ dateISO }) => {
    if (!pen) return;
    if (pen.endDate && dateISO > pen.endDate) return;
    if (pen.baseline?.intervalDays != null) {
      const round = pen.rounds.find((r) => dateISO >= r.startDate && dateISO <= r.endDate);
      if (round && cadenceIsScheduledDay({ date: dateISO, currentRound: round })) return;
    }
    const existing = penEventByDate[dateISO];
    if (existing) {
      await deleteLogEvent(dateISO, existing);
      await refreshLogs();
      return;
    }
    const event =
      typeof pen.baseline === "string"
        ? { verb: "wake", time: "07:00", goalId: pen.id }
        : pen.baseline?.intervalDays != null
          ? { verb: "session", durationMin: 10, goalId: pen.id }
          : { verb: "done", goalId: pen.id };
    await appendLog(dateISO, event);
    await refreshLogs();
  }, [pen, penEventByDate, refreshLogs]);
```
with:
```js
  const onDayTap = useCallback(async ({ dateISO }) => {
    if (!pen) return;
    const plan = planDayTap({ goal: pen, dateISO, existingEvent: penEventByDate[dateISO] });
    if (!plan) return;
    if (plan.type === "delete") await deleteLogEvent(dateISO, plan.event);
    else await appendLog(dateISO, plan.event);
    await refreshLogs();
  }, [pen, penEventByDate, refreshLogs]);
```

- [ ] **Step 4: Run the existing tests**

Run: `npx vitest run src/screens/Month.test.jsx`
Expected: PASS (2 tests, unchanged assertions)

- [ ] **Step 5: Commit**

```bash
git add src/screens/Month.jsx
git commit -m "refactor: use planDayTap in Month.jsx onDayTap"
```

---

### Task 4: Switch `Week.jsx` to `planDayTap`, add regression test

**Files:**
- Modify: `src/screens/Week.jsx:6` (import), `src/screens/Week.jsx:113-134` (`onDayTap`)
- Create: `src/screens/Week.test.jsx`

**Interfaces:**
- Consumes: `planDayTap` from Task 2.

- [ ] **Step 1: Write the failing regression test**

```js
// src/screens/Week.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("../data/store.js", () => ({
  listGoals: vi.fn(),
  readLogsInRange: vi.fn(),
  appendLog: vi.fn().mockResolvedValue(undefined),
  deleteLogEvent: vi.fn().mockResolvedValue(undefined),
}));

import Week from "./Week.jsx";
import { listGoals, readLogsInRange, appendLog } from "../data/store.js";

const GOAL = {
  id: "gym", name: "Gym", cat: "health", type: "tracker",
  baseline: null,
  endDate: "2026-09-09",
  state: "active", currentRound: 1,
  rounds: [],
};

function renderWeek() {
  return render(
    <MemoryRouter initialEntries={["/week/2026-09-06"]}>
      <Routes>
        <Route path="/week/:yyyymmdd" element={<Week />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  listGoals.mockReset();
  readLogsInRange.mockReset();
  appendLog.mockClear();
});

describe("Week respects goal end date", () => {
  it("does not log a day past the goal's end date", async () => {
    listGoals.mockResolvedValue([GOAL]);
    readLogsInRange.mockResolvedValue([]);
    renderWeek();
    await waitFor(() => expect(screen.getByText("Gym")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Gym"));

    const dayPastEnd = document.querySelector('[data-iso="2026-09-12"]');
    expect(dayPastEnd).toBeTruthy();
    fireEvent.click(dayPastEnd);
    expect(appendLog).not.toHaveBeenCalled();
  });

  it("logs a day within the goal's end date", async () => {
    listGoals.mockResolvedValue([GOAL]);
    readLogsInRange.mockResolvedValue([]);
    renderWeek();
    await waitFor(() => expect(screen.getByText("Gym")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Gym"));

    const dayWithinEnd = document.querySelector('[data-iso="2026-09-08"]');
    expect(dayWithinEnd).toBeTruthy();
    fireEvent.click(dayWithinEnd);
    await waitFor(() => expect(appendLog).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/screens/Week.test.jsx`
Expected: The end-date case FAILS today — `Week.jsx`'s current `onDayTap` already has the guard from the prior feature, so this might actually PASS already. If it passes already, that's fine (it's now a locked-in regression test); proceed straight to Step 3's refactor and re-run to confirm it still passes after.

- [ ] **Step 3: Replace the import**

In `src/screens/Week.jsx`, remove line 6:
```js
import { isScheduledDay as cadenceIsScheduledDay } from "../data/goalTypes/cadence.js";
```
Add:
```js
import { planDayTap } from "../data/dayTap.js";
```

- [ ] **Step 4: Replace `onDayTap`'s body**

Replace lines 113-134:
```js
  const onDayTap = useCallback(async ({ dateISO }) => {
    if (!pen) return;
    if (pen.endDate && dateISO > pen.endDate) return;
    if (pen.baseline?.intervalDays != null) {
      const round = pen.rounds.find((r) => dateISO >= r.startDate && dateISO <= r.endDate);
      if (round && cadenceIsScheduledDay({ date: dateISO, currentRound: round })) return;
    }
    const existing = penEventByDate[dateISO];
    if (existing) {
      await deleteLogEvent(dateISO, existing);
      await refreshLogs();
      return;
    }
    const event =
      typeof pen.baseline === "string"
        ? { verb: "wake", time: "07:00", goalId: pen.id }
        : pen.baseline?.intervalDays != null
          ? { verb: "session", durationMin: 10, goalId: pen.id }
          : { verb: "done", goalId: pen.id };
    await appendLog(dateISO, event);
    await refreshLogs();
  }, [pen, penEventByDate, refreshLogs]);
```
with:
```js
  const onDayTap = useCallback(async ({ dateISO }) => {
    if (!pen) return;
    const plan = planDayTap({ goal: pen, dateISO, existingEvent: penEventByDate[dateISO] });
    if (!plan) return;
    if (plan.type === "delete") await deleteLogEvent(dateISO, plan.event);
    else await appendLog(dateISO, plan.event);
    await refreshLogs();
  }, [pen, penEventByDate, refreshLogs]);
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/screens/Week.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add src/screens/Week.jsx src/screens/Week.test.jsx
git commit -m "refactor: use planDayTap in Week.jsx onDayTap, add regression test"
```

---

### Task 5: `DayCell` gets a `viewTransitionId` prop

**Files:**
- Modify: `src/components/DayCell.jsx`
- Test: `src/components/DayCell.test.jsx`

**Interfaces:**
- Produces: new optional prop `viewTransitionId` (string | undefined) on `DayCell`. When set, the root `<svg>`'s inline style gets `view-transition-name: <viewTransitionId>`.

- [ ] **Step 1: Write the failing test**

Add to `src/components/DayCell.test.jsx`:
```js
describe("DayCell view transition", () => {
  it("sets view-transition-name when viewTransitionId is provided", () => {
    const { container } = render(<DayCell {...baseProps} viewTransitionId="cal-cell-2026-08-18" />);
    const svg = container.querySelector("svg");
    expect(svg.getAttribute("style")).toContain("view-transition-name: cal-cell-2026-08-18");
  });

  it("omits view-transition-name when viewTransitionId is not provided", () => {
    const { container } = render(<DayCell {...baseProps} />);
    const svg = container.querySelector("svg");
    expect(svg.getAttribute("style")).not.toContain("view-transition-name");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/DayCell.test.jsx`
Expected: FAIL — first new test, `view-transition-name` not present

- [ ] **Step 3: Add the prop**

In `src/components/DayCell.jsx`, add `viewTransitionId` to the destructured props (after `hideDayNumber = false,`):
```js
  hideDayNumber = false,
  viewTransitionId,
}) {
```
Then in the `<svg>`'s `style` object, add the new key:
```js
      style={{
        display: "block", width: "100%", height: "auto",
        cursor: "pointer",
        overflow: (haloOn || blobScale > 1) ? "visible" : undefined,
        viewTransitionName: viewTransitionId || undefined,
      }}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/DayCell.test.jsx`
Expected: PASS (6 tests total)

- [ ] **Step 5: Commit**

```bash
git add src/components/DayCell.jsx src/components/DayCell.test.jsx
git commit -m "feat: add viewTransitionId prop to DayCell"
```

---

### Task 6: `MonthGrid` reusable day-grid component

**Files:**
- Create: `src/components/MonthGrid.jsx`
- Test: `src/components/MonthGrid.test.jsx`

**Interfaces:**
- Consumes: `daysInMonth`, `isoAtDay`, `leadOffsetFor` (Task 1); `DayCell` (Task 5, for `viewTransitionId`).
- Produces:
  ```
  <MonthGrid
    year monthIdx
    goals adherenceMaps focus pen
    onDayTap={(iso) => void}
    onOpenDay={(iso) => void}
    todayISO
    blobScale={number}
    projectedDates={Set<string> | null}
    cellMaxWidth={string}      // default "clamp(44px, 8vw, 64px)"
    gap={string}               // default "clamp(6px, 1vw, 14px)"
    showWeekPills={boolean}    // default false
    onWeekPillClick={(sundayISO) => void}
    transitionClassName={string}
    gridRef={React.Ref}
  />
  ```
  Every rendered day cell gets `viewTransitionId={`cal-cell-${iso}`}`.

- [ ] **Step 1: Write the failing test**

```js
// src/components/MonthGrid.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import MonthGrid from "./MonthGrid.jsx";

describe("MonthGrid", () => {
  it("renders one cell per day of the month", () => {
    const { container } = render(
      <MonthGrid year={2026} monthIdx={8} goals={[]} adherenceMaps={{}} focus={null} pen={null}
        onDayTap={() => {}} onOpenDay={() => {}} todayISO="2026-09-07" />
    );
    // September 2026 has 30 days
    expect(container.querySelectorAll("[data-iso]").length).toBe(30);
  });

  it("calls onDayTap with the tapped cell's ISO date", () => {
    const onDayTap = vi.fn();
    const { container } = render(
      <MonthGrid year={2026} monthIdx={8} goals={[]} adherenceMaps={{}} focus={null} pen={null}
        onDayTap={onDayTap} onOpenDay={() => {}} todayISO="2026-09-07" />
    );
    fireEvent.click(container.querySelector('[data-iso="2026-09-15"]'));
    expect(onDayTap).toHaveBeenCalledWith("2026-09-15");
  });

  it("gives every cell a matching view-transition-name", () => {
    const { container } = render(
      <MonthGrid year={2026} monthIdx={8} goals={[]} adherenceMaps={{}} focus={null} pen={null}
        onDayTap={() => {}} onOpenDay={() => {}} todayISO="2026-09-07" />
    );
    const cell = container.querySelector('[data-iso="2026-09-01"]');
    expect(cell.getAttribute("style")).toContain("view-transition-name: cal-cell-2026-09-01");
  });

  it("omits the week-pill column when showWeekPills is false", () => {
    const { container } = render(
      <MonthGrid year={2026} monthIdx={8} goals={[]} adherenceMaps={{}} focus={null} pen={null}
        onDayTap={() => {}} onOpenDay={() => {}} todayISO="2026-09-07" showWeekPills={false} />
    );
    expect(container.querySelectorAll("[aria-label^='Week of']").length).toBe(0);
  });

  it("renders the week-pill column when showWeekPills is true", () => {
    const { container } = render(
      <MonthGrid year={2026} monthIdx={8} goals={[]} adherenceMaps={{}} focus={null} pen={null}
        onDayTap={() => {}} onOpenDay={() => {}} todayISO="2026-09-07" showWeekPills onWeekPillClick={() => {}} />
    );
    expect(container.querySelectorAll("[aria-label^='Week of']").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/MonthGrid.test.jsx`
Expected: FAIL — `Cannot find module './MonthGrid.jsx'`

- [ ] **Step 3: Write the implementation**

```jsx
// src/components/MonthGrid.jsx
import React from "react";
import { PAPER } from "../tokens.js";
import { daysInMonth, isoAtDay, leadOffsetFor } from "../lib/calendarMonth.js";
import DayCell from "./DayCell.jsx";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Pure month day-grid: DOW header + one DayCell per date. Used at full size
// by Month.jsx and at a smaller size by Goal.jsx's mini calendar — both give
// every cell a matching `cal-cell-<iso>` view-transition-name, so navigating
// between them inside document.startViewTransition morphs each cell natively.
// See docs/superpowers/specs/2026-09-07-goal-calendar-genie-design.md.
export default function MonthGrid({
  year,
  monthIdx,
  goals,
  adherenceMaps,
  focus,
  pen,
  onDayTap,
  onOpenDay,
  todayISO,
  blobScale = 1,
  projectedDates,
  cellMaxWidth = "clamp(44px, 8vw, 64px)",
  gap = "clamp(6px, 1vw, 14px)",
  showWeekPills = false,
  onWeekPillClick,
  transitionClassName = "",
  gridRef,
}) {
  const dayCount = daysInMonth(year, monthIdx);
  const leadOffset = leadOffsetFor(year, monthIdx);
  const monthName = MONTH_NAMES[monthIdx];
  const cols = showWeekPills ? "repeat(7, 1fr) 28px" : "repeat(7, 1fr)";

  const dowRowStyle = {
    display: "grid",
    gridTemplateColumns: cols,
    gap,
    justifyItems: "center",
    marginBottom: 6,
  };
  const dowCellStyle = {
    fontFamily: "'Instrument Sans', 'Inter', system-ui, sans-serif",
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.08em",
    color: PAPER.ink,
    opacity: 0.32,
  };
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: cols,
    gap,
    justifyItems: "center",
    alignItems: "center",
  };
  const cellWrapStyle = { width: "100%", maxWidth: cellMaxWidth };
  const weekPillStyle = {
    width: 22, height: 22, borderRadius: 999,
    border: `1px solid ${PAPER.line}`, background: "transparent",
    color: PAPER.dim, fontSize: 12, cursor: "pointer",
    display: "grid", placeItems: "center",
    padding: 0, flexShrink: 0,
    lineHeight: 1,
  };

  return (
    <div>
      <div style={dowRowStyle}>
        {DAY_LETTERS.map((l, i) => (
          <span key={i} style={dowCellStyle}>{l}</span>
        ))}
        {showWeekPills && <span aria-hidden="true" />}
      </div>
      <div className={transitionClassName} style={gridStyle} ref={gridRef}>
        {Array.from({ length: Math.ceil((leadOffset + dayCount) / 7) }, (_, r) => {
          const dayNum = r * 7 - leadOffset + 1;
          const d = new Date(year, monthIdx, dayNum);
          const sundayISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          return (
            <React.Fragment key={r}>
              {Array.from({ length: 7 }, (_, col) => {
                const pos = r * 7 + col;
                const i = pos - leadOffset;
                if (i < 0 || i >= dayCount) return <span key={`e-${r}-${col}`} aria-hidden="true" />;
                const iso = isoAtDay(year, monthIdx, i);
                return (
                  <div key={iso} style={cellWrapStyle}>
                    <DayCell
                      monthIdx={monthIdx}
                      monthName={monthName}
                      dayIdx={i}
                      isoDate={iso}
                      goals={goals ?? []}
                      adherenceMaps={adherenceMaps}
                      focus={focus}
                      pen={pen}
                      onToggle={() => onDayTap(iso)}
                      onOpen={() => onOpenDay?.(iso)}
                      isToday={iso === todayISO}
                      showHalo={false}
                      blobScale={blobScale}
                      projectedDates={projectedDates}
                      viewTransitionId={`cal-cell-${iso}`}
                    />
                  </div>
                );
              })}
              {showWeekPills && (
                <button
                  type="button"
                  onClick={() => onWeekPillClick?.(sundayISO)}
                  aria-label={`Week of ${sundayISO}`}
                  style={weekPillStyle}
                >
                  ›
                </button>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/MonthGrid.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/MonthGrid.jsx src/components/MonthGrid.test.jsx
git commit -m "feat: add reusable MonthGrid component"
```

---

### Task 7: `Month.jsx` renders `MonthGrid`

**Files:**
- Modify: `src/screens/Month.jsx`
- Test: `src/screens/Month.test.jsx` (existing — must still pass unchanged)

**Interfaces:**
- Consumes: `MonthGrid` (Task 6), `daysInMonth`/`isoAtDay` (Task 1).

- [ ] **Step 1: Replace local date helpers with the shared ones**

In `src/screens/Month.jsx`, delete the local `daysIn` and `isoAt` function definitions (lines 43-49):
```js
function daysIn(year, monthIdx) {
  return new Date(year, monthIdx + 1, 0).getDate();
}

function isoAt(year, monthIdx, dayIdx) {
  return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(dayIdx + 1).padStart(2, "0")}`;
}
```
Add an import (near the top, after the `DayCell`/`PenChips` imports):
```js
import { daysInMonth, isoAtDay } from "../lib/calendarMonth.js";
```
Replace the two call sites that used the old names:
- Line 62: `const rangeTo = parsed ? isoAt(parsed.year, parsed.monthIdx, daysIn(parsed.year, parsed.monthIdx) - 1) : null;` → `const rangeTo = parsed ? isoAtDay(parsed.year, parsed.monthIdx, daysInMonth(parsed.year, parsed.monthIdx) - 1) : null;`

Add `import MonthGrid from "../components/MonthGrid.jsx";` alongside the other component imports.

- [ ] **Step 2: Drop the now-unused `dayCount`/`leadOffset` locals**

Delete (previously lines 270-271, now shifted up by the helper removal):
```js
  const dayCount = daysIn(year, monthIdx);
  const leadOffset = new Date(year, monthIdx, 1).getDay();
```
(`MonthGrid` computes these internally now — nothing else in `Month.jsx` uses them after this refactor.)

- [ ] **Step 3: Replace the DOW header + grid JSX with `<MonthGrid>`**

Replace this block (the `.month-dow` div through the closing `</div>` of `.month-days`, i.e. what was lines 334-385):
```jsx
        <div className="month-dow">
          {DAY_LETTERS.map((l, i) => (
            <span key={i} className="month-dow-cell">{l}</span>
          ))}
          <span aria-hidden="true" />
        </div>
        <div className={`month-days ${transition ? `month-slide-${transition}` : ""}`} ref={daysShellRef}>
          {Array.from({ length: Math.ceil((leadOffset + dayCount) / 7) }, (_, r) => {
            const dayNum = r * 7 - leadOffset + 1;
            const d = new Date(year, monthIdx, dayNum);
            const sundayISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const q = params.toString();
            return (
              <React.Fragment key={r}>
                {Array.from({ length: 7 }, (_, col) => {
                  const pos = r * 7 + col;
                  const i = pos - leadOffset;
                  if (i < 0 || i >= dayCount) return <span key={`e-${r}-${col}`} aria-hidden="true" />;
                  const iso = isoAt(year, monthIdx, i);
                  return (
                    <div key={iso} className="month-cell">
                      <DayCell
                        monthIdx={monthIdx}
                        monthName={monthName}
                        dayIdx={i}
                        isoDate={iso}
                        goals={goals ?? []}
                        adherenceMaps={adherenceMaps}
                        focus={focus}
                        pen={pen}
                        onToggle={() => onDayTap({ dateISO: iso })}
                        onOpen={() => nav(`/day/${iso}`)}
                        isToday={iso === todayISO}
                        showHalo={false}
                        blobScale={1.6}
                        projectedDates={projectedSet}
                      />
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => nav(`/week/${sundayISO}${q ? `?${q}` : ""}`)}
                  aria-label={`Week of ${sundayISO}`}
                  style={weekPillStyle}
                >
                  ›
                </button>
              </React.Fragment>
            );
          })}
        </div>
```
with:
```jsx
        <MonthGrid
          year={year}
          monthIdx={monthIdx}
          goals={goals ?? []}
          adherenceMaps={adherenceMaps}
          focus={focus}
          pen={pen}
          onDayTap={(iso) => onDayTap({ dateISO: iso })}
          onOpenDay={(iso) => nav(`/day/${iso}`)}
          todayISO={todayISO}
          blobScale={1.6}
          projectedDates={projectedSet}
          showWeekPills
          onWeekPillClick={(sundayISO) => {
            const q = params.toString();
            nav(`/week/${sundayISO}${q ? `?${q}` : ""}`);
          }}
          transitionClassName={transition ? `month-slide-${transition}` : ""}
          gridRef={daysShellRef}
        />
```

- [ ] **Step 4: Strip the now-redundant grid CSS from the page `<style>` block**

`MonthGrid` inlines its own grid/DOW styles now. In the `<style>` template literal, remove the `.month-days`, `.month-dow`, `.month-dow-cell`, and `.month-cell` rules, keeping `.month-shell`, the media queries, the `@keyframes`, `.month-slide-next/prev`, and the reduced-motion override:
```jsx
      <style>{`
        .month-shell { max-width: 720px; margin: 0 auto; }
        @media (min-width: 900px)  { .month-shell { max-width: 960px; } }
        @media (min-width: 1200px) { .month-shell { max-width: 1120px; } }
        @keyframes month-slide-in-next  { from { opacity: 0; transform: translateX(24px); }  to { opacity: 1; transform: translateX(0); } }
        @keyframes month-slide-in-prev  { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: translateX(0); } }
        .month-slide-next { animation: month-slide-in-next 180ms ease-out; }
        .month-slide-prev { animation: month-slide-in-prev 180ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .month-slide-next, .month-slide-prev { animation: none; }
        }
      `}</style>
```

- [ ] **Step 5: Remove the now-unused `weekPillStyle` constant**

Delete the `weekPillStyle` object at the bottom of the file (moved into `MonthGrid`) — check first that nothing else in `Month.jsx` still references `weekPillStyle`; it shouldn't after Step 3.

- [ ] **Step 6: Run the existing tests**

Run: `npx vitest run src/screens/Month.test.jsx`
Expected: PASS (2 tests, unchanged assertions — same DOM shape, `[data-iso]` cells still present with the same click behavior)

- [ ] **Step 7: Visual smoke check**

Run: `npm run dev`, then in another terminal use the `/browse` skill: `goto http://localhost:5173/month/2026-09`, `screenshot`. Compare against the pre-refactor screenshots taken during the previous end-date feature (same grid look — 7 columns + week-pill column, same spacing). This step is a manual sanity check, not an automated test — the goal is confirming the CSS extraction didn't change anything visually.

- [ ] **Step 8: Commit**

```bash
git add src/screens/Month.jsx
git commit -m "refactor: extract Month.jsx day-grid into MonthGrid component"
```

---

### Task 8: `Month.jsx` seeds initial state from `location.state`

**Files:**
- Modify: `src/screens/Month.jsx`
- Test: `src/screens/Month.test.jsx` (add a case)

**Interfaces:**
- Consumes: `useLocation` from `react-router-dom`.
- Contract: if `location.state.goals`/`location.state.logs` are present, they seed the initial `goals`/`logs` state (so the first render already has real day cells); the existing fetch effect still runs afterward and overwrites with the fully-loaded data.

- [ ] **Step 1: Write the failing test**

Add to `src/screens/Month.test.jsx`:
```js
describe("Month seeds initial state from location.state", () => {
  it("renders the seeded goal immediately, without waiting for listGoals", async () => {
    // Never resolves — proves the initial render didn't depend on this promise.
    listGoals.mockReturnValue(new Promise(() => {}));
    readLogsInRange.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter
        initialEntries={[{ pathname: "/month/2026-09", state: { goals: [GOAL], logs: [] } }]}
      >
        <Routes>
          <Route path="/month/:yyyymm" element={<Month />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Gym")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/screens/Month.test.jsx`
Expected: FAIL — "Gym" not found (state currently starts as `null`/`[]` regardless of `location.state`)

- [ ] **Step 3: Seed initial state**

In `src/screens/Month.jsx`, add the import:
```js
import { Link, useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
```
(replacing the existing `react-router-dom` import line that lacks `useLocation`).

Add `const location = useLocation();` alongside the other hooks near the top of the component, then change:
```js
  const [goals, setGoals] = useState(null);
  const [logs, setLogs] = useState([]);
```
to:
```js
  const [goals, setGoals] = useState(() => location.state?.goals ?? null);
  const [logs, setLogs] = useState(() => location.state?.logs ?? []);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/screens/Month.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/screens/Month.jsx src/screens/Month.test.jsx
git commit -m "feat: seed Month.jsx initial state from router location.state"
```

---

### Task 9: `Goal.jsx` mini calendar

**Files:**
- Modify: `src/screens/Goal.jsx`
- Modify: `src/screens/Goal.test.jsx`

**Interfaces:**
- Consumes: `MonthGrid` (Task 6), `planDayTap` (Task 2), `daysInMonth`/`isoAtDay` (Task 1), `dailyAdherence` from `src/data/adherence.js` (existing), `appendLog`/`deleteLogEvent` from `src/data/store.js` (existing).

- [ ] **Step 1: Update the test mock + remove the old "see on calendar" assertion**

In `src/screens/Goal.test.jsx`, change the `vi.mock("../data/store.js", ...)` factory to also provide the two new store calls:
```js
vi.mock("../data/store.js", () => ({
  getGoal: vi.fn(),
  readLogsInRange: vi.fn().mockResolvedValue([]),
  appendLog: vi.fn().mockResolvedValue(undefined),
  deleteLogEvent: vi.fn().mockResolvedValue(undefined),
  saveGoal: vi.fn().mockResolvedValue(undefined),
}));
```
and update the import line (same `../data/store.js` path, two more named imports):
```js
import { getGoal, readLogsInRange, appendLog, deleteLogEvent } from "../data/store.js";
```
In the `beforeEach`, add:
```js
  appendLog.mockClear();
  deleteLogEvent.mockClear();
```

Replace the removed-link assertion in the first test — delete this line:
```js
    expect(screen.getByRole("link", { name: /see on calendar/i })).toHaveAttribute("href", "/year?pen=wake-6am");
```

- [ ] **Step 2: Write the new failing tests**

Add a new `describe` block to `src/screens/Goal.test.jsx`:
```js
describe("Goal mini calendar", () => {
  it("renders a calendar section instead of the old 'see on calendar' link", async () => {
    getGoal.mockResolvedValue(WAKE_GOAL);
    renderGoal();
    await waitFor(() => expect(screen.getByText(/this month/i)).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /see on calendar/i })).not.toBeInTheDocument();
  });

  it("logs a tap on a mini-calendar day cell", async () => {
    getGoal.mockResolvedValue(WAKE_GOAL);
    renderGoal();
    await waitFor(() => expect(screen.getByText(/this month/i)).toBeInTheDocument());

    const todayCell = document.querySelector("[data-iso]");
    expect(todayCell).toBeTruthy();
    fireEvent.click(todayCell);
    await waitFor(() => expect(appendLog).toHaveBeenCalled());
  });
});
```
Add `fireEvent` to the existing `@testing-library/react` import at the top of the file:
```js
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/screens/Goal.test.jsx`
Expected: FAIL — "This month" text not present yet, `appendLog` not called

- [ ] **Step 4: Implement the mini calendar in `Goal.jsx`**

Update the imports at the top of `src/screens/Goal.jsx`:
```js
import { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { PAPER, FONT, TYPE, RADIUS } from "../tokens.js";
import { getGoal, readLogsInRange, saveGoal, appendLog, deleteLogEvent } from "../data/store.js";
import { momentum, dailyAdherence } from "../data/adherence.js";
import { todayLocalISO, addDaysLocalISO } from "../lib/date.js";
import { daysInMonth, isoAtDay } from "../lib/calendarMonth.js";
import { planDayTap } from "../data/dayTap.js";
import Orb from "../components/Orb.jsx";
import MonthGrid from "../components/MonthGrid.jsx";
import { goalColor, PALETTE } from "../lib/goalColor.js";
```

At the top of the `Goal()` function body, right after `const { id } = useParams();`, add:
```js
  const nav = useNavigate();
  const today = todayLocalISO();
  const [todayY, todayM] = today.split("-").map(Number);
  const calMonthIdx = todayM - 1;
  const calMonthEndISO = isoAtDay(todayY, calMonthIdx, daysInMonth(todayY, calMonthIdx) - 1);
  const calYyyymm = `${todayY}-${String(todayM).padStart(2, "0")}`;
```

Change the data-fetch `useEffect` to also cover the current month's remaining days:
```js
  useEffect(() => {
    let alive = true;
    const start = addDaysLocalISO(today, -365);
    Promise.all([getGoal(id), readLogsInRange({ from: start, to: calMonthEndISO })])
      .then(([g, l]) => { if (!alive) return; setGoal(g); setLogs(l); })
      .catch(() => { if (alive) { setGoal(null); setLogs([]); } });
    return () => { alive = false; };
  }, [id]);
```
(This replaces the previous `const end = todayLocalISO(); const start = addDaysLocalISO(end, -365);` — `end` is no longer needed since `calMonthEndISO` is always `>= today`.)

Add two new callbacks after `pickColor` (still before the early-return guards, so hook order stays unconditional):
```js
  const refreshMonthLogs = useCallback(async () => {
    const start = addDaysLocalISO(today, -365);
    const l = await readLogsInRange({ from: start, to: calMonthEndISO });
    setLogs(l);
  }, [today, calMonthEndISO]);

  const handleMiniDayTap = useCallback(async (iso) => {
    if (!goal) return;
    const existingEvent = logs.find((l) => l.date === iso)?.events.find((e) => e.goalId === goal.id);
    const plan = planDayTap({ goal, dateISO: iso, existingEvent });
    if (!plan) return;
    if (plan.type === "delete") await deleteLogEvent(iso, plan.event);
    else await appendLog(iso, plan.event);
    await refreshMonthLogs();
  }, [goal, logs, refreshMonthLogs]);
```

Remove the "See on calendar →" link from the sidebar actions block:
```jsx
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Link to={`/onboard?goalId=${goal.id}&turn=roundsPreview`} style={actionLink}>
                Adjust rounds →
              </Link>
              <Link to={`/year?pen=${goal.id}`} style={actionLink}>
                See on calendar →
              </Link>
            </div>
```
becomes:
```jsx
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Link to={`/onboard?goalId=${goal.id}&turn=roundsPreview`} style={actionLink}>
                Adjust rounds →
              </Link>
            </div>
```

Add the mini calendar section after the "Recent activity" `</section>` and before the closing `</main>`:
```jsx
            {/* Calendar — mini month, scoped to this goal; tap or drag up to expand */}
            <section style={{ marginTop: 36 }}>
              <div style={{
                background: PAPER.card,
                border: `1px solid ${PAPER.line}`,
                borderRadius: RADIUS.r1,
                padding: "16px 18px 20px",
              }}>
                <div onClick={() => nav(`/month/${calYyyymm}?pen=${goal.id}`)} style={{ cursor: "pointer", marginBottom: 14 }}>
                  <div style={kicker}>Calendar</div>
                  <div style={{ fontSize: 12.5, color: PAPER.dim, marginTop: 4 }}>
                    This month · tap to open →
                  </div>
                </div>
                <MonthGrid
                  year={todayY}
                  monthIdx={calMonthIdx}
                  goals={[goal]}
                  adherenceMaps={{
                    [goal.id]: dailyAdherence({ goal, logs, from: addDaysLocalISO(today, -365), to: calMonthEndISO }),
                  }}
                  focus={goal}
                  pen={goal}
                  onDayTap={handleMiniDayTap}
                  onOpenDay={(iso) => nav(`/day/${iso}`)}
                  todayISO={today}
                  blobScale={1}
                  cellMaxWidth="clamp(24px, 6vw, 34px)"
                  gap="6px"
                  showWeekPills={false}
                />
              </div>
            </section>
```

This is the plain-navigation version (Task 9). Task 10 replaces the `onClick` handler with the real `expandToCalendar` (view transition) and adds the drag-up gesture.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/screens/Goal.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS, all files (this catches anything else referencing the removed sidebar link)

- [ ] **Step 7: Commit**

```bash
git add src/screens/Goal.jsx src/screens/Goal.test.jsx
git commit -m "feat: replace 'see on calendar' link with a mini calendar on Goal.jsx"
```

---

### Task 10: Genie expand — view transition + drag-up gesture

**Files:**
- Modify: `src/screens/Goal.jsx`
- Modify: `src/screens/Goal.test.jsx`

**Interfaces:**
- Consumes: `motion`, `useDragControls` from `"motion/react"` (already a dependency, used identically in `src/components/LogSheet.jsx`).
- Produces: `expandToCalendar()` — navigates to `/month/<calYyyymm>?pen=<goal.id>` with `{ state: { goals: [goal], logs } }`, wrapped in `document.startViewTransition` when available and motion isn't reduced.

- [ ] **Step 1: Write the failing tests**

Add to `src/screens/Goal.test.jsx`, plus a stub route so navigation is observable:
```js
function MonthStub() {
  const [params] = useSearchParams();
  return <div data-testid="month-page">pen={params.get("pen")}</div>;
}

function renderGoal(id = "wake-6am") {
  return render(
    <MemoryRouter initialEntries={[`/goal/${id}`]}>
      <Routes>
        <Route path="/goal/:id" element={<Goal />} />
        <Route path="/month/:yyyymm" element={<MonthStub />} />
      </Routes>
    </MemoryRouter>
  );
}
```
Add `useSearchParams` to the `react-router-dom` import at the top of the test file:
```js
import { MemoryRouter, Route, Routes, useSearchParams } from "react-router-dom";
```
(This replaces the existing `renderGoal` — same body otherwise, just the added `Route`.)

Add a new `describe` block:
```js
describe("Goal calendar expansion", () => {
  it("navigates to the scoped Month view when the calendar header is clicked", async () => {
    getGoal.mockResolvedValue(WAKE_GOAL);
    renderGoal();
    await waitFor(() => expect(screen.getByText(/this month/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/this month/i));

    await waitFor(() => expect(screen.getByTestId("month-page")).toBeInTheDocument());
    expect(screen.getByTestId("month-page")).toHaveTextContent("pen=wake-6am");
  });

  it("still navigates when document.startViewTransition is available", async () => {
    const startViewTransition = vi.fn((cb) => {
      cb();
      return { finished: Promise.resolve(), ready: Promise.resolve(), updateCallbackDone: Promise.resolve() };
    });
    document.startViewTransition = startViewTransition;

    getGoal.mockResolvedValue(WAKE_GOAL);
    renderGoal();
    await waitFor(() => expect(screen.getByText(/this month/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/this month/i));

    expect(startViewTransition).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId("month-page")).toBeInTheDocument());

    delete document.startViewTransition;
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/screens/Goal.test.jsx`
Expected: FAIL — clicking "This month" text currently navigates via a plain `<div onClick>` (Task 9's version) with no `state`, and there's no `startViewTransition` call at all; the first test may already pass (plain nav works) but the second will fail since nothing calls `document.startViewTransition`.

- [ ] **Step 3: Implement `expandToCalendar`**

In `src/screens/Goal.jsx`, add the import:
```js
import { motion, useDragControls } from "motion/react";
```

Add a module-level helper above the component (near the top of the file, after the existing helper functions like `formatTarget`):
```js
function prefersReducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

async function waitForCells(timeoutMs = 400) {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (document.querySelector("[data-iso]")) return;
    await new Promise((r) => requestAnimationFrame(r));
  }
}
```

Inside the `Goal()` component, add `const dragControls = useDragControls();` alongside the other hooks, then add `expandToCalendar` after `handleMiniDayTap`:
```js
  const expandToCalendar = useCallback(() => {
    if (!goal) return;
    const path = `/month/${calYyyymm}?pen=${goal.id}`;
    const state = { goals: [goal], logs };
    if (prefersReducedMotion() || typeof document.startViewTransition !== "function") {
      nav(path, { state });
      return;
    }
    document.startViewTransition(() => {
      nav(path, { state });
      return waitForCells();
    });
  }, [goal, logs, calYyyymm, nav]);
```

- [ ] **Step 4: Wire the mini calendar card to `expandToCalendar` + the drag-up gesture**

Replace the calendar section's markup from Task 9:
```jsx
            {/* Calendar — mini month, scoped to this goal; tap or drag up to expand */}
            <section style={{ marginTop: 36 }}>
              <div style={{
                background: PAPER.card,
                border: `1px solid ${PAPER.line}`,
                borderRadius: RADIUS.r1,
                padding: "16px 18px 20px",
              }}>
                <div onClick={() => nav(`/month/${calYyyymm}?pen=${goal.id}`)} style={{ cursor: "pointer", marginBottom: 14 }}>
                  <div style={kicker}>Calendar</div>
                  <div style={{ fontSize: 12.5, color: PAPER.dim, marginTop: 4 }}>
                    This month · tap to open →
                  </div>
                </div>
                <MonthGrid
                  year={todayY}
                  monthIdx={calMonthIdx}
                  goals={[goal]}
                  adherenceMaps={{
                    [goal.id]: dailyAdherence({ goal, logs, from: addDaysLocalISO(today, -365), to: calMonthEndISO }),
                  }}
                  focus={goal}
                  pen={goal}
                  onDayTap={handleMiniDayTap}
                  onOpenDay={(iso) => nav(`/day/${iso}`)}
                  todayISO={today}
                  blobScale={1}
                  cellMaxWidth="clamp(24px, 6vw, 34px)"
                  gap="6px"
                  showWeekPills={false}
                />
              </div>
            </section>
```
with:
```jsx
            {/* Calendar — mini month, scoped to this goal; tap or drag up to expand */}
            <section style={{ marginTop: 36 }}>
              <motion.div
                drag="y"
                dragControls={dragControls}
                dragListener={false}
                dragConstraints={{ top: -9999, bottom: 0 }}
                dragElastic={{ top: 0.15, bottom: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y < -60 || info.velocity.y < -400) expandToCalendar();
                }}
                style={{
                  background: PAPER.card,
                  border: `1px solid ${PAPER.line}`,
                  borderRadius: RADIUS.r1,
                  padding: "16px 18px 20px",
                }}
              >
                <div
                  onPointerDown={(e) => dragControls.start(e)}
                  onClick={expandToCalendar}
                  style={{ cursor: "grab", marginBottom: 14, touchAction: "none" }}
                >
                  <div style={kicker}>Calendar</div>
                  <div style={{ fontSize: 12.5, color: PAPER.dim, marginTop: 4 }}>
                    This month · tap or swipe up ↑
                  </div>
                </div>
                <MonthGrid
                  year={todayY}
                  monthIdx={calMonthIdx}
                  goals={[goal]}
                  adherenceMaps={{
                    [goal.id]: dailyAdherence({ goal, logs, from: addDaysLocalISO(today, -365), to: calMonthEndISO }),
                  }}
                  focus={goal}
                  pen={goal}
                  onDayTap={handleMiniDayTap}
                  onOpenDay={(iso) => nav(`/day/${iso}`)}
                  todayISO={today}
                  blobScale={1}
                  cellMaxWidth="clamp(24px, 6vw, 34px)"
                  gap="6px"
                  showWeekPills={false}
                />
              </motion.div>
            </section>
```

Also update Task 9's `describe("Goal mini calendar", ...)` test that checked the header text — it originally checked `/this month/i` generically, which still matches "This month · tap or swipe up ↑", so no change needed there.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/screens/Goal.test.jsx`
Expected: PASS (7 tests)

- [ ] **Step 6: Run the full suite + build**

Run: `npx vitest run && npm run build`
Expected: all tests PASS, build succeeds with no new warnings

- [ ] **Step 7: Commit**

```bash
git add src/screens/Goal.jsx src/screens/Goal.test.jsx
git commit -m "feat: morph Goal.jsx mini calendar into Month.jsx via view transition"
```

---

### Task 11: Manual QA

Not a code task — a verification pass using the `/browse` skill, since a real `document.startViewTransition` morph can't be asserted in jsdom.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Sign in as guest and open a goal with an end date this month**

Use `/browse`: `goto http://localhost:5173/create`, fill a goal name + an end date later this month, submit, then `goto http://localhost:5173/goal/<created-id>` (or find it via `/` → click the goal).

- [ ] **Step 3: Verify the mini calendar**

`screenshot` — confirm: no "See on calendar" text anywhere on the page; a card near the bottom titled "Calendar" with a small grid of the current month, sized noticeably smaller than the full `/month` view.

- [ ] **Step 4: Verify tapping a day cell logs**

Click a `[data-iso]` cell inside the mini calendar via `js` (`document.querySelector('[data-iso="..."]').click()` or a direct `click` command on that selector) and confirm (via `network`) a `POST .../log_events` request fires, then `screenshot` to confirm a solid blob appears in that cell.

- [ ] **Step 5: Verify tap-to-expand**

Click the "This month · tap or swipe up ↑" header text. Confirm the URL becomes `/month/<yyyymm>?pen=<goalId>` and the full Month page renders with that goal already selected as pen (pen chip highlighted, marks visible). `screenshot` before and after; note whether the per-cell morph is visually smooth (best-effort — browser used by `/browse` may not support View Transitions; if so, note that the fallback (plain navigate) still lands correctly).

- [ ] **Step 6: Report findings**

Summarize what worked and any visual rough edges (e.g., a browser without View Transitions support showing a plain cut instead of a morph — expected, not a bug) back to the user.
