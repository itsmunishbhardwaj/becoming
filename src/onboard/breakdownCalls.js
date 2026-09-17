const CATS = ["health", "reading", "career", "relationships", "finance", "creativity"];
const TYPE_KEYS = ["wake", "cadence", "simple"];

function parseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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
  if (parsed) return parsed;

  const retry = await llmChat([
    ...messages,
    { role: "user", content: "Return valid JSON only — no prose, no markdown fences." },
  ]);
  const retried = parseJSON(retry);
  if (retried) return retried;

  throw new Error("callParseClassify: LLM did not return valid JSON after retry");
}
