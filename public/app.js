import { renderResult } from './render.js';

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
let result = null;
let loading = false;

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
  loading = value;
  notes.disabled = value;
  button.disabled = value;
  retry.disabled = value;
  edit.disabled = value;
  results.setAttribute('aria-busy', String(value));
  buttonLabel.textContent = value ? 'Making your plan…' : 'Make My Plan';
}
notes.addEventListener('input', () => {
  count.textContent = `${notes.value.length.toLocaleString('en-US')} / 6,000`;
  count.classList.toggle('over-limit', notes.value.length > 6000);
  clearError();
  status.textContent = '';
});

async function makePlan() {
  if (loading) return;
  clearError();
  const submittedNotes = notes.value;
  if (!submittedNotes.trim() || submittedNotes.length > 6000) {
    notes.setAttribute('aria-invalid', 'true');
    showError(submittedNotes.length > 6000 ? 'Please shorten your notes to 6,000 characters or fewer.' : 'Add a few notes so we can find a place to start.', false);
    focusNotes();
    return;
  }
  setLoading(true);
  status.textContent = 'Finding a clear place to start…';
  try {
    const response = await fetch('/api/plan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: submittedNotes }), signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error('Request failed');
    const payload = await response.json();
    if (!payload.result || !['plan', 'no_actions'].includes(payload.result.kind)) throw new Error('Invalid response');
    // Only validated, successful responses replace the active result.
    renderResult(content, payload.result, focusNotes);
    result = payload.result;
    status.textContent = result.kind === 'plan' ? 'Your plan is ready.' : 'Your notes are ready to edit.';
    results.focus({ preventScroll: true });
    results.scrollIntoView({ behavior: 'auto', block: 'start' });
  } catch {
    status.textContent = '';
    showError(result?.kind === 'plan'
      ? 'We couldn’t create a new plan. Your current plan is still here.'
      : 'We couldn’t create your plan. Please try again.', true);
  } finally { setLoading(false); }
}

form.addEventListener('submit', event => { event.preventDefault(); makePlan(); });
retry.addEventListener('click', makePlan);
edit.addEventListener('click', focusNotes);
