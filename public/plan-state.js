// Browser lifecycle only. The server remains responsible for schema and grounding validation.
const nonblank = value => typeof value === 'string' && value.trim().length > 0;
export function isRenderableResult(value) {
  if (!value || !['plan', 'no_actions'].includes(value.kind) || typeof value.goal !== 'string'
    || !Array.isArray(value.tasks) || !Array.isArray(value.priorityTaskIds) || !Array.isArray(value.attention)) return false;
  if (!value.attention.every(item => item && ['blocker', 'uncertainty', 'context', 'assumption'].includes(item.kind) && nonblank(item.text))) return false;
  if (value.kind === 'no_actions') return value.goal === '' && value.tasks.length === 0 && value.priorityTaskIds.length === 0;
  if (!nonblank(value.goal) || !value.tasks.length || !value.tasks.every(task => task && nonblank(task.id)
    && nonblank(task.text) && nonblank(task.sourceExcerpt) && (task.appointmentTime === null || nonblank(task.appointmentTime)))) return false;
  const ids = new Set(value.tasks.map(task => task.id));
  return ids.size === value.tasks.length && value.priorityTaskIds.length === Math.min(3, ids.size)
    && new Set(value.priorityTaskIds).size === value.priorityTaskIds.length
    && value.priorityTaskIds.every(id => ids.has(id));
}

export class PlanState {
  result = null;
  completedTaskIds = new Set();
  loading = false;
  requestId = 0;

  toggle(id, checked) {
    if (this.loading || !this.result?.tasks.some(task => task.id === id)) return false;
    if (checked) this.completedTaskIds.add(id);
    else this.completedTaskIds.delete(id);
    return true;
  }

  begin() {
    if (this.loading) return null;
    this.loading = true;
    return ++this.requestId;
  }

  isCurrent(id) { return this.loading && id === this.requestId; }

  accept(id, result) {
    if (!this.isCurrent(id)) return false;
    if (!isRenderableResult(result)) throw new Error('Invalid response');
    this.result = result;
    this.completedTaskIds.clear();
    this.loading = false;
    return true;
  }

  fail(id) {
    if (!this.isCurrent(id)) return false;
    this.loading = false;
    return true;
  }
}
