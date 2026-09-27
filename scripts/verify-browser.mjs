// Dependency-free Windows browser check. Run with --env-file=.env; synthetic notes only.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.js';
import { generatePlan } from '../server/nebius.js';
import { verifyLifecycle } from './verify-lifecycle.mjs';

const appServer = createApp({ generate: async notes => {
  try {
    const result = await generatePlan(notes, { fetchImpl: async (...args) => {
      const response = await fetch(...args);
      if (response.ok) {
        const body = await response.clone().json();
        const content = body.choices?.[0]?.message?.content;
        if (typeof content === 'string') {
          await mkdir('.tmp', { recursive: true });
          await writeFile('.tmp/synthetic-provider-content.txt', content);
        }
      }
      return response;
    } });
    await mkdir('.tmp', { recursive: true });
    await writeFile('.tmp/latest-synthetic-result.json', JSON.stringify(result, null, 2));
    return result;
  }
  catch (error) { console.log(`Controlled generation failure: ${error.name}${Number.isInteger(error.status) ? ` HTTP ${error.status}` : ''}`); throw error; }
} }).listen(0, '127.0.0.1');
await new Promise((resolve, reject) => { appServer.once('listening', resolve); appServer.once('error', reject); });
const appUrl = `http://127.0.0.1:${appServer.address().port}`;

