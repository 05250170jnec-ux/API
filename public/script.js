// script.js — front-end for the Task API
// Talks to: GET/POST /tasks, PATCH/PUT/DELETE /tasks/:id

'use strict';

// ---------- configuration ----------

// Same origin when served by Express. Use 'http://localhost:3000/tasks' only
// if the page is hosted separately (and CORS is enabled on the server).
const API_URL = '/tasks';
const MAX_TITLE_LENGTH = 255;

const FILTERS = {
  all: () => true,
  active: (task) => !isDone(task),
  done: (task) => isDone(task),
};

// ---------- DOM references ----------

const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const list = document.getElementById('task-list');
const message = document.getElementById('message');
const counter = document.getElementById('counter');
const filterButtons = document.querySelectorAll('.filter');

// ---------- state ----------

let tasks = [];
let currentFilter = 'all';

// ---------- helpers ----------

/** MySQL returns completed as 0/1, JSON may give true/false. */
function isDone(task) {
  return task.completed === true || task.completed === 1;
}

/** Shows an error/info message; pass nothing to clear it. */
function showMessage(text = '') {
  message.textContent = text;
}

/**
 * Wrapper around fetch that sends JSON, checks the response status,
 * and throws an Error with a readable message on failure.
 */
async function request(url, options = {}) {
  let res;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (_) {
    throw new Error('Cannot reach the server. Is it running?');
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) detail = body.error;
    } catch (_) {
      // Response had no JSON body; keep the default message.
    }
    throw new Error(detail);
  }

  return res.status === 204 ? null : res.json();
}

/**
 * Runs an API action, reloads the list on success,
 * and shows a consistent error message on failure.
 */
async function runAction(action, errorPrefix) {
  try {
    await action();
    await loadTasks();
  } catch (err) {
    showMessage(`${errorPrefix}: ${err.message}`);
  }
}

// ---------- API calls ----------

async function loadTasks() {
  try {
    const data = await request(API_URL);
    tasks = Array.isArray(data) ? data : data.tasks || [];
    showMessage();
    render();
  } catch (err) {
    showMessage(`Could not load tasks: ${err.message}`);
  }
}

const addTask = (title) =>
  runAction(
    () => request(API_URL, { method: 'POST', body: JSON.stringify({ title }) }),
    'Could not add task'
  );

const toggleTask = (id, completed) =>
  runAction(
    () =>
      request(`${API_URL}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed }),
      }),
    'Could not update task'
  );

const renameTask = (task, title) =>
  runAction(
    () =>
      request(`${API_URL}/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({ title, completed: isDone(task) }),
      }),
    'Could not rename task'
  );

const deleteTask = (id) =>
  runAction(
    () => request(`${API_URL}/${id}`, { method: 'DELETE' }),
    'Could not delete task'
  );

// ---------- rendering ----------

function render() {
  list.replaceChildren();

  const visible = tasks.filter(FILTERS[currentFilter]);

  if (visible.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'No tasks here yet.';
    list.appendChild(empty);
  }

  visible.forEach((task) => list.appendChild(createTaskElement(task)));

  const remaining = tasks.filter((t) => !isDone(t)).length;
  counter.textContent = `${remaining} left`;
}

function createIconButton(label, icon, extraClass, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `icon-btn ${extraClass}`.trim();
  btn.textContent = icon;
  btn.setAttribute('aria-label', label);
  btn.addEventListener('click', onClick);
  return btn;
}

function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = `task${isDone(task) ? ' done' : ''}`;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = isDone(task);
  checkbox.setAttribute('aria-label', `Mark "${task.title}" as done`);
  checkbox.addEventListener('change', () => toggleTask(task.id, checkbox.checked));

  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = task.title; // textContent keeps user input safe from XSS
  title.title = 'Double-click to edit';
  title.addEventListener('dblclick', () => startEdit(li, title, task));

  const editBtn = createIconButton('Edit task', '✏️', '', () =>
    startEdit(li, title, task)
  );
  const delBtn = createIconButton('Delete task', '🗑️', 'delete', () =>
    deleteTask(task.id)
  );

  li.append(checkbox, title, editBtn, delBtn);
  return li;
}

function startEdit(li, titleEl, task) {
  const editor = document.createElement('input');
  editor.type = 'text';
  editor.className = 'edit-input';
  editor.value = task.title;
  editor.maxLength = MAX_TITLE_LENGTH;
  editor.setAttribute('aria-label', 'Edit task title');

  li.replaceChild(editor, titleEl);
  editor.focus();
  editor.select();

  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;

    const value = editor.value.trim();
    if (save && value && value !== task.title) {
      renameTask(task, value);
    } else {
      render();
    }
  };

  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  editor.addEventListener('blur', () => finish(true));
}

// ---------- events ----------

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  input.value = '';
  addTask(title);
});

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    filterButtons.forEach((b) => b.classList.toggle('active', b === btn));
    render();
  });
});

// ---------- start ----------

loadTasks();