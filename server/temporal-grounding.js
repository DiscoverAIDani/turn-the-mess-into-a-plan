// Conservative, deterministic guard for common temporal claims.
// Task wording is checked against that task's exact source excerpt, not another task.
// This does not attempt to prove the meaning of arbitrary natural language.
const normalize = text => text.normalize('NFKC').toLowerCase()
  .replace(/[’‘]/g, "'").replace(/[–—]/g, '-').replace(/(?<=[a-z])-(?=[a-z])/g, ' ').replace(/\s+/g, ' ').trim();

export const ORDER_UNCERTAINTY = 'Suggested order only: whether untimed work fits before fixed appointments is unknown.';

const claimPatterns = [
  /\b(?:today|tonight|tomorrow|yesterday|now|immediately|immediate|asap|urgent|urgently|soon|shortly|promptly|already|currently|overdue|later|earlier|beforehand|afterwards|upcoming)\b/g,
  /\b(?:this|next|last|every|each|coming|following)\s+(?:(?:early|late)\s+)?(?:morning|afternoon|evening|night|day|week|weekend|month|quarter|year)\b/g,
  /\b(?:this|next|last|every|each|coming|following)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g,
  /\b(?:daily|weekly|monthly|yearly|annually|hourly|morning|afternoon|evening|tonight|noon|midnight|eod|eow|cob)\b/g,
  /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day)?s?\b/g,
  /\b(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b/g,
  /\b(?:january|february|march|april|june|july|august|september|october|november|december)\b/g,
  /\bmay\s+(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/g,
  /\b\d{4}-\d{1,2}-\d{1,2}\b/g,
  /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g,
  /\b\d{1,2}:\d{2}(?:\s*[ap]\.?m\.?)?/g,
  /\b\d{1,2}\s*[ap]\.?m\.?/g,
  /\bat\s+\d{1,2}\b(?![\d:]|\s*[ap]\.?m)|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+o'?clock\b/g,
  /\b(?:utc|gmt)(?:[+-]\d{1,2}(?::\d{2})?)?\b|\b(?:pst|pdt|mst|mdt|cst|cdt|est|edt)\b/g,
  /\b(?:\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half(?: an?)?)\s*(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?)\b/g,
  /\b(?:in|for)\s+(?:\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|a few|a couple of|several|half an?)\s+(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?)\b/g,
  /\b(?:end|start|beginning)\s+of\s+(?:(?:the|this|next)\s+)?(?:day|week|month|year|business|workday)\b/g,
  // A relation must preserve its target too: "before Friday" cannot become "before Monday".
  /\b(?:before|after|until|within|during|by)\b[^.!?;\n]*/g,
  /\b(?:deadline|deadlines|due)\b[^.!?;\n]*/g,
];

export function hasSupportedTiming(text, evidence) {
  const source = normalize(evidence);
  const output = normalize(text);
  for (const pattern of claimPatterns) {
    // matchAll clones the global regex, avoiding shared lastIndex state.
    for (const match of output.matchAll(pattern)) {
      const claim = match[0].trim();
      const escaped = claim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Token boundaries prevent e.g. "now" matching a name such as "Snow".
      if (!new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i').test(source)) return false;
    }
  }
  return true;
}

export function hasGroundedTemporalLanguage(result, notes) {
  if (!hasSupportedTiming(result.goal, notes)) return false;
  for (const task of result.tasks) {
    if (!hasSupportedTiming(task.text, task.sourceExcerpt)) return false;
    if (task.appointmentTime !== null && !hasSupportedTiming(task.appointmentTime, task.sourceExcerpt)) return false;
  }
  const hasMixedTasks = result.tasks.some(task => task.appointmentTime !== null)
    && result.tasks.some(task => task.appointmentTime === null);
  return result.attention.every(item => {
    // This exact caveat describes uncertainty in our ordering, not a new deadline.
    // No general exemption for "uncertainty" or "assumption": those can invent facts too.
    if (item.kind === 'uncertainty' && item.text === ORDER_UNCERTAINTY && hasMixedTasks) return true;
    return hasSupportedTiming(item.text, notes);
  });
}

export const temporalInstructions = `Never infer temporal language from the app's labels or the idea of a daily plan. All generated text, including the goal, task descriptions, and attention items, must avoid timing, dates, deadlines, durations, frequency, or urgency not explicitly supplied by the notes. Do not invent frequency, recurrence, cadence, timing, deadlines, or scheduling. Words such as daily, weekly, monthly, every, before, after, today, tomorrow, now, immediately, this morning, by, and due are prohibited unless that same concept is explicitly present in the source notes and applies to the action being described. A time window is not recurrence: "sometime this week" permits that wording for the supplies task but NEVER "weekly tasks"; "today's payments" does not mean "daily payments". For mixed notes, summarize the actions in the goal without a temporal label; for example, "Handle customer calls, appointments, payments, and supplies". Before returning JSON, check every generated field for unsupported temporal concepts and remove them. Task timing must be supported by that task's verbatim sourceExcerpt; timing in another task does not apply. For the exact input "Call Maya back.", a valid goal is "Return Maya's call" and task is "Call Maya back" with appointmentTime null, one priority, and no invented attention item. Never add "today". When describing supplied timing, retain the original temporal wording rather than paraphrasing it. If an untimed task precedes a fixed appointment, include exactly this uncertainty text: "${ORDER_UNCERTAINTY}". This specific caveat is about uncertain fit, not permission to assert any deadline. Do not invent other temporal assumptions or use an uncertainty label to introduce unsupported timing.`;
