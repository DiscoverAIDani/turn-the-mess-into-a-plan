// Deterministic browser checks: intercept only the test browser's API requests.
import assert from 'node:assert/strict';

export async function verifyLifecycle({ cdp, evaluate, waitFor, screenshot }) {
  const plan = name => ({ kind: 'plan', goal: `Call ${name}`,
    tasks: [{ id: 'call', text: `Call ${name}`, appointmentTime: null, sourceExcerpt: `Call ${name}.` }],
    priorityTaskIds: ['call'], attention: [] });
  const noActions = { kind: 'no_actions', goal: '', tasks: [], priorityTaskIds: [], attention: [] };
  let payload = { result: plan('Maya') };
  let responseCode = 200;
  let hold = false;
  let heldRequest = null;
  let calls = 0;
  const interceptionErrors = [];
  const fulfill = requestId => cdp.send('Fetch.fulfillRequest', { requestId, responseCode,
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
    body: Buffer.from(JSON.stringify(payload)).toString('base64') });
  cdp.on('Fetch.requestPaused', ({ requestId }) => {
    calls++;
    if (hold) heldRequest = requestId;
    else fulfill(requestId).catch(() => interceptionErrors.push('Request interception failed'));
  });
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*/api/plan', requestStage: 'Request' }] });
  const start = async notes => evaluate(`document.querySelector('#notes').value=${JSON.stringify(notes)}; document.querySelector('#notes').dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('#plan-form').requestSubmit();`);
  const done = () => waitFor(`!document.querySelector('#make-plan').disabled && !document.querySelector('#regenerate-dialog').open`);
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const checked = () => evaluate(`document.querySelector('.plan-list input')?.checked`);
  const confirm = () => click('#confirm-regenerate');
  const dialogOpen = () => evaluate(`document.querySelector('#regenerate-dialog').open`);

  await start('Call Maya.');
  await done();
  assert.equal(await checked(), false);
  await click('.plan-list input');
  assert.equal(await checked(), true);
  await click('.plan-list input');
  assert.equal(await checked(), false, 'Task can be unchecked');
  await click('.plan-list input');
  const original = await evaluate(`document.querySelector('#result-content').innerHTML`);
  const beforeCancel = calls;
  await start('Call Jordan.');
  assert.equal(await dialogOpen(), true);
  assert.equal(await evaluate('document.activeElement.id'), 'cancel-regenerate');
  assert.equal(await evaluate(`document.querySelector('#regenerate-title').textContent`), 'Making a new plan will reset your completed tasks. Continue?');
  await screenshot('slice2-confirm-mobile');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 1000, deviceScaleFactor: 1, mobile: false });
  await screenshot('slice2-confirm-desktop');
  await click('#cancel-regenerate');
  assert.equal(calls, beforeCancel, 'Cancel sends no request');
  assert.equal(await checked(), true);
  assert.equal(await evaluate(`document.querySelector('#result-content').innerHTML`), original);
  assert.equal(await evaluate(`document.querySelector('#notes').value`), 'Call Jordan.');
  await start('Call Jordan.');
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await waitFor(`!document.querySelector('#regenerate-dialog').open`);
  assert.equal(calls, beforeCancel, 'Escape cancels without a request');
  assert.equal(await checked(), true);

  for (const scenario of [
    { code: 502, data: { error: 'GENERATION_FAILED' } },
    { code: 200, data: { result: { kind: 'no_actions', goal: '', tasks: plan('bad').tasks, priorityTaskIds: [], attention: [] } } },
    { code: 200, data: { result: { kind: 'plan' } } },
  ]) {
    responseCode = scenario.code;
    payload = scenario.data;
    await start('Call Jordan.');
    await confirm();
    await done();
    assert.equal(await checked(), true, 'Failure preserves completion');
    assert.equal(await evaluate(`document.querySelector('#result-content').innerHTML`), original, 'Failure preserves exact rendered work');
    assert.ok((await evaluate(`document.querySelector('#error-message').textContent`)).includes('Your current plan is still here'));
    assert.equal(await evaluate(`document.querySelector('#notes').value`), 'Call Jordan.');
  }
  // A retry is also a new attempt that could reset checked tasks.
  await click('#try-again');
  assert.equal(await dialogOpen(), true);
  await click('#cancel-regenerate');

  responseCode = 200;
  payload = { result: plan('Jordan') };
  hold = true;
  await start('Call Jordan.');
  await confirm();
  await waitFor(`document.querySelector('#make-plan').disabled`);
  assert.equal(await checked(), true, 'Confirmation does not immediately discard checks');
  assert.equal(await evaluate(`document.querySelector('#notes').disabled && document.querySelector('.plan-list input').disabled`), true);
  await click('.plan-list input');
  assert.equal(await checked(), true, 'Disabled checkboxes cannot toggle');
  await evaluate(`document.querySelector('#plan-form').requestSubmit()`);
  // Wait for the already-issued request without allowing a provider call.
  for (let attempt = 0; !heldRequest && attempt < 100; attempt++) await new Promise(resolve => setTimeout(resolve, 20));
  assert.ok(heldRequest, 'Confirmed request reached interception');
  const callsWhilePending = calls;
  await fulfill(heldRequest);
  hold = false;
  await done();
  assert.equal(calls, callsWhilePending, 'Duplicate submission does not send another request');
  assert.equal(await checked(), false, 'Valid plan resets completion even for the same task ID');
  assert.equal(await evaluate(`document.querySelector('.goal-card p').textContent`), 'Call Jordan');
  await click('.plan-list input');
  await screenshot('slice2-checked-desktop');

  payload = { result: noActions };
  await start('The logo is green.');
  assert.equal(await dialogOpen(), true);
  await confirm();
  await done();
  assert.equal(await evaluate(`Boolean(document.querySelector('.no-actions'))`), true);
  assert.equal(await evaluate(`document.querySelectorAll('.plan-list input,.goal-card,.priorities-card').length`), 0, 'No-action replacement removes all old plan and checkbox UI');
  await click('.no-actions button');
  assert.equal(await evaluate('document.activeElement.id'), 'notes');

  payload = { result: plan('<img src=x onerror=alert(1)>') };
  await start('Call a contact.');
  assert.equal(await dialogOpen(), false, 'No old completion survives the no-action result');
  await done();
  assert.equal(await evaluate(`document.querySelectorAll('#result-content img').length`), 0, 'Model text remains text, not HTML');
  assert.equal(await checked(), false);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await click('.plan-list input');
  assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'));
  await screenshot('slice2-checked-mobile');
  await cdp.send('Fetch.disable');
  assert.deepEqual(interceptionErrors, []);
  console.log('Slice 2 browser lifecycle passed: toggle/uncheck, Cancel/Escape, no request on cancellation, failure/malformed preservation, retry confirmation, locked loading, duplicate prevention, plan/no-action replacement, safe text, desktop/mobile.');
}
