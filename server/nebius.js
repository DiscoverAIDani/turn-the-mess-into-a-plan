import { groundingInstructions, orderingInstructions, planSchema } from './plan-schema.js';
import { parseCompletion } from './validate-plan.js';
import { temporalInstructions } from './temporal-grounding.js';

export const UPSTREAM_TIMEOUT_MS = 15_000;
export const OUTPUT_TOKEN_LIMIT = 4096;

// Concrete examples reinforce the existing PRD rules for the selected model.
const contractExamples = `A description of an existing state is NOT a request to change it. Never convert "is", "has", or a description into an update, paint, review, or other task. For example, notes "The logo is blue. The walls are white." must return {"kind":"no_actions","goal":"","tasks":[],"priorityTaskIds":[],"attention":[]}. Only explicit actions, requests, needs, and appointments support tasks. If any untimed task precedes a fixed appointment, include this exact attention entry: {"kind":"uncertainty","text":"Suggested order only: whether untimed work fits before fixed appointments is unknown."}. A statement about urgency is not a substitute for that uncertainty. Before returning JSON, check the no-action rule and this ordering-uncertainty rule.`;

// Inject fetch/timeout only for deterministic failure tests; production uses the defaults.
export async function generatePlan(notes, {
  apiKey = process.env.NEBIUS_API_KEY,
  model = process.env.NEBIUS_MODEL,
  fetchImpl = fetch,
  timeoutMs = UPSTREAM_TIMEOUT_MS,
} = {}) {
  if (!apiKey?.trim() || !model?.trim()) throw new Error('Provider not configured');
  const response = await fetchImpl('https://api.tokenfactory.nebius.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model, stream: false, max_tokens: OUTPUT_TOKEN_LIMIT,
      chat_template_kwargs: { enable_thinking: false },
      messages: [{ role: 'system', content: `${groundingInstructions} ${orderingInstructions} ${temporalInstructions} Keep the goal to an action-only summary, without temporal or urgency qualifiers; preserve supplied timing on the corresponding tasks instead. For example, say "Handle customer follow-ups and administrative tasks", not "Handle today's tasks". Never turn "sometime this week" into "weekly" or "today's payments" into "daily payments": those would invent recurrence. ${contractExamples} Source excerpts must preserve Unicode punctuation exactly: for input "Enter today’s payments.", sourceExcerpt must be "Enter today’s payments." with the same curly apostrophe (U+2019), NEVER "Enter today's payments.". Copy directly; do not normalize punctuation or rewrite excerpts.` }, { role: 'user', content: notes }],
      response_format: { type: 'json_schema', json_schema: { name: 'daily_plan', strict: true, schema: planSchema } },
    }),
  });
  // Never propagate provider error bodies, which can include user data.
  if (!response.ok) throw Object.assign(new Error('Provider request failed'), { status: response.status });
  const completion = await response.json();
  return parseCompletion(completion, notes);
}
