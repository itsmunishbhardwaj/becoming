import * as wake from "./wake.js";
import * as cadence from "./cadence.js";
import * as simple from "./simple.js";

const TYPES = { wake, cadence, simple };

export function getTypeByGoal(goal) {
  if (typeof goal.baseline === "string") return wake;
  if (goal.baseline != null && typeof goal.baseline === "object" && "intervalDays" in goal.baseline) return cadence;
  return simple;
}

// Keep getType for backward compat during migration; remove after
export function getType(type) {
  const t = TYPES[type];
  if (!t) throw new Error(`Unknown goal type: ${type}`);
  return t;
}
