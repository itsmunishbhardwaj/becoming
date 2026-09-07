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
