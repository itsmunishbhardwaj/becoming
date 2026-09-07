export function daysInMonth(year, monthIdx) {
  return new Date(year, monthIdx + 1, 0).getDate();
}

export function isoAtDay(year, monthIdx, dayIdx) {
  return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(dayIdx + 1).padStart(2, "0")}`;
}

export function leadOffsetFor(year, monthIdx) {
  return new Date(year, monthIdx, 1).getDay();
}
