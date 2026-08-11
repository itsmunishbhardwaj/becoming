function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const MIN_DAYS_PER_ROUND = 14;

export function buildRounds(baseline, target, startDate, endDate) {
  const b = baseline.intervalDays;
  const t = target.intervalDays;
  const steps = Math.max(1, t - b);
  const totalDays = Math.max(1, daysBetween(startDate, endDate));
  const perRound = Math.max(MIN_DAYS_PER_ROUND, Math.floor(totalDays / steps));
  const rounds = [];
  for (let i = 0; i < steps; i++) {
    const start = addDays(startDate, i * perRound);
    const end = i === steps - 1 ? endDate : addDays(startDate, (i + 1) * perRound - 1);
    rounds.push({
      n: i + 1,
      targetValue: { intervalDays: b + i + 1 },
      startDate: start,
      endDate: end,
    });
  }
  return rounds;
}

export function adherenceForDay({ date, currentRound, events }) {
  const dayIdx = daysBetween(currentRound.startDate, date);
  const isGreen = dayIdx >= 0 && dayIdx % currentRound.targetValue.intervalDays === 0;
  const hasSession = events.some((e) => e.verb === "session");
  if (isGreen && hasSession) return "hit";
  if (!isGreen && !hasSession) return "clean";
  if (!isGreen && hasSession) return "bonus"; // session on unscheduled day — positive but off-schedule
  return "none"; // green with no session — no penalty
}
