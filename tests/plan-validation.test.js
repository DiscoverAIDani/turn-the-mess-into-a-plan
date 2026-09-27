import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.js';
import { generatePlan, UPSTREAM_TIMEOUT_MS, OUTPUT_TOKEN_LIMIT } from '../server/nebius.js';
import { validatePlan, parseCompletion, InvalidPlanError } from '../server/validate-plan.js';
import { ORDER_UNCERTAINTY } from '../server/temporal-grounding.js';

const notes = 'Call Maya back. 9:00 AM carpet cleaning.';
function plan() {
  return {
    kind: 'plan', goal: 'Return the call and complete the appointment.',
    tasks: [
      { id: 'call', text: 'Call Maya back', appointmentTime: null, sourceExcerpt: 'Call Maya back.' },
      { id: 'clean', text: 'Carpet cleaning', appointmentTime: '9:00 AM', sourceExcerpt: '9:00 AM carpet cleaning.' },
    ], priorityTaskIds: ['call', 'clean'], attention: [{ kind: 'uncertainty', text: ORDER_UNCERTAINTY }],
  };
}
const noActions = () => ({ kind: 'no_actions', goal: '', tasks: [], priorityTaskIds: [], attention: [] });
const envelope = (result) => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(result) } }] });

test('accepts a grounded plan and a valid no-action result', () => {
  assert.deepEqual(validatePlan(plan(), notes), plan());
  assert.deepEqual(parseCompletion(envelope(noActions()), 'The logo is green.'), noActions());
});

test('rejects unknown fields, wrong types, and blank content', () => {
  for (const change of [
    value => { value.extra = 'unexpected'; },
    value => { value.tasks = 'wrong'; },
    value => { value.goal = ' '; },
    value => { value.tasks[0].text = ''; },
    value => { value.attention = [{ kind: 'blocker', text: '' }]; },
  ]) {
    const result = plan(); change(result);
    assert.throws(() => validatePlan(result, notes), InvalidPlanError);
  }
});

test('rejects duplicate IDs, invalid priority references, and invented evidence or times', () => {
  for (const change of [
    value => { value.tasks[1].id = 'call'; },
    value => { value.priorityTaskIds = ['unknown']; },
    value => { value.priorityTaskIds = ['call', 'call']; },
    value => { value.priorityTaskIds = []; },
    value => { value.priorityTaskIds = ['call']; },
    value => { value.attention = []; },
    value => { value.tasks[0].sourceExcerpt = 'Pay Maya'; },
    value => { value.tasks[1].appointmentTime = '10:00 AM'; },
  ]) {
    const result = plan(); change(result);
    assert.throws(() => validatePlan(result, notes), InvalidPlanError);
  }
});

test('no-action results must not contain an invented goal, tasks, or priorities', () => {
  for (const change of [
    value => { value.goal = 'Find something to do'; },
    value => { value.tasks = plan().tasks; },
    value => { value.priorityTaskIds = ['call']; },
  ]) {
    const result = noActions(); change(result);
    assert.throws(() => validatePlan(result, notes), InvalidPlanError);
  }
});

test('rejects malformed JSON, refusal, truncated or missing completions', () => {
  for (const completion of [
    {}, { choices: [] },
    { choices: [{ finish_reason: 'length', message: { content: JSON.stringify(plan()) } }] },
    { choices: [{ finish_reason: 'stop', message: { refusal: 'refused', content: JSON.stringify(plan()) } }] },
    { choices: [{ finish_reason: 'stop', message: { content: '{invalid}' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: '```json\n{}\n```' } }] },
  ]) assert.throws(() => parseCompletion(completion, notes), InvalidPlanError);
});

test('provider call uses the approved model config, structured schema, and output cap', async () => {
  let request;
  const result = await generatePlan(notes, {
    apiKey: 'synthetic-test-key', model: 'test-model',
    fetchImpl: async (url, options) => {
      request = { url, ...options };
      return new Response(JSON.stringify(envelope(plan())), { status: 200 });
    },
  });
  assert.deepEqual(result, plan());
  assert.equal(UPSTREAM_TIMEOUT_MS, 15_000);
  assert.equal(OUTPUT_TOKEN_LIMIT, 4096);
  assert.equal(request.url, 'https://api.tokenfactory.nebius.com/v1/chat/completions');
  const payload = JSON.parse(request.body);
  assert.equal(payload.model, 'test-model');
  assert.equal(payload.max_tokens, 4096);
  assert.deepEqual(payload.chat_template_kwargs, { enable_thinking: false });
  assert.equal(payload.response_format.type, 'json_schema');
  assert.equal(payload.response_format.json_schema.strict, true);
  assert.equal(payload.messages[1].content, notes);
  assert.ok(!JSON.stringify(result).includes('synthetic-test-key'));
});

