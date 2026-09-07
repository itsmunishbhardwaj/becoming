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
