// Explicit live benchmark: synthetic notes, production settings, no automatic retries.
import { generatePlan, UPSTREAM_TIMEOUT_MS } from '../server/nebius.js';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const business = "Call Maya back about missed estimate — urgent. 9:00 AM carpet cleaning. 11:30 AM upholstery job. Follow up with Jordan. Post one Facebook update. Enter today's payments. Need to order supplies sometime this week.";
const cases = [
  ['business', business, 3],
  ['one-task', 'Call Maya back.', 1],
  ['two-task', 'Call Maya back. Enter today’s payments.', 2],
  ['context-only', 'The business logo is green. The office walls are cream.', 0],
  ['input-limit', 'Call Maya back.'.padEnd(6000, ' '), 1],
];
const rounds = Number(process.env.BENCHMARK_ROUNDS || 2);
assert.ok(Number.isInteger(rounds) && rounds >= 1 && rounds <= 10);
const rows = [];
for (let round = 1; round <= rounds; round++) {
  for (const [name, notes, priorities] of cases) {
    const started = performance.now();
    let syntheticCompletion;
    try {
      const result = await generatePlan(notes, { fetchImpl: async (...args) => {
        const response = await fetch(...args);
        if (response.ok) syntheticCompletion = await response.clone().json();
        return response;
      } });
      assert.equal(result.priorityTaskIds.length, priorities);
      assert.equal(result.kind, priorities ? 'plan' : 'no_actions');
      if (name === 'business') {
        assert.ok(result.tasks.some(t => t.appointmentTime === '9:00 AM'));
        assert.ok(result.tasks.some(t => t.appointmentTime === '11:30 AM'));
        assert.ok(result.tasks.some(t => /supplies/i.test(t.text) && /this week/i.test(t.text)));
      }
      rows.push({ round, name, passed: true, latencyMs: Math.round(performance.now() - started) });
    } catch (error) {
      await mkdir('.tmp', { recursive: true });
      await writeFile(`.tmp/benchmark-failure-${round}-${name}.json`, JSON.stringify(syntheticCompletion ?? {}, null, 2));
      rows.push({ round, name, passed: false, latencyMs: Math.round(performance.now() - started), error: error.name });
    }
    console.log(JSON.stringify(rows.at(-1)));
  }
}
const timings = rows.map(r => r.latencyMs).sort((a, b) => a - b);
const report = { model: process.env.NEBIUS_MODEL, thinking: false, timeoutMs: UPSTREAM_TIMEOUT_MS,
  samples: rows.length, passed: rows.filter(r => r.passed).length,
  medianMs: (timings[Math.floor((timings.length - 1) / 2)] + timings[Math.floor(timings.length / 2)]) / 2, maxMs: timings.at(-1), rows };
await mkdir('.tmp', { recursive: true });
await writeFile('.tmp/nebius-benchmark.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, rows: undefined }));
if (rows.some(r => !r.passed)) process.exitCode = 1;
