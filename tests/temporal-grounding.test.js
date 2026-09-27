import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan, InvalidPlanError } from '../server/validate-plan.js';
import { hasSupportedTiming, ORDER_UNCERTAINTY } from '../server/temporal-grounding.js';

const notes = 'Call Maya back.';
const valid = () => ({
  kind: 'plan', goal: 'Return Maya’s call',
  tasks: [{ id: 'call', text: 'Call Maya back', appointmentTime: null, sourceExcerpt: notes }],
  priorityTaskIds: ['call'], attention: [],
});

test('exact Call Maya back. regression: accept untimed wording and reject today', () => {
  assert.deepEqual(validatePlan(valid(), notes), valid());
  const result = valid();
  result.goal = 'Return Maya’s call today.';
  assert.throws(() => validatePlan(result, notes), InvalidPlanError);
});

test('reject unsupported temporal language in goal, task, and every attention category', () => {
  for (const timing of ['today', 'now', 'this morning', 'tomorrow', 'tonight', 'immediately', 'urgently', 'soon', 'later', 'before lunch', 'after lunch', 'by Friday', 'next Friday', 'within two hours', 'due tomorrow', 'deadline is Friday', 'at 9:00 AM', 'at 3 PM', 'at 8', 'at nine o’clock', 'on 2026-10-01', 'on October 1', 'in October', 'every week', 'daily', 'in 30 minutes', 'in a few hours', 'before calling Jordan', 'by end-of-day']) {
    const goal = valid(); goal.goal = `Return Maya’s call ${timing}.`;
    assert.throws(() => validatePlan(goal, notes), InvalidPlanError, `Goal must reject ${timing}`);
    const task = valid(); task.tasks[0].text = `Call Maya back ${timing}.`;
    assert.throws(() => validatePlan(task, notes), InvalidPlanError, `Task must reject ${timing}`);
    for (const kind of ['blocker', 'uncertainty', 'context', 'assumption']) {
      const attention = valid(); attention.attention = [{ kind, text: `Call Maya back ${timing}.` }];
      assert.throws(() => validatePlan(attention, notes), InvalidPlanError, `Attention ${kind} must reject ${timing}`);
    }
  }
});

test('allow timing explicitly supplied for that task', () => {
  for (const timing of ['today', 'this morning', 'before lunch', 'by Friday', 'at 9:00 AM', 'within two hours', 'on October 1', 'on 2026-10-01']) {
    const input = `Call Maya back ${timing}.`;
    const result = valid();
    result.goal = `Return Maya’s call ${timing}.`;
    result.tasks[0].text = input;
    result.tasks[0].sourceExcerpt = input;
    assert.doesNotThrow(() => validatePlan(result, input));
  }
});

test('timing from a payment task cannot be assigned to the untimed callback', () => {
  const input = 'Call Maya back. Enter today’s payments.';
  const result = valid();
  result.tasks.push({ id: 'payments', text: 'Enter today’s payments', appointmentTime: null, sourceExcerpt: 'Enter today’s payments.' });
  result.priorityTaskIds.push('payments');
  assert.doesNotThrow(() => validatePlan(result, input));
  result.tasks[0].text = 'Call Maya back today';
  assert.throws(() => validatePlan(result, input), InvalidPlanError);
});

test('time values and deadline targets must match evidence, not just a temporal keyword', () => {
  assert.equal(hasSupportedTiming('Call before Monday', 'Call before Friday'), false);
  assert.equal(hasSupportedTiming('Call at 10:00 AM', 'Call at 9:00 AM'), false);
  assert.equal(hasSupportedTiming('Call within two hours', 'Call within three hours'), false);
  assert.equal(hasSupportedTiming('Call now', 'Call Snow'), false);
  assert.equal(hasSupportedTiming('Carpet cleaning at 9:00 AM', '9:00 AM carpet cleaning.'), true);
  assert.equal(hasSupportedTiming('Call at 3 PM', '3 PM call.'), true);
  assert.equal(hasSupportedTiming('Place the weekly supply order', 'Order supplies sometime this week.'), false);
});

test('only the exact ordering caveat is exempt, and only for mixed timed/untimed tasks', () => {
  const result = valid();
  result.attention = [{ kind: 'uncertainty', text: ORDER_UNCERTAINTY }];
  assert.throws(() => validatePlan(result, notes), InvalidPlanError);
  const input = `${notes} 9:00 AM carpet cleaning.`;
  result.tasks.push({ id: 'clean', text: 'Carpet cleaning', appointmentTime: '9:00 AM', sourceExcerpt: '9:00 AM carpet cleaning.' });
  result.priorityTaskIds.push('clean');
  assert.doesNotThrow(() => validatePlan(result, input));
  result.attention[0].text += ' Finish the call today.';
  assert.throws(() => validatePlan(result, input), InvalidPlanError);
});

test('no-action context cannot introduce timing either', () => {
  const result = { kind: 'no_actions', goal: '', tasks: [], priorityTaskIds: [], attention: [{ kind: 'context', text: 'The walls are cream today.' }] };
  assert.throws(() => validatePlan(result, 'The office walls are cream.'), InvalidPlanError);
});
