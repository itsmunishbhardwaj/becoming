const CATS = ["health", "reading", "career", "relationships", "finance", "creativity"];
const TYPE_KEYS = ["wake", "cadence", "simple"];

function parseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isValidClassification(obj) {
  return Boolean(
    obj &&
    typeof obj.name === "string" && obj.name.trim().length > 0 &&
    CATS.includes(obj.cat) &&
    TYPE_KEYS.includes(obj.type) &&
    obj.baseline !== undefined &&
    obj.target !== undefined
  );
}

const PARSE_SYSTEM = "You are the reasoning core of Balboa Breakdown, a goal-onboarding ritual inside a personal-goals app called Becoming. Given a person's own words about a goal, extract structure without flattening their voice. Never rewrite their ambition — preserve it verbatim in your response's `ambition` field.";

function parseUserPrompt({ ambition, baseline, target, existingGoals }) {
  return [
    `Ambition: "${ambition}"`,
    `Baseline: "${baseline}"`,
    `Target: "${target}"`,
    `Existing goals: ${JSON.stringify(existingGoals || [])}`,
    "",
    `Return JSON: { "name": string, "cat": string, "type": string, "baseline": <typed>, "target": <typed> }`,
    `cat must be one of: ${CATS.join(", ")}.`,
    `type must be one of: ${TYPE_KEYS.join(", ")} — wake if this is about a daily clock-time habit, cadence if it's about widening/narrowing how often something happens, simple otherwise.`,
  ].join("\n");
}

export async function callParseClassify({ ambition, baseline, target, existingGoals, llmChat }) {
  const messages = [
    { role: "system", content: PARSE_SYSTEM },
    { role: "user", content: parseUserPrompt({ ambition, baseline, target, existingGoals }) },
  ];
  const raw = await llmChat(messages);
  const parsed = parseJSON(raw);
  if (parsed && isValidClassification(parsed)) return parsed;

  const retry = await llmChat([
    ...messages,
    { role: "user", content: "Return valid JSON only — no prose, no markdown fences." },
  ]);
  const retried = parseJSON(retry);
  if (retried && isValidClassification(retried)) return retried;

  throw new Error("callParseClassify: LLM did not return valid JSON after retry");
}

const NARRATIVE_SYSTEM = "You are the reasoning core of Balboa Breakdown. You're given the deterministic round schedule already computed — your job is to explain what each round is actually building (not restate the math) and draft indicators of the person going right, wrong, or stalling. Never scold. Never use emoji. Spare, warm voice.";

function narrativeUserPrompt({ ambition, rounds, horizonReason }) {
  return [
    `Ambition: "${ambition}"`,
    `Rounds (boundaries already fixed): ${JSON.stringify(rounds)}`,
    `Horizon reason: ${horizonReason || "none — 3mo default"}`,
    "",
    `Return JSON: { "rounds": [{ "n": number, "why": string }], "indicators": { "right": string[], "wrong": string[], "stall": string[] } }`,
  ].join("\n");
}

export async function callRoundNarrative({ ambition, rounds, horizonReason, llmChat }) {
  let raw;
  try {
    raw = await llmChat([
      { role: "system", content: NARRATIVE_SYSTEM },
      { role: "user", content: narrativeUserPrompt({ ambition, rounds, horizonReason }) },
    ]);
  } catch {
    return null;
  }
  return parseJSON(raw);
}

export function templateIndicators(type) {
  if (type === "wake") {
    return {
      right: ["Wake within 15 min of round target 5+ days a week", "Bedtime moves earlier without effort"],
      wrong: ["Snoozing past round target by 45+ min two days in a row"],
      stall: ["7+ days no wake logged", "Same wake time held across 3 rounds"],
    };
  }
  if (type === "cadence") {
    return {
      right: ["Green days matched", "Non-green days clean"],
      wrong: ["Multiple sessions on non-green days across a week"],
      stall: ["No logs at all for 14+ days"],
    };
  }
  return {
    right: ["Logged consistently across the week"],
    wrong: [],
    stall: ["7+ days with no log"],
  };
}
