import Ajv from 'ajv';
import { planSchema } from './plan-schema.js';
import { hasGroundedTemporalLanguage } from './temporal-grounding.js';
import { hasExplicitSourceCoverage } from './source-coverage.js';

const validateShape = new Ajv({ allErrors: false }).compile(planSchema);
const nonblank = (value) => typeof value === 'string' && value.trim().length > 0;

export class InvalidPlanError extends Error {
  constructor() { super('Invalid plan response'); this.name = 'InvalidPlanError'; }
}

// Shape is necessary but not sufficient: references and source evidence must agree.
export function validatePlan(result, notes) {
  const require = (condition) => { if (!condition) throw new InvalidPlanError(); };
  require(validateShape(result));
  require(result.attention.every(item => nonblank(item.text)));
  require(hasGroundedTemporalLanguage(result, notes));
  require(hasExplicitSourceCoverage(result, notes));

  if (result.kind === 'no_actions') {
    require(result.goal === '' && result.tasks.length === 0 && result.priorityTaskIds.length === 0);
    return result;
  }

  require(nonblank(result.goal) && result.tasks.length > 0);
  const ids = new Set(result.tasks.map(task => task.id));
  require(ids.size === result.tasks.length);
  require(result.priorityTaskIds.length === Math.min(3, result.tasks.length));
  require(new Set(result.priorityTaskIds).size === result.priorityTaskIds.length);
  require(result.priorityTaskIds.every(id => ids.has(id)));
  const lastAppointment = result.tasks.findLastIndex(task => task.appointmentTime !== null);
  const untimedBeforeAppointment = result.tasks.some((task, index) => task.appointmentTime === null && index < lastAppointment);
  if (untimedBeforeAppointment) {
    require(result.attention.some(item => item.kind === 'uncertainty'));
  }
  for (const task of result.tasks) {
    require(nonblank(task.id) && nonblank(task.text) && nonblank(task.sourceExcerpt));
    require(notes.includes(task.sourceExcerpt));
    if (task.appointmentTime !== null) {
      require(nonblank(task.appointmentTime) && task.sourceExcerpt.includes(task.appointmentTime));
    }
  }
  return result;
}

export function parseCompletion(completion, notes) {
  const choice = completion?.choices?.[0];
  if (choice?.finish_reason !== 'stop' || choice?.message?.refusal || typeof choice?.message?.content !== 'string') {
    throw new InvalidPlanError();
  }
  let result;
  try { result = JSON.parse(choice.message.content); }
  catch { throw new InvalidPlanError(); }
  return validatePlan(result, notes);
}
