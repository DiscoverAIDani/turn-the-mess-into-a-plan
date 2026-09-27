import { isRenderableResult } from './plan-state.js';

export const STORAGE_KEY = 'messy-plan:v1';

export function isSavedWork(value) {
  if (!value || value.version !== 1 || typeof value.notes !== 'string'
    || !Array.isArray(value.completedTaskIds)
    || (value.result !== null && !isRenderableResult(value.result))) return false;
  const ids = new Set(value.result?.tasks.map(task => task.id) ?? []);
  return new Set(value.completedTaskIds).size === value.completedTaskIds.length
    && value.completedTaskIds.every(id => typeof id === 'string' && ids.has(id));
}

// Access localStorage inside try/catch: even obtaining it can throw in restricted browsers.
export function createStorage(getStorage = () => window.localStorage) {
  return {
    load() {
      try {
        const raw = getStorage().getItem(STORAGE_KEY);
        if (raw === null) return { data: null, error: null };
        const value = JSON.parse(raw);
        if (!isSavedWork(value)) return { data: null, error: 'invalid' };
        // Temporary fields from an older/tampered entry never enter the app state.
        return { data: { version: 1, notes: value.notes, result: value.result,
          completedTaskIds: value.completedTaskIds }, error: null };
      } catch (error) {
        return { data: null, error: error instanceof SyntaxError ? 'invalid' : 'unavailable' };
      }
    },
    save({ notes, result, completedTaskIds }) {
      try {
        const value = { version: 1, notes, result, completedTaskIds: [...completedTaskIds] };
        if (!isSavedWork(value)) return false;
        getStorage().setItem(STORAGE_KEY, JSON.stringify(value));
        return true;
      } catch { return false; }
    },
    clear() {
      try { getStorage().removeItem(STORAGE_KEY); return true; }
      catch { return false; }
    },
  };
}
