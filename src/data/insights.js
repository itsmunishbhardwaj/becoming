import { momentum } from "./adherence.js";
import { addDaysLocalISO } from "../lib/date.js";

function eventsInRange(goalId, logs, from, to) {
  let count = 0;
  for (const log of logs) {
    if (log.date < from || log.date > to) continue;
    if (log.events.some((e) => e.goalId === goalId)) count++;
  }
  return count;
}

function driftQuestion(goal, today) {
  return {
    id: `drift-${goal.id}-${today}`,
    kicker: "A quiet one",
    text: `${goal.name} hasn't seen a mark in 7 days. Still part of the plan right now, or resting for a while?`,
    yes: { label: "Still on it", response: "Good. I'll leave it be." },
    no: { label: "Resting for now", response: "Marked resting 🌙 — it won't nag, and it keeps every one of your marks." },
  };
}

function lowMomentumQuestion(goal, today) {
  return {
    id: `low-mom-${goal.id}-${today}`,
    kicker: "A question from your week",
    text: `${goal.name}'s momentum is quiet lately. Want to make the next round gentler?`,
    yes: { label: "Yes, soften it", response: "Noted — head to Adjust rounds when you're ready." },
    no: { label: "Leave it alone", response: "Fair. I'll trust the rhythm." },
  };
}

export function generateInsights({ goals, logs, today }) {
  const drifts = [];
  const lowMoms = [];
  const from7 = addDaysLocalISO(today, -6);
  const from30 = addDaysLocalISO(today, -29);
  for (const goal of goals) {
    if (goal.state !== "active") continue;
    const last7 = eventsInRange(goal.id, logs, from7, today);
    if (last7 === 0) {
      drifts.push(driftQuestion(goal, today));
    }
    const last30 = eventsInRange(goal.id, logs, from30, today);
    if (last30 < 3) continue;
    const m = momentum({ goal, logs, asOf: today });
    if (m < 0.25) lowMoms.push(lowMomentumQuestion(goal, today));
  }
  return [...drifts, ...lowMoms];
}