const executable = process.env.BROWSER_EXE || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = await mkdtemp(join(tmpdir(), 'messy-plan-browser-'));
const browserProcess = spawn(executable, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let browserSocket;
let pageSocket;
async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let nextId = 0;
  const pending = new Map();
  const handlers = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const job = pending.get(message.id);
      if (!job) return;
      pending.delete(message.id); clearTimeout(job.timer);
      message.error ? job.reject(new Error(message.error.message)) : job.resolve(message.result);
    } else handlers.get(message.method)?.(message.params);
  });
  return {
    socket,
    on: (name, handler) => handlers.set(name, handler),
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++nextId;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Browser command timed out: ${method}`)); }, 30_000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
  };
}
try {
  let active;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { active = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split(/\r?\n/); break; } catch { await sleep(200); }
  }
  assert.ok(active, 'Browser did not start');
  browserSocket = await connect(`ws://127.0.0.1:${active[0]}${active[1]}`);
  const tabs = await (await fetch(`http://127.0.0.1:${active[0]}/json/list`)).json();
  pageSocket = await connect(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  const cdp = pageSocket;
  const errors = [];
  cdp.on('Runtime.exceptionThrown', () => errors.push('Browser JavaScript exception'));
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  const evaluate = async expression => {
    const value = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (value.exceptionDetails) throw new Error('Browser evaluation failed');
    return value.result.value;
  };
  const waitFor = async expression => {
    for (let attempt = 0; attempt < 110; attempt++) {
      if (await evaluate(expression)) return;
      await sleep(200);
    }
    throw new Error('Browser state did not become ready');
  };
  const submit = async notes => {
    await evaluate(`document.querySelector('#notes').value=${JSON.stringify(notes)}; document.querySelector('#notes').dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('#plan-form').requestSubmit();`);
    await waitFor(`!document.querySelector('#make-plan').disabled`);
    console.log(JSON.stringify(await evaluate(`({error:document.querySelector('#error-box').hidden ? null : document.querySelector('#error-message').textContent,heading:document.querySelector('.priorities-card h3')?.textContent || null})`)));
  };
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Page.navigate', { url: appUrl });
  await waitFor(`document.querySelector('#notes') && document.readyState === 'complete'`);
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate('document.activeElement.id'), 'notes', 'Keyboard can reach notes first');
  await mkdir('.tmp', { recursive: true });
  const screenshot = async name => {
    const result = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await writeFile(`.tmp/${name}.png`, Buffer.from(result.data, 'base64'));
  };
  await screenshot('initial-desktop');
  await submit('   ');
  assert.ok((await evaluate(`document.querySelector('#error-message').textContent`)).includes('Add a few notes'));
  if (!process.argv.includes('--lifecycle-only')) {
  const business = "Call Maya back about missed estimate — urgent. 9:00 AM carpet cleaning. 11:30 AM upholstery job. Follow up with Jordan. Post one Facebook update. Enter today's payments. Need to order supplies sometime this week.";
  const started = Date.now();
  await submit(business);
  assert.equal(await evaluate(`document.querySelector('#error-box').hidden`), true, 'Live business request succeeded');
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('.result-card h3'),e=>e.textContent)`), ['Your Goal', 'Top 3 Priorities', 'Your Plan', 'Needs Attention']);
  assert.ok((await evaluate(`document.querySelector('.plan-list').textContent`)).includes('9:00 AM'));
  assert.ok((await evaluate(`document.querySelector('.plan-list').textContent`)).includes('11:30 AM'));
  const checklist = await evaluate(`Array.from(document.querySelectorAll('.plan-list li'), e=>e.textContent)`);
  assert.ok(checklist.findIndex(text => text.includes('9:00 AM')) < checklist.findIndex(text => text.includes('11:30 AM')), 'Appointments retain chronological order');
  assert.ok(checklist.findIndex(text => text.includes('11:30 AM')) < checklist.findIndex(text => /supplies/i.test(text)), 'Flexible weekly work follows fixed appointments');
  assert.ok((await evaluate(`document.querySelector('.attention-list').textContent`)).includes('uncertainty'), 'Suggested untimed work has a timing uncertainty');
  assert.equal(await evaluate('document.activeElement.id'), 'results');
  console.log(`Live business plan rendered in ${Date.now() - started} ms.`);
  await evaluate('window.scrollTo(0,0)');
  await screenshot('results-desktop');
  const original = await evaluate(`document.querySelector('#result-content').innerHTML`);
  // Simulate a controlled server failure through browser request interception.
  cdp.on('Fetch.requestPaused', ({ requestId }) => {
    cdp.send('Fetch.fulfillRequest', { requestId, responseCode: 502, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from('{"error":"GENERATION_FAILED"}').toString('base64') }).catch(() => errors.push('Interception failed'));
  });
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*/api/plan', requestStage: 'Request' }] });
  await submit('Call Jordan back.');
  assert.equal(await evaluate(`document.querySelector('#result-content').innerHTML`), original, 'Failure retains old result');
  assert.equal(await evaluate(`document.querySelector('#notes').value`), 'Call Jordan back.');
  assert.ok((await evaluate(`document.querySelector('#error-message').textContent`)).includes('Your current plan is still here'));
  assert.equal(await evaluate(`document.querySelector('#try-again').hidden`), false);
  await cdp.send('Fetch.disable');
  await submit('Call Maya back.');
  assert.equal(await evaluate(`document.querySelector('.priorities-card h3')?.textContent`), 'Top Priority');
  assert.equal(await evaluate(`document.querySelector('#error-box').hidden`), true, 'Exact untimed callback succeeds');
  const callbackText = await evaluate(`Array.from(document.querySelectorAll('.goal-card p,.task-content,.attention-list li'), e=>e.textContent).join(' ')`);
  assert.ok(!/\b(today|now|this morning|before|tomorrow|deadline|due|urgent|immediate|soon)\b/i.test(callbackText), 'Exact untimed callback has no invented timing');
  await submit('Call Maya back. Enter today’s payments.');
  assert.equal(await evaluate(`document.querySelector('.priorities-card h3')?.textContent`), 'Top 2 Priorities');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate('window.scrollTo(0,0)');
  assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'No narrow-screen horizontal overflow');
  await screenshot('results-mobile');
  await submit('The business logo is green. The office walls are cream.');
  assert.equal(await evaluate(`Boolean(document.querySelector('.no-actions'))`), true, 'No-action result is rendered');
  assert.equal(await evaluate(`Boolean(document.querySelector('.plan-list'))`), false, 'Old plan is removed');
  assert.ok((await evaluate(`document.querySelector('#notes').value`)).includes('logo is green'));
  }
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await verifyLifecycle({ cdp, evaluate, waitFor, screenshot });
  assert.deepEqual(errors, []);
  console.log(`Browser checks passed (${process.argv.includes('--lifecycle-only') ? 'deterministic lifecycle only' : 'live generation plus lifecycle'}), with no JavaScript exceptions.`);
} finally {
  pageSocket?.socket.close();
  if (browserSocket) { await browserSocket.send('Browser.close').catch(() => {}); browserSocket.socket.close(); }
  else browserProcess.kill();
  await new Promise(resolve => appServer.close(resolve));
}
