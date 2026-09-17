import { getType } from "../data/goalTypes/index.js";
import { decideHorizon } from "./horizon.js";
import { callParseClassify, callRoundNarrative, templateIndicators } from "./breakdownCalls.js";

export async function breakdownGoal({ ambition, baseline, target, today, existingGoals }, { llmChat }) {
  if (typeof llmChat !== "function") {
    throw new Error("breakdownGoal requires an llmChat function");
  }
  if (typeof today !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    throw new Error("breakdownGoal requires a valid ISO today date");
  }

  const classified = await callParseClassify({ ambition, baseline, target, existingGoals, llmChat });
  const horizon = decideHorizon(classified.type, classified.baseline, classified.target, today);
  const type = getType(classified.type);
  const boundaries = type.buildRounds(classified.baseline, classified.target, today, horizon.endDate);

  const narrative = await callRoundNarrative({
    ambition, rounds: boundaries, horizonReason: horizon.horizonReason, llmChat,
  });

  const whyByRound = new Map((narrative?.rounds || []).map((r) => [r.n, r.why]));
  const rounds = boundaries.map((r) => ({ ...r, why: whyByRound.get(r.n) ?? null }));
  const indicators = narrative?.indicators ?? templateIndicators(classified.type);

  return {
    name: classified.name,
    cat: classified.cat,
    type: classified.type,
    baseline: classified.baseline,
    target: classified.target,
    endDate: horizon.endDate,
    horizonReason: horizon.horizonReason,
    unreachable: horizon.unreachable,
    rounds,
    indicators,
  };
}
