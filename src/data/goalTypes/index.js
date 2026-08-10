import * as wake from "./wake.js";
import * as cadence from "./cadence.js";

const TYPES = { wake, cadence };

export function getType(type) {
  const t = TYPES[type];
  if (!t) throw new Error(`Unknown goal type: ${type}`);
  return t;
}
