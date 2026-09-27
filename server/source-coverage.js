// Conservative coverage for explicit action clauses, not general language understanding.
// A model's task count alone cannot detect an omitted action replaced by a duplicate.
const actionStart = /^(?:(?:please|need to|needs to|must|should|remember to)\s+)?(?:call|contact|email|text|reply|respond|follow up|post|publish|enter|record|order|buy|pay|send|submit|book|schedule|confirm|cancel|prepare|review|finish|complete|update|create|write|check|clean|pick up|drop off)\b/i;
const appointmentStart = /^(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:[ap]\.?m\.?)(?:\s|$)/i;
const normalize = text => text.toLowerCase().replace(/[‘’]/g, "'")
  .replace(/\b([ap])\.m\./g, '$1m')
  .replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, '')
  .replace(/^\s*(?:please|need to|needs to|must|should|remember to)\s+/, '')
  .replace(/\s*[—–-]\s*urgent[.!]?\s*$/, '')
  .replace(/[.!?]+\s*$/, '').replace(/\s+/g, ' ').trim();

export function hasExplicitSourceCoverage(result, notes) {
  // Normalize clock abbreviations before sentence splitting, so a.m. stays together.
  const clauses = notes.replace(/\b([ap])\.m\./gi, '$1m')
    .split(/[\n;!?]+|\.(?=\s|$)/)
    .map(text => text.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, '').trim())
    .filter(text => actionStart.test(text) || appointmentStart.test(text))
    .map(normalize);
  const required = [...new Set(clauses)];
  const covered = new Set();
  for (const task of result.tasks) {
    const evidence = normalize(task.sourceExcerpt);
    const matches = required.filter(clause => evidence === clause);
    // Require a task-local excerpt: copying all notes cannot disguise a dropped task.
    for (const clause of matches) covered.add(clause);
  }
  return required.every(clause => covered.has(clause));
}
