function toMin(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function fromMin(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const STEP_MIN = 30;

const SAFE_MIN_PER_WEEK = 30; // conservative ceiling: circadian shift shouldn't exceed this per week

export function safeRateCeiling(baseline, target) {
  const delta = Math.abs(toMin(baseline) - toMin(target));
  const minDays = Math.ceil((delta / SAFE_MIN_PER_WEEK) * 7);
  return { minDays };
}

export function buildRounds(baseline, target, startDate, endDate) {
  const b = toMin(baseline);
  const t = toMin(target);
  const totalSteps = Math.max(1, Math.round((b - t) / STEP_MIN));
  const totalDays = Math.max(1, daysBetween(startDate, endDate));
  const perRound = Math.max(10, Math.floor(totalDays / totalSteps));
  const rounds = [];
  for (let i = 0; i < totalSteps; i++) {
    const start = addDays(startDate, i * perRound);
    const end = i === totalSteps - 1 ? endDate : addDays(startDate, (i + 1) * perRound - 1);
    rounds.push({
      n: i + 1,
      targetValue: fromMin(b - STEP_MIN * (i + 1)),
      startDate: start,
      endDate: end,
    });
  }
  return rounds;
}

export function adherenceForDay({ date, currentRound, events }) { // date unused for wake; kept for interface uniformity with cadence
  const wake = events.find((e) => e.verb === "wake" && e.time);
  if (!wake) return "none";
  const delta = toMin(wake.time) - toMin(currentRound.targetValue);
  if (delta <= 15) return "hit";
  if (delta <= 45) return "soft";
  return "off";
}
