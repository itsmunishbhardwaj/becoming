import { isScheduledDay } from './goalTypes/cadence';
import type { Goal, LogEvent } from './types';

interface DayTapResult {
  type: 'delete' | 'append';
  event: LogEvent;
}

export function planDayTap({
  goal,
  dateISO,
  existingEvent,
}: {
  goal: Goal;
  dateISO: string;
  existingEvent?: LogEvent | null;
}): DayTapResult | null {
  if (goal.endDate && dateISO > goal.endDate) return null;
  if (goal.baseline != null && typeof goal.baseline === 'object' && 'intervalDays' in goal.baseline) {
    const round = (goal.rounds || []).find((r) => dateISO >= r.startDate && dateISO <= r.endDate);
    if (round && isScheduledDay({ date: dateISO, currentRound: round })) return null;
  }
  if (existingEvent) return { type: 'delete', event: existingEvent };
  const event: LogEvent =
    typeof goal.baseline === 'string'
      ? { verb: 'wake', time: '07:00', goalId: goal.id }
      : goal.baseline != null && typeof goal.baseline === 'object' && 'intervalDays' in (goal.baseline as object)
        ? { verb: 'session', durationMin: 10, goalId: goal.id }
        : { verb: 'done', goalId: goal.id };
  return { type: 'append', event };
}
