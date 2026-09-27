const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
function card(className, title) {
  const section = node('section', `result-card ${className}`);
  section.append(node('h3', '', title));
  return section;
}
function taskContent(task) {
  const content = node('span', 'task-content');
  if (task.appointmentTime) content.append(node('span', 'task-time', task.appointmentTime));
  // Avoid showing an appointment time twice if the model included it in the title.
  const text = task.appointmentTime && task.text.startsWith(task.appointmentTime)
    ? task.text.slice(task.appointmentTime.length).replace(/^\s*[-–—:]?\s*/, '') : task.text;
  content.append(document.createTextNode(text));
  return content;
}

export function renderResult(container, result, onEdit) {
  const fragment = document.createDocumentFragment();
  if (result.kind === 'no_actions') {
    const empty = node('section', 'result-card no-actions');
    empty.append(node('p', '', 'I couldn’t find a clear action in these notes yet.'));
    const edit = node('button', 'text-button', 'Edit Notes');
    edit.type = 'button';
    edit.addEventListener('click', onEdit);
    empty.append(edit);
    fragment.append(empty);
  } else {
    const goal = card('goal-card', 'Your Goal');
    goal.append(node('p', '', result.goal));
    fragment.append(goal);

    const count = result.priorityTaskIds.length;
    const priorities = card('priorities-card', count === 1 ? 'Top Priority' : `Top ${count} Priorities`);
    const list = node('ol', 'priorities');
    for (const id of result.priorityTaskIds) {
      const task = result.tasks.find(item => item.id === id);
      const item = node('li');
      item.append(taskContent(task));
      list.append(item);
    }
    priorities.append(list);
    fragment.append(priorities);

    const plan = card('plan-card', 'Your Plan');
    const tasks = node('ol', 'plan-list');
    for (const task of result.tasks) {
      const item = node('li');
      item.append(taskContent(task));
      tasks.append(item);
    }
    plan.append(tasks);
    fragment.append(plan);
  }

  if (result.kind === 'plan' || result.attention.length) {
    const attention = card('attention-card', 'Needs Attention');
    if (!result.attention.length) attention.append(node('p', '', 'No specific blockers identified in these notes.'));
    else {
      const list = node('ul', 'attention-list');
      for (const item of result.attention) {
        const row = node('li');
        row.append(node('span', 'attention-kind', item.kind), document.createTextNode(item.text));
        list.append(row);
      }
      attention.append(list);
    }
    fragment.append(attention);
  }
  container.replaceChildren(fragment);
}
