import test from 'node:test';
import assert from 'node:assert/strict';
import { PlanState } from '../public/plan-state.js';

const plan = (name = 'Maya') => ({ kind: 'plan', goal: `Call ${name}`,
  tasks: [{ id: 'call', text: `Call ${name}`, sourceExcerpt: `Call ${name}.`, appointmentTime: null }],
  priorityTaskIds: ['call'], attention: [] });
const noActions = () => ({ kind: 'no_actions', goal: '', tasks: [], priorityTaskIds: [], attention: [] });
function checkedPlan() {
  const state = new PlanState();
  state.accept(state.begin(), plan());
  state.toggle('call', true);
  return state;
}

test('completion can be checked and unchecked only for current task IDs', () => {
  const state = checkedPlan();
  assert.deepEqual([...state.completedTaskIds], ['call']);
  assert.equal(state.toggle('unknown', true), false);
  state.toggle('call', false);
  assert.equal(state.completedTaskIds.size, 0);
});

test('generation preserves progress while loading, blocks toggles and duplicate requests', () => {
  const state = checkedPlan();
  const original = state.result;
  state.begin();
  assert.equal(state.begin(), null);
  assert.equal(state.toggle('call', false), false);
  assert.equal(state.result, original);
  assert.deepEqual([...state.completedTaskIds], ['call']);
});

test('successful replacement resets checks even when new task IDs match', () => {
  const state = checkedPlan();
  const replacement = plan('Jordan');
  assert.equal(state.accept(state.begin(), replacement), true);
  assert.equal(state.result, replacement);
  assert.equal(state.completedTaskIds.size, 0);
  assert.equal(state.loading, false);
});

test('valid no-action replacement removes the plan and its completion', () => {
  const state = checkedPlan();
  state.accept(state.begin(), noActions());
  assert.equal(state.result.kind, 'no_actions');
  assert.equal(state.result.tasks.length, 0);
  assert.equal(state.completedTaskIds.size, 0);
});

test('failure preserves the exact previous plan and completion for manual retry', () => {
  const state = checkedPlan();
  const original = state.result;
  assert.equal(state.fail(state.begin()), true);
  assert.equal(state.result, original);
  assert.deepEqual([...state.completedTaskIds], ['call']);
  assert.equal(state.loading, false);
});

test('malformed results cannot clear or partially replace existing work', () => {
  const invalid = [null, {}, { kind: 'plan' }, { ...noActions(), goal: 'Invented' },
    { ...noActions(), tasks: plan().tasks }, { ...plan(), priorityTaskIds: ['missing'] },
    { ...plan(), tasks: [null] }, { ...plan(), attention: [{ kind: 'wrong', text: 'Bad' }] }];
  for (const result of invalid) {
    const state = checkedPlan();
    const original = state.result;
    const id = state.begin();
    assert.throws(() => state.accept(id, result), /Invalid response/);
    state.fail(id);
    assert.equal(state.result, original);
    assert.deepEqual([...state.completedTaskIds], ['call']);
  }
});

test('late success or failure cannot overwrite a newer request or its completed result', () => {
  const state = checkedPlan();
  const old = state.begin();
  state.fail(old);
  const current = state.begin();
  assert.equal(state.accept(old, noActions()), false);
  assert.equal(state.fail(old), false);
  assert.equal(state.loading, true);
  const replacement = plan('Jordan');
  state.accept(current, replacement);
  state.toggle('call', true);
  assert.equal(state.accept(old, plan('Old')), false);
  assert.equal(state.accept(current, noActions()), false, 'Duplicate completion is ignored');
  assert.equal(state.result, replacement);
  assert.deepEqual([...state.completedTaskIds], ['call']);
});
