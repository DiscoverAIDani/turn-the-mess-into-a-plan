import { renderResult } from './render.js';
import { PlanState } from './plan-state.js';

const form = document.querySelector('#plan-form');
const notes = document.querySelector('#notes');
const count = document.querySelector('#notes-count');
const button = document.querySelector('#make-plan');
const buttonLabel = document.querySelector('#button-label');
const status = document.querySelector('#request-status');
const errorBox = document.querySelector('#error-box');
const errorMessage = document.querySelector('#error-message');
const retry = document.querySelector('#try-again');
const edit = document.querySelector('#edit-notes');
const results = document.querySelector('#results');
const content = document.querySelector('#result-content');
const dialog = document.querySelector('#regenerate-dialog');
const cancelRegenerate = document.querySelector('#cancel-regenerate');
const confirmRegenerate = document.querySelector('#confirm-regenerate');
const work = new PlanState();
let pendingNotes = null;

function focusNotes() { notes.focus(); }
function clearError() {
  errorBox.hidden = true;
  errorMessage.textContent = '';
  notes.removeAttribute('aria-invalid');
}
function showError(message, canRetry) {
  errorMessage.textContent = message;
  retry.hidden = !canRetry;
  errorBox.hidden = false;
}
function setLoading(value) {
  notes.disabled = value;
  button.disabled = value;
  retry.disabled = value;
  edit.disabled = value;
  content.querySelectorAll('input, button').forEach(control => { control.disabled = value; });
  results.setAttribute('aria-busy', String(value));
  buttonLabel.textContent = value ? 'Making your plan…' : 'Make My Plan';
}
notes.addEventListener('input', () => {
  count.textContent = `${notes.value.length.toLocaleString('en-US')} / 6,000`;
  count.classList.toggle('over-limit', notes.value.length > 6000);
  clearError();
  status.textContent = '';
});

function makePlan() {
  if (work.loading || dialog.open) return;
  clearError();
  const submittedNotes = notes.value;
  if (!submittedNotes.trim() || submittedNotes.length > 6000) {
    notes.setAttribute('aria-invalid', 'true');
    showError(submittedNotes.length > 6000 ? 'Please shorten your notes to 6,000 characters or fewer.' : 'Add a few notes so we can find a place to start.', false);
    focusNotes();
    return;
  }
  if (work.completedTaskIds.size) {
    pendingNotes = submittedNotes;
    dialog.showModal();
    cancelRegenerate.focus();
    return;
  }
  generate(submittedNotes);
}

async function generate(submittedNotes) {
  const requestId = work.begin();
  if (requestId === null) return;
  setLoading(true);
  status.textContent = 'Finding a clear place to start…';
  try {
    const response = await fetch('/api/plan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: submittedNotes }), signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error('Request failed');
    const payload = await response.json();
    // Only validated, successful responses replace the active result.
    if (!work.accept(requestId, payload.result)) return;
    renderResult(content, work.result, focusNotes, {
      completedTaskIds: work.completedTaskIds,
      onToggle: (id, checked) => work.toggle(id, checked),
    });
    status.textContent = work.result.kind === 'plan' ? 'Your plan is ready.' : 'Your notes are ready to edit.';
    results.focus({ preventScroll: true });
    results.scrollIntoView({ behavior: 'auto', block: 'start' });
  } catch {
    if (!work.fail(requestId)) return;
    status.textContent = '';
    showError(work.result?.kind === 'plan'
      ? 'We couldn’t create a new plan. Your current plan is still here.'
      : 'We couldn’t create your plan. Please try again.', true);
  } finally {
    // A late response must not unlock or overwrite a newer request's UI.
    if (requestId === work.requestId) setLoading(work.loading);
  }
}

cancelRegenerate.addEventListener('click', () => { pendingNotes = null; dialog.close(); });
dialog.addEventListener('cancel', () => { pendingNotes = null; });
confirmRegenerate.addEventListener('click', () => {
  const submittedNotes = pendingNotes;
  pendingNotes = null;
  dialog.close();
  if (submittedNotes !== null) generate(submittedNotes);
});

form.addEventListener('submit', event => { event.preventDefault(); makePlan(); });
retry.addEventListener('click', makePlan);
edit.addEventListener('click', focusNotes);
