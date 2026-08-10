// mockLife.js is retired. Real data lives in vault/goals/*.md and is loaded
// via src/data/store.js. This file remains only to satisfy old imports until
// every screen has been migrated; the exports below are empty on purpose.
export const GOALS = [];
export const QUESTIONS = [];
export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function buildYear() { return Array.from({ length: 12 }, () => []); }
export function isMonthDormant() { return false; }
