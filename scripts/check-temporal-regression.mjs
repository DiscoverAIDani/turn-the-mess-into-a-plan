// One live, end-to-end regression request. Run explicitly; not part of npm test.
import assert from 'node:assert/strict';
import { createApp } from '../server/index.js';
import { mkdir, writeFile } from 'node:fs/promises';

const notes = 'Call Maya back.';
const server = createApp().listen(0, '127.0.0.1');
await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
try {
  const started = Date.now();
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/plan`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }), signal: AbortSignal.timeout(20_000),
  });
  assert.equal(response.status, 200, 'Exact input must yield a valid result, not just a safe error');
  const { result } = await response.json();
  assert.equal(result.kind, 'plan');
  assert.equal(result.tasks.length, 1);
  assert.equal(result.priorityTaskIds.length, 1);
  assert.equal(result.tasks[0].sourceExcerpt, notes);
  assert.equal(result.tasks[0].appointmentTime, null);
  const visibleText = [result.goal, ...result.tasks.map(task => task.text), ...result.attention.map(item => item.text)].join(' ');
  assert.ok(!/\b(today|now|morning|afternoon|evening|before|after|tomorrow|tonight|deadline|due|urgent|immediate|soon|later)\b|\d/i.test(visibleText), 'Exact callback result must not contain unsupported timing');
  await mkdir('.tmp', { recursive: true });
  await writeFile('.tmp/temporal-regression.json', JSON.stringify({ notes, passed: true, latencyMs: Date.now() - started, result }, null, 2));
  console.log(JSON.stringify({ passed: true, input: notes, goal: result.goal, task: result.tasks[0].text, latencyMs: Date.now() - started }));
} finally { await new Promise(resolve => server.close(resolve)); }
