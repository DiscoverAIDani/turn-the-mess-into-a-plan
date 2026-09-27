import assert from 'node:assert/strict';

export async function verifyPersistence({ cdp, evaluate, waitFor, screenshot }) {
  const key = 'messy-plan:v1';
  const plan = name => ({ kind: 'plan', goal: `Call ${name}`, tasks: [{ id: 'call', text: `Call ${name}`,
    sourceExcerpt: `Call ${name}.`, appointmentTime: null }], priorityTaskIds: ['call'], attention: [] });
  let responseCode = 200;
  let payload = { result: plan('Maya') };
  const errors = [];
  cdp.on('Fetch.requestPaused', ({ requestId }) => {
    cdp.send('Fetch.fulfillRequest', { requestId, responseCode,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
      body: Buffer.from(JSON.stringify(payload)).toString('base64') }).catch(() => errors.push('Interception failed'));
  });
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*/api/plan', requestStage: 'Request' }] });
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const edit = value => evaluate(`document.querySelector('#notes').value=${JSON.stringify(value)}; document.querySelector('#notes').dispatchEvent(new Event('input',{bubbles:true}))`);
  const done = () => waitFor(`!document.querySelector('#make-plan').disabled`);
  const generate = async value => {
    await edit(value);
    await click('#make-plan');
    if (await evaluate(`document.querySelector('#regenerate-dialog').open`)) await click('#confirm-regenerate');
    await done();
  };
  const stored = () => evaluate(`JSON.parse(localStorage.getItem('${key}'))`);
  const checked = () => evaluate(`document.querySelector('.plan-list input')?.checked`);
  const ready = () => waitFor(`document.readyState === 'complete' && document.querySelector('#start-over')`);
  const reload = async () => {
    await cdp.send('Page.reload');
    await ready();
    // Wait for the module script's restoration, not a transient pre-module DOM.
    await evaluate(`import('/app.js')`);
  };
  const clear = async () => { await click('#start-over'); await click('#confirm-clear'); };

  await clear();
  await evaluate(`localStorage.setItem('unrelated-app','keep')`);
  await generate('Call Maya.');
  await click('.plan-list input');
  await edit('Call Maya. Also call Jordan.');
  const before = await stored();
  await reload();
  assert.equal(await evaluate(`document.querySelector('#notes').value`), before.notes);
  assert.equal(await checked(), true);
  assert.equal(await evaluate(`document.querySelector('.goal-card p').textContent`), 'Call Maya');
  const url = await evaluate('location.href');
  await cdp.send('Page.navigate', { url: 'about:blank' });
  await waitFor(`location.href === 'about:blank'`);
  await cdp.send('Page.navigate', { url });
  await ready();
  await evaluate(`import('/app.js')`);
  assert.equal(await checked(), true, 'Returning to the same origin restores work');

  await click('#start-over');
  assert.equal(await evaluate('document.activeElement.id'), 'cancel-clear');
  await screenshot('slice3-clear-mobile');
  await click('#cancel-clear');
  assert.deepEqual(await stored(), before, 'Cancel leaves saved work untouched');
  assert.equal(await checked(), true);
  await click('#start-over');
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await waitFor(`!document.querySelector('#clear-dialog').open`);
  assert.deepEqual(await stored(), before);

  responseCode = 502;
  payload = { error: 'GENERATION_FAILED' };
  await generate('Call Jordan.');
  assert.equal(await checked(), true);
  assert.equal(await evaluate(`document.querySelector('#error-box').hidden`), false);
  await reload();
  assert.equal(await checked(), true);
  assert.equal(await evaluate(`document.querySelector('#notes').value`), 'Call Jordan.');
  assert.equal(await evaluate(`document.querySelector('#error-box').hidden`), true, 'Error is not restored');
  assert.equal(await evaluate(`document.querySelector('#request-status').textContent`), '');
  await click('#make-plan');
  assert.equal(await evaluate(`document.querySelector('#regenerate-dialog').open`), true);
  await reload();
  assert.equal(await evaluate(`document.querySelector('#regenerate-dialog').open`), false, 'Dialog is not restored');
  assert.equal(await checked(), true);

  responseCode = 200;
  payload = { result: { kind: 'no_actions', goal: '', tasks: [], priorityTaskIds: [], attention: [] } };
  await generate('The logo is green.');
  await reload();
  assert.equal(await evaluate(`Boolean(document.querySelector('.no-actions'))`), true);
  assert.equal(await evaluate(`Boolean(document.querySelector('.plan-list'))`), false);
  assert.deepEqual((await stored()).completedTaskIds, []);

  // Make one request deliberately ignore abort, then deliver it after clearing and a newer result.
  payload = { result: plan('Jordan') };
  await generate('Call Jordan.');
  await click('.plan-list input');
  await evaluate('window.fetch=()=>new Promise(()=>{})');
  await edit('Call Jordan again.');
  await click('#make-plan');
  await click('#confirm-regenerate');
  assert.equal(await evaluate(`document.querySelector('#make-plan').disabled`), true);
  await reload();
  assert.equal(await evaluate(`document.querySelector('#make-plan').disabled`), false, 'Loading is not restored');
  assert.equal(await evaluate(`document.querySelector('#request-status').textContent`), '');
  assert.equal(await checked(), true, 'Refresh during generation restores prior progress');
  assert.equal(await evaluate(`document.querySelector('#notes').value`), 'Call Jordan again.');
  await evaluate(`window.originalFetch=window.fetch; window.fetch=()=>new Promise(resolve=>{
    window.finishLate=()=>resolve(new Response(${JSON.stringify(JSON.stringify({ result: plan('Old') }))},{status:200,headers:{'Content-Type':'application/json'}}));
  })`);
  await edit('Call Old.');
  await click('#make-plan');
  await click('#confirm-regenerate');
  assert.equal(await evaluate(`document.querySelector('#make-plan').disabled`), true);
  await click('#start-over');
  await click('#cancel-clear');
  assert.equal(await evaluate(`document.querySelector('#make-plan').disabled`), true, 'Cancel clear leaves pending request intact');
  assert.equal(await checked(), true);
  await clear();
  assert.equal(await evaluate(`document.querySelector('#notes').value`), '');
  assert.equal(await stored(), null);
  assert.equal(await evaluate(`document.querySelector('#make-plan').disabled`), false);
  await evaluate('window.fetch=window.originalFetch');
  payload = { result: plan('Newest') };
  await generate('Call Newest.');
  await evaluate('window.finishLate()');
  assert.equal(await evaluate(`document.querySelector('.goal-card p').textContent`), 'Call Newest');
  assert.equal((await stored()).result.goal, 'Call Newest', 'Late response cannot restore cleared saved work');
  await reload();
  assert.equal(await evaluate(`document.querySelector('.goal-card p').textContent`), 'Call Newest');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 1000, deviceScaleFactor: 1, mobile: false });
  await click('#start-over');
  await screenshot('slice3-clear-desktop');
  await click('#confirm-clear');
  await reload();
  assert.equal(await stored(), null);
  assert.equal(await evaluate(`document.querySelector('#notes').value`), '');
  assert.equal(await evaluate(`Boolean(document.querySelector('.empty-state'))`), true);
  assert.equal(await evaluate(`localStorage.getItem('unrelated-app')`), 'keep');

  await evaluate(`localStorage.setItem('${key}','{broken')`);
  await reload();
  assert.equal(await evaluate(`Boolean(document.querySelector('.empty-state'))`), true);
  assert.equal(await evaluate(`document.querySelector('#storage-notice').hidden`), false);
  payload = { result: plan('Recovered') };
  await generate('Call Recovered.');
  assert.equal((await stored()).result.goal, 'Call Recovered');

  await evaluate(`window.originalSet=Storage.prototype.setItem; Storage.prototype.setItem=()=>{throw new Error('Quota')}`);
  await edit('Unsaved edited notes');
  assert.equal(await evaluate(`document.querySelector('#storage-notice').hidden`), false);
  await click('.plan-list input');
  assert.equal(await checked(), true, 'Storage failure does not disable completion');
  await screenshot('slice3-storage-unavailable');
  await evaluate(`Storage.prototype.setItem=window.originalSet; window.originalRemove=Storage.prototype.removeItem; Storage.prototype.removeItem=()=>{throw new Error('Blocked')}`);
  await clear();
  assert.equal(await evaluate(`Boolean(document.querySelector('.empty-state'))`), true);
  assert.ok((await evaluate(`document.querySelector('#storage-notice').textContent`)).includes('may return'));
  await evaluate('Storage.prototype.removeItem=window.originalRemove');
  await clear();

  const script = await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(window,'localStorage',{get(){throw new Error('Unavailable')}})` });
  await reload();
  assert.equal(await evaluate(`document.querySelector('#storage-notice').hidden`), false);
  payload = { result: plan('Usable') };
  await generate('Call Usable.');
  await click('.plan-list input');
  assert.equal(await checked(), true);
  await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier });
  await reload();
  await cdp.send('Fetch.disable');
  assert.deepEqual(errors, []);
  console.log('Slice 3 browser checks passed: save/refresh/return, completion, failure preservation, no-action restore, Cancel/Escape, clear during generation, late-response rejection, app-only removal, corrupt data, storage exceptions, desktop/mobile.');
}
