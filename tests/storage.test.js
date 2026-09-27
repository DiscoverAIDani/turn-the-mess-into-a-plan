import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorage, STORAGE_KEY } from '../public/storage.js';
import { PlanState } from '../public/plan-state.js';

const result = () => ({ kind: 'plan', goal: 'Call Maya', tasks: [{ id: 'call', text: 'Call Maya',
  sourceExcerpt: 'Call Maya.', appointmentTime: null }], priorityTaskIds: ['call'], attention: [] });
const saved = () => ({ version: 1, notes: 'Edited notes', result: result(), completedTaskIds: ['call'] });
function memory() {
  const entries = new Map();
  return { entries, getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
}

test('restore notes, latest plan, and checks while saving only durable fields', () => {
  const backend = memory();
  const storage = createStorage(() => backend);
  assert.deepEqual(storage.load(), { data: null, error: null });
  assert.equal(storage.save({ ...saved(), completedTaskIds: new Set(['call']), loading: true, error: 'Temporary', confirmation: 'clear' }), true);
  assert.deepEqual(storage.load(), { data: saved(), error: null });
  const raw = JSON.parse(backend.entries.get(STORAGE_KEY));
  assert.deepEqual(Object.keys(raw), ['version', 'notes', 'result', 'completedTaskIds']);
  raw.loading = true;
  backend.setItem(STORAGE_KEY, JSON.stringify(raw));
  assert.equal('loading' in storage.load().data, false);
});

test('notes-only and no-action work replace old saved plans; over-limit edited notes survive', () => {
  const storage = createStorage(() => backend);
  const backend = memory();
  storage.save(saved());
  for (const next of [
    { notes: 'x'.repeat(6001), result: null, completedTaskIds: [] },
    { notes: 'The logo is green.', result: { kind: 'no_actions', goal: '', tasks: [], priorityTaskIds: [], attention: [] }, completedTaskIds: [] },
  ]) {
    assert.equal(storage.save(next), true);
    assert.deepEqual(storage.load().data, { version: 1, ...next });
  }
});

test('corrupted JSON, incompatible versions, malformed results, and invalid completion IDs do not restore', () => {
  const backend = memory();
  const storage = createStorage(() => backend);
  const invalid = ['{bad', 'null', JSON.stringify({ ...saved(), version: 2 }),
    JSON.stringify({ ...saved(), notes: 42 }), JSON.stringify({ ...saved(), result: { kind: 'plan' } }),
    JSON.stringify({ ...saved(), completedTaskIds: ['missing'] }),
    JSON.stringify({ ...saved(), completedTaskIds: ['call', 'call'] }),
    JSON.stringify({ ...saved(), result: null }),
    JSON.stringify({ ...saved(), result: { kind: 'no_actions', goal: '', tasks: [], priorityTaskIds: [], attention: [] } })];
  for (const raw of invalid) {
    backend.setItem(STORAGE_KEY, raw);
    assert.deepEqual(storage.load(), { data: null, error: 'invalid' });
  }
});

test('storage access, read, quota, and removal exceptions are controlled', () => {
  const throws = () => { throw new Error('Storage unavailable'); };
  for (const getter of [throws, () => ({ getItem: throws, setItem: throws, removeItem: throws })]) {
    const storage = createStorage(getter);
    assert.deepEqual(storage.load(), { data: null, error: 'unavailable' });
    assert.equal(storage.save(saved()), false);
    assert.equal(storage.clear(), false);
  }
});

test('clear removes only the app entry', () => {
  const backend = memory();
  const storage = createStorage(() => backend);
  storage.save(saved());
  backend.setItem('unrelated-app', 'keep');
  assert.equal(storage.clear(), true);
  assert.equal(backend.getItem(STORAGE_KEY), null);
  assert.equal(backend.getItem('unrelated-app'), 'keep');
});

test('clearing invalidates pending results and failures without disturbing a newer generation', () => {
  const state = new PlanState();
  state.accept(state.begin(), result());
  state.toggle('call', true);
  const old = state.begin();
  state.clear();
  assert.equal(state.result, null);
  assert.equal(state.completedTaskIds.size, 0);
  assert.equal(state.loading, false);
  assert.equal(state.accept(old, result()), false);
  const next = state.begin();
  assert.equal(state.fail(old), false);
  assert.equal(state.isCurrent(next), true);
  assert.equal(state.accept(next, result()), true);
});

test('failed generation leaves persisted result and checks intact alongside edited notes', () => {
  const backend = memory();
  const storage = createStorage(() => backend);
  const state = new PlanState();
  state.accept(state.begin(), result());
  state.toggle('call', true);
  storage.save({ notes: 'Call Jordan instead.', result: state.result, completedTaskIds: state.completedTaskIds });
  const previous = backend.getItem(STORAGE_KEY);
  state.fail(state.begin());
  assert.equal(backend.getItem(STORAGE_KEY), previous);
  assert.equal(storage.load().data.notes, 'Call Jordan instead.');
  assert.deepEqual(storage.load().data.completedTaskIds, ['call']);
});
