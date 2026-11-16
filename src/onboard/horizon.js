import { getType } from "../data/goalTypes/index.js";

const QUARTER_DAYS = 90;
const HALF_YEAR_DAYS = 180;

export function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function decideHorizon(type, baseline, target, today) {
  const ceiling = getType(type).safeRateCeiling(baseline, target);
  if (ceiling && ceiling.minDays > QUARTER_DAYS) {
    const cappedDays = Math.min(ceiling.minDays, HALF_YEAR_DAYS);
    const unreachable = ceiling.minDays > HALF_YEAR_DAYS;
    const horizonReason = unreachable
      ? `Safe pace needs ${ceiling.minDays} days — even 6 months isn't enough at a safe pace; consider softening the target.`
      : `Safe pace needs ${ceiling.minDays} days — closing this in one quarter would exceed a sane rate of change.`;
    return {
      endDate: addDays(today, cappedDays),
      horizonReason,
      unreachable,
    };
  }
  return { endDate: addDays(today, QUARTER_DAYS), horizonReason: null, unreachable: false };
}
