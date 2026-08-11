import { momentum, dailyAdherence } from "./adherence.js";
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

function wrongEchoQuestion(goal, today) {
  const wrong = goal.indicators.wrong[0];
  return {
    id: `wrong-echo-${goal.id}-${today}`,
    kicker: "A pattern I'm noticing",
    text: `${goal.name} has hit the '${wrong}' signal more than once this week. Is that something you're watching?`,
    yes: { label: "Yes, I see it", response: "Named. I'll keep watching too." },
    no: { label: "Not a real pattern", response: "Fair. I'll trust the noise." },
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
  const wrongEchoes = [];
  const lowMoms = [];
  const from7 = addDaysLocalISO(today, -6);
  const from30 = addDaysLocalISO(today, -29);
  for (const goal of goals) {
    if (goal.state !== "active") continue;
    const last7 = eventsInRange(goal.id, logs, from7, today);
    if (last7 === 0) {
      drifts.push(driftQuestion(goal, today));
    }
    // Wrong-echo: soft + off in last 7 days
    if (goal.indicators?.wrong?.length > 0) {
      const per = dailyAdherence({ goal, logs, from: from7, to: today });
      let count = 0;
      for (const s of Object.values(per)) {
        if (s === "off" || s === "soft") count++;
      }
      if (count >= 3) wrongEchoes.push(wrongEchoQuestion(goal, today));
    }
    const last30 = eventsInRange(goal.id, logs, from30, today);
    if (last30 < 3) continue;
    const m = momentum({ goal, logs, asOf: today });
    if (m < 0.25) lowMoms.push(lowMomentumQuestion(goal, today));
  }
  return [...drifts, ...wrongEchoes, ...lowMoms];
}
