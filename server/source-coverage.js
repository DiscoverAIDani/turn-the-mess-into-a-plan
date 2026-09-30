// Conservative coverage for explicit action clauses, not general language understanding.
// A model's task count alone cannot detect an omitted action replaced by a duplicate.
const actionStart = /^(?:(?:I\s+)?(?:still\s+)?(?:please|need to|needs to|must|should|remember to)\s+)?(?:call|contact|email|text|reply|respond|follow up|post|publish|enter|record|order|buy|pay|send|submit|book|schedule|confirm|cancel|prepare|review|finish|complete|update|create|write|check|clean|pick up|drop off)\b/i;
const appointmentStart = /^(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:[ap]\.?m\.?)(?:\s|$)/i;
// An explicit need for an object supports an action; a bare description does not.
const objectNeed = /(?:^|\band\s+)((?:I\s+)?(?:still\s+)?need\s+(?:a|an|the|some)\s+.+)$/i;
const objectNeedStart = /^(?:I\s+)?(?:still\s+)?need\s+(?:a|an|the|some)\s+/i;
const descriptiveStart = /^(?:[\p{L}\p{N}'’‘-]+\s+){1,5}(?:is|are|was|were|has|have)\b/iu;
const startsClause = text => actionStart.test(text) || appointmentStart.test(text)
  || objectNeedStart.test(text) || descriptiveStart.test(text);

function coordinatedClauses(sentence) {
  // Split only where the following words start another clause, not noun lists,
  // names, or timing phrases such as "Call Sarah about lunch, next week".
  const parts = [];
  let start = 0;
  for (const match of sentence.matchAll(/,\s*(?:and\s+)?|\s+and\s+/gi)) {
    const rest = sentence.slice(match.index + match[0].length);
    const comma = match[0].startsWith(',');
    // Keep descriptive context attached to an object need (birthday + gift).
    const head = sentence.slice(start, match.index).trim();
    const splitNeed = objectNeedStart.test(rest)
      && (actionStart.test(head) || appointmentStart.test(head) || objectNeed.test(head));
    if (comma ? startsClause(rest) : actionStart.test(rest) || appointmentStart.test(rest) || splitNeed) {
      parts.push(sentence.slice(start, match.index));
      start = match.index + match[0].length;
    }
  }
  parts.push(sentence.slice(start));
  return parts.map(text => text.trim());
}
const normalize = text => text.toLowerCase().replace(/[‘’]/g, "'")
  .replace(/\b([ap])\.m\./g, '$1m')
  .replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, '')
  .replace(/^\s*(?:i\s+)?(?:still\s+)?(?:please|need to|needs to|must|should|remember to)\s+/, '')
  .replace(/\s*[—–-]\s*urgent[.!]?\s*$/, '')
  .replace(/[.!?]+\s*$/, '').replace(/\s+/g, ' ').trim();

export function hasExplicitSourceCoverage(result, notes) {
  // Normalize clock abbreviations before sentence splitting, so a.m. stays together.
  const required = notes.replace(/\b([ap])\.m\./gi, '$1m')
    .split(/[\n;!?]+|\.(?=\s|$)/)
    .map(text => text.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, '').trim())
    .flatMap(coordinatedClauses)
    .filter(text => actionStart.test(text) || appointmentStart.test(text) || objectNeed.test(text))
    .map(text => {
      const need = text.match(objectNeed);
      // A need may quote its immediately attached context or just the need.
      // Neither option includes another recognized action clause.
      return [...new Set([normalize(text), ...(need ? [normalize(need[1])] : [])])];
    });
  const covered = new Set();
  for (const task of result.tasks) {
    const evidence = normalize(task.sourceExcerpt);
    const matches = required.filter(alternatives => alternatives.includes(evidence));
    // Require a task-local excerpt: copying all notes cannot disguise a dropped task.
    for (const clause of matches) covered.add(clause);
  }
  return required.every(clause => covered.has(clause));
}
