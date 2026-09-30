import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan, InvalidPlanError } from '../server/validate-plan.js';
import { generatePlan } from '../server/nebius.js';
import { createApp } from '../server/index.js';
import { ORDER_UNCERTAINTY } from '../server/temporal-grounding.js';
import { hasExplicitSourceCoverage } from '../server/source-coverage.js';

const messyNotes = 'Need to call the dentist, pick up dog food, Mom’s birthday is Friday and I still need a gift, laundry is piling up, and I should email Sarah about lunch next week.';
function messyPlan() {
  return { kind: 'plan', goal: 'Handle the dentist call, dog food, birthday gift, and lunch email',
    tasks: [
      { id: 'dentist', text: 'Call the dentist', sourceExcerpt: 'Need to call the dentist', appointmentTime: null },
      { id: 'food', text: 'Pick up dog food', sourceExcerpt: 'pick up dog food', appointmentTime: null },
      { id: 'gift', text: 'Get a gift for Mom; her birthday is Friday', sourceExcerpt: 'Mom’s birthday is Friday and I still need a gift', appointmentTime: null },
      { id: 'email', text: 'Email Sarah about lunch next week', sourceExcerpt: 'email Sarah about lunch next week', appointmentTime: null },
    ], priorityTaskIds: ['gift', 'dentist', 'food'], attention: [{ kind: 'context', text: 'Laundry is piling up.' }] };
}

test('exact messy paragraph accepts separate action evidence and retains descriptive context', () => {
  assert.doesNotThrow(() => validatePlan(messyPlan(), messyNotes));
  const result = messyPlan();
  result.tasks[0].sourceExcerpt = 'call the dentist';
  result.tasks[3].sourceExcerpt = 'I should email Sarah about lunch next week';
  assert.doesNotThrow(() => validatePlan(result, messyNotes));
  result.tasks[2].sourceExcerpt = 'I still need a gift';
  result.tasks[2].text = 'Get a gift';
  assert.doesNotThrow(() => validatePlan(result, messyNotes));
});

test('every messy paragraph action is required, including the gift need and conjunction-led email', () => {
  for (let index = 0; index < 4; index++) {
    const result = messyPlan();
    result.tasks.splice(index, 1);
    result.tasks.push({ ...result.tasks[0], id: 'duplicate' });
    result.priorityTaskIds = result.tasks.slice(0, 3).map(task => task.id);
    assert.equal(hasExplicitSourceCoverage(result, messyNotes), false);
    assert.throws(() => validatePlan(result, messyNotes), InvalidPlanError);
  }
  const result = messyPlan();
  result.tasks.forEach(task => { task.sourceExcerpt = messyNotes; });
  assert.equal(hasExplicitSourceCoverage(result, messyNotes), false, 'Whole paragraph cannot stand in for local evidence');
  assert.throws(() => validatePlan(result, messyNotes), InvalidPlanError);
  assert.equal(hasExplicitSourceCoverage({ tasks: [] }, messyNotes), false);
});

test('commas in object lists, names, and timing stay in the task evidence', () => {
  for (const [input, excerpts] of [
    ['Buy apples, oranges, and milk, and call Sarah.', ['Buy apples, oranges, and milk', 'call Sarah']],
    ['Call Sarah about lunch, next week and pick up dog food.', ['Call Sarah about lunch, next week', 'pick up dog food']],
    ['Email Smith, Jones and Patel and call the dentist.', ['Email Smith, Jones and Patel', 'call the dentist']],
    ['Call the dentist and I need a gift.', ['Call the dentist', 'I need a gift']],
    ['Call the dentist, laundry is piling up, and email Sarah.', ['Call the dentist', 'email Sarah']],
  ]) {
    const tasks = excerpts.map(sourceExcerpt => ({ sourceExcerpt }));
    assert.equal(hasExplicitSourceCoverage({ tasks }, input), true, input);
    for (let index = 0; index < tasks.length; index++) {
      assert.equal(hasExplicitSourceCoverage({ tasks: tasks.filter((_, i) => i !== index) }, input), false, input);
    }
  }
  assert.equal(hasExplicitSourceCoverage({ tasks: [{ sourceExcerpt: 'Buy apples' }] }, 'Buy apples, oranges, and milk.'), false);
  assert.equal(hasExplicitSourceCoverage({ tasks: [] }, 'Laundry is piling up, and the walls are cream.'), true);
});

test('messy paragraph still rejects changed excerpts and an inapplicable appointment caveat', () => {
  const changedExcerpt = messyPlan();
  changedExcerpt.tasks[0].sourceExcerpt = 'Call the dentist';
  assert.throws(() => validatePlan(changedExcerpt, messyNotes), InvalidPlanError);
  const caveat = messyPlan();
  caveat.attention.push({ kind: 'uncertainty', text: ORDER_UNCERTAINTY });
  assert.throws(() => validatePlan(caveat, messyNotes), InvalidPlanError);
  const borrowedTiming = messyPlan();
  borrowedTiming.tasks[0].text += ' next week';
  assert.throws(() => validatePlan(borrowedTiming, messyNotes), InvalidPlanError);
});

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
