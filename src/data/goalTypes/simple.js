// Simple goal — no baseline, no target, no scheduling.
// Any day with a logged event is a mark; nothing else to compute.

export function buildRounds(_baseline, _target, startDate, endDate) {
  return [{ n: 1, targetValue: null, startDate, endDate }];
}

export function adherenceForDay({ events }) {
  return events.length > 0 ? "hit" : "none";
}