test('provider refusal, malformed data, and HTTP errors reject rather than becoming no-action success', async () => {
  for (const response of [
    new Response('private provider detail', { status: 429 }),
    new Response('not JSON', { status: 200 }),
    new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { refusal: 'no' } }] })),
  ]) {
    await assert.rejects(generatePlan(notes, {
      apiKey: 'synthetic-test-key', model: 'test-model', fetchImpl: async () => response,
    }));
  }
});

test('an aborting provider request rejects on timeout without retrying', async () => {
  let attempts = 0;
  const fetchImpl = (_url, { signal }) => new Promise((_resolve, reject) => {
    attempts++;
    // Keep this deterministic test alive while AbortSignal.timeout runs.
    const keepAlive = setTimeout(() => reject(new Error('Timeout signal did not fire')), 1000);
    signal.addEventListener('abort', () => { clearTimeout(keepAlive); reject(signal.reason); }, { once: true });
  });
  await assert.rejects(generatePlan(notes, { apiKey: 'synthetic-test-key', model: 'test-model', timeoutMs: 10, fetchImpl }), { name: 'TimeoutError' });
  assert.equal(attempts, 1);
});

async function withServer(generate, check) {
  const server = createApp({ generate }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try { await check(url); }
  finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}
const post = (url, value) => fetch(`${url}/api/plan`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: value }),
});

test('API rejects blank, wrong-type, and over-limit input without a provider call', async () => {
  let calls = 0;
  await withServer(async () => { calls++; return plan(); }, async url => {
    for (const value of ['', '  ', null, 42, 'x'.repeat(6001)]) {
      const response = await post(url, value);
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: 'INVALID_NOTES' });
    }
  });
  assert.equal(calls, 0);
});

test('API accepts valid and exactly 6,000-character input', async () => {
  const received = [];
  await withServer(async value => { received.push(value); return noActions(); }, async url => {
    for (const value of [notes, 'x'.repeat(6000)]) {
      const response = await post(url, value);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await response.json(), { result: noActions() });
    }
  });
  assert.deepEqual(received.map(value => value.length), [notes.length, 6000]);
});

test('API sanitizes provider failure and timeout; it never leaks raw output', async () => {
  for (const error of [new Error('raw provider output synthetic-test-key'), new DOMException('secret details', 'TimeoutError')]) {
    await withServer(async () => { throw error; }, async url => {
      const response = await post(url, notes);
      assert.equal(response.status, 502);
      assert.deepEqual(await response.json(), { error: 'GENERATION_FAILED' });
    });
  }
});

test('unsupported today from the model becomes a safe API failure, not browser output', async () => {
  const input = 'Call Maya back.';
  const result = { kind: 'plan', goal: 'Return Maya’s call today.', tasks: [{ id: 'call', text: 'Call Maya back', sourceExcerpt: input, appointmentTime: null }], priorityTaskIds: ['call'], attention: [] };
  await withServer(value => generatePlan(value, {
    apiKey: 'synthetic-test-key', model: 'test-model',
    fetchImpl: async () => new Response(JSON.stringify(envelope(result))),
  }), async url => {
    const response = await post(url, input);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: 'GENERATION_FAILED' });
  });
});

test('only public assets are served; private paths and foreign origins are rejected', async () => {
  await withServer(async () => plan(), async url => {
    assert.equal((await fetch(url)).status, 200);
    for (const path of ['/.env', '/.env.example', '/server/nebius.js', '/devpost/learner-profile.md', '/package.json']) {
      const response = await fetch(url + path);
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { error: 'NOT_FOUND' });
    }
    const response = await fetch(url + '/api/plan', { method: 'POST', headers: { Origin: 'https://foreign.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) });
    assert.equal(response.status, 403);
  });
});

test('malformed and oversized request bodies return safe errors', async () => {
  await withServer(async () => plan(), async url => {
    for (const [body, status] of [['{bad', 400], [JSON.stringify({ notes: 'x'.repeat(40_000) }), 413]]) {
      const response = await fetch(url + '/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      assert.equal(response.status, status);
      assert.deepEqual(await response.json(), { error: 'INVALID_NOTES' });
    }
  });
});
