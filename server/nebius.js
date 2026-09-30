import { groundingInstructions, orderingInstructions, planSchema } from './plan-schema.js';
import { parseCompletion } from './validate-plan.js';
import { temporalInstructions } from './temporal-grounding.js';

export const UPSTREAM_TIMEOUT_MS = 15_000;
export const OUTPUT_TOKEN_LIMIT = 4096;

// A mixed paragraph demonstrates local evidence, a stated need, and non-action
// context together. The response still goes through every production validator.
const mixedNotesExample = {
  notes: 'Need to call the dentist, pick up dog food, Mom’s birthday is Friday and I still need a gift, laundry is piling up, and I should email Sarah about lunch next week.',
  result: {
    kind: 'plan', goal: 'Handle the dentist call, dog food, birthday gift, and lunch email',
    tasks: [
      { id: 'dentist', text: 'Call the dentist', appointmentTime: null, sourceExcerpt: 'Need to call the dentist' },
      { id: 'food', text: 'Pick up dog food', appointmentTime: null, sourceExcerpt: 'pick up dog food' },
      { id: 'gift', text: 'Get a gift for Mom; her birthday is Friday', appointmentTime: null, sourceExcerpt: 'Mom’s birthday is Friday and I still need a gift' },
      { id: 'email', text: 'Email Sarah about lunch next week', appointmentTime: null, sourceExcerpt: 'I should email Sarah about lunch next week' },
    ],
    priorityTaskIds: ['gift', 'dentist', 'food'],
    attention: [{ kind: 'context', text: 'Laundry is piling up.' }],
  },
};

const appointmentExample = {
  notes: 'Call Maya back about missed estimate — urgent. 9:00 AM carpet cleaning.',
  result: {
    kind: 'plan', goal: 'Handle the customer callback and carpet cleaning',
    tasks: [
      { id: 'call', text: 'Call Maya back about missed estimate — urgent', appointmentTime: null, sourceExcerpt: 'Call Maya back about missed estimate — urgent' },
      { id: 'clean', text: 'Carpet cleaning', appointmentTime: '9:00 AM', sourceExcerpt: '9:00 AM carpet cleaning.' },
    ],
    priorityTaskIds: ['call', 'clean'],
    attention: [{ kind: 'uncertainty', text: 'Suggested order only: whether untimed work fits before fixed appointments is unknown.' }],
  },
};

// Concrete examples reinforce the existing PRD rules for the selected model.
const contractExamples = `A description of an existing state is NOT a request to change it. Never convert "is", "has", or a description into an update, paint, review, or other task. For example, notes "The logo is blue. The walls are white." must return {"kind":"no_actions","goal":"","tasks":[],"priorityTaskIds":[],"attention":[]}. Only explicit actions, requests, needs, and appointments support tasks. In mixed notes, keep descriptive clauses as context, even when neighboring clauses request actions: "laundry is piling up" is context, not permission to add "Do laundry". In contrast, "I still need a gift" explicitly states a need and supports getting a gift. Separate coordinated actions into individual tasks, each with its own exact task-local sourceExcerpt, never the whole paragraph. Preserve lowercase wording too: for "Need to call the dentist", use sourceExcerpt "Need to call the dentist" or "call the dentist", never "Call the dentist". Retain supplied birthday/lunch timing on the corresponding gift/email task without inventing a deadline. The fixed-appointment uncertainty below is conditional, NOT boilerplate: include it only when at least one actual fixed appointment with an explicit clock time exists AND an untimed task precedes it. A birthday on Friday or lunch next week is not a fixed clock-time appointment. When every appointmentTime is null, NEVER include that caveat or suggest fixed appointments exist. If any untimed task precedes a fixed appointment, include this exact attention entry: {"kind":"uncertainty","text":"Suggested order only: whether untimed work fits before fixed appointments is unknown."}. A statement about urgency is not a substitute for that uncertainty. Before returning JSON, check the no-action rule and this ordering-uncertainty rule.`;

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
      messages: [{ role: 'system', content: `${groundingInstructions} ${orderingInstructions} ${temporalInstructions} Keep the goal to an action-only summary, without temporal or urgency qualifiers; preserve supplied timing on the corresponding tasks instead. For example, say "Handle customer follow-ups and administrative tasks", not "Handle today's tasks". Never turn "sometime this week" into "weekly" or "today's payments" into "daily payments": those would invent recurrence. ${contractExamples} Source excerpts must preserve Unicode punctuation exactly: for input "Enter today’s payments.", sourceExcerpt must be "Enter today’s payments." with the same curly apostrophe (U+2019), NEVER "Enter today's payments.". Copy directly; do not normalize punctuation or rewrite excerpts. Mixed-note example (apply its rules to the actual user notes, do not copy unrelated facts): ${JSON.stringify(mixedNotesExample)}. In that example Friday is birthday context, not a fixed clock appointment or an invented gift deadline; laundry remains context. The absence of fixed appointments means the appointment-order caveat must be absent. Contrast with actual clock-led appointments: ${JSON.stringify(appointmentExample)}. Clock-led entries such as "9:00 AM carpet cleaning" and "11:30 AM upholstery job" ARE actionable appointments and must each remain separate tasks with their supplied appointmentTime. Copy complete task-local evidence, including the subject of a call and supplied urgency. Choose the appropriate behavior from the actual notes, never from the other example.` }, { role: 'user', content: notes }],
      response_format: { type: 'json_schema', json_schema: { name: 'daily_plan', strict: true, schema: planSchema } },
    }),
  });
  // Never propagate provider error bodies, which can include user data.
  if (!response.ok) throw Object.assign(new Error('Provider request failed'), { status: response.status });
  const completion = await response.json();
  return parseCompletion(completion, notes);
}
