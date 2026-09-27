import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan, InvalidPlanError } from '../server/validate-plan.js';
import { generatePlan } from '../server/nebius.js';
import { createApp } from '../server/index.js';
import { ORDER_UNCERTAINTY } from '../server/temporal-grounding.js';

const clauses = [
  'Call Maya back about missed estimate — urgent.',
  '9:00 AM carpet cleaning.',
  '11:30 AM upholstery job.',
  'Follow up with Jordan.',
  'Post one Facebook update.',
  'Enter today’s payments.',
  'Order supplies sometime this week.',
];
const notes = clauses.join(' ');
function completePlan() {
  return { kind: 'plan', goal: 'Handle customer work and administrative tasks',
    tasks: clauses.map((sourceExcerpt, index) => ({ id: String(index), sourceExcerpt,
      text: sourceExcerpt, appointmentTime: index === 1 ? '9:00 AM' : index === 2 ? '11:30 AM' : null })),
    priorityTaskIds: ['0', '1', '2'], attention: [{ kind: 'uncertainty', text: ORDER_UNCERTAINTY }] };
}
function omittedPlan() {
  const result = completePlan();
  result.tasks = result.tasks.filter(task => task.id !== '4');
  return result;
}

test('exact Facebook omission: complete seven-task plan passes; six-task result rejects', () => {
  for (const input of [notes, clauses.map(text => `- ${text}`).join('\n'), clauses.join('; ')]) {
    assert.doesNotThrow(() => validatePlan(completePlan(), input));
    assert.throws(() => validatePlan(omittedPlan(), input), InvalidPlanError);
  }
});

test('coverage requires each explicit source action, not merely seven returned tasks', () => {
  for (let index = 0; index < clauses.length; index++) {
    const result = completePlan();
    result.tasks.splice(index, 1);
    const duplicate = { ...result.tasks[0], id: 'replacement' };
    result.tasks.push(duplicate);
    result.priorityTaskIds = result.tasks.slice(0, 3).map(task => task.id);
    assert.throws(() => validatePlan(result, notes), InvalidPlanError);
  }
  const broadEvidence = omittedPlan();
  broadEvidence.tasks.forEach(task => { task.sourceExcerpt = notes; });
  assert.throws(() => validatePlan(broadEvidence, notes), InvalidPlanError);
});

test('explicit actions cannot be hidden in a no-action response; context-only notes remain valid', () => {
  const empty = { kind: 'no_actions', goal: '', tasks: [], priorityTaskIds: [], attention: [] };
  assert.throws(() => validatePlan(empty, notes), InvalidPlanError);
  assert.doesNotThrow(() => validatePlan(empty, 'The business logo is green. The office walls are cream.'));
});

test('source evidence supports paraphrased task text and an omitted urgency suffix', () => {
  const result = completePlan();
  result.tasks[0].sourceExcerpt = 'Call Maya back about missed estimate';
  result.tasks[0].text = 'Return Maya’s call about the missed estimate';
  result.tasks[4].text = 'Share a Facebook update';
  assert.doesNotThrow(() => validatePlan(result, notes));
});

test('exact omission is rejected through the real API route without exposing a partial plan', async () => {
  const server = createApp({ generate: input => generatePlan(input, {
    apiKey: 'synthetic-test-key', model: 'test-model',
    fetchImpl: async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop',
      message: { content: JSON.stringify(omittedPlan()) } }] })),
  }) }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/plan`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }),
    });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: 'GENERATION_FAILED' });
  } finally { await new Promise(resolve => server.close(resolve)); }
});
