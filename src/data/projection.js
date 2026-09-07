import { isScheduledDay } from "./goalTypes/cadence.js";

function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Dates in [from, to] where a blob would land if the goal is completed as
// scheduled. Cadence goals (interval-based) follow their round schedule;
// everything else is assumed daily.
export function projectedDates({ goal, from, to }) {
  const isCadence = goal.baseline?.intervalDays != null;
  const dates = [];
  let cur = from;
  while (cur <= to) {
    if (isCadence) {
      const round = (goal.rounds || []).find((r) => cur >= r.startDate && cur <= r.endDate);
      if (round && isScheduledDay({ date: cur, currentRound: round })) dates.push(cur);
    } else {
      dates.push(cur);
    }
    cur = addDays(cur, 1);
  }
  return dates;
}
