export function daysInMonth(year: number, monthIdx: number): number {
  return new Date(year, monthIdx + 1, 0).getDate();
}

export function isoAtDay(year: number, monthIdx: number, dayIdx: number): string {
  return `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(dayIdx + 1).padStart(2, '0')}`;
}

export function leadOffsetFor(year: number, monthIdx: number): number {
  return new Date(year, monthIdx, 1).getDay();
}
