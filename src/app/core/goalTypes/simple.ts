import type { Round, LogEvent, AdherenceStatus } from '../types';

export function buildRounds(_baseline: unknown, _target: unknown, startDate: string, endDate: string): Round[] {
  return [{ n: 1, targetValue: null, startDate, endDate }];
}

export function adherenceForDay({ events }: { events: LogEvent[] }): AdherenceStatus {
  return events.length > 0 ? 'hit' : 'none';
}

export function safeRateCeiling(): null {
  return null;
}
