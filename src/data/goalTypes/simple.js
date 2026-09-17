// Simple goal — no baseline, no target, no scheduling.
// Any day with a logged event is a mark; nothing else to compute.

export function buildRounds(_baseline, _target, startDate, endDate) {
  return [{ n: 1, targetValue: null, startDate, endDate }];
}

export function adherenceForDay({ events }) {
  return events.length > 0 ? "hit" : "none";
}

export function safeRateCeiling() {
  // No mechanical ceiling for simple goals. A simple goal only extends past
  // 3 months via identity-level judgment (soul-algorithm doc §2.3 bucket 2),
  // never a computed rate — so there's nothing to return here.
  return null;
}
