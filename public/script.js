// script.js — front-end for the Task API
// Talks to: GET/POST /tasks, PATCH/PUT/DELETE /tasks/:id
 
const API_URL = '/tasks'; // same origin; change to 'http://localhost:3000/tasks' if opened separately
 
const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const list = document.getElementById('task-list');
const message = document.getElementById('message');
const counter = document.getElementById('counter');
const filterButtons = document.querySelectorAll('.filter');
 
let tasks = [];
let currentFilter = 'all';
 
// ---------- helpers ----------
 
function showMessage(text) {
  message.textContent = text || '';
}
 
async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
 
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) detail = body.error;
    } catch (_) {}
    throw new Error(detail);
  }
 
  return res.status === 204 ? null : res.json();
}
 
// MySQL returns completed as 0/1, JSON may give true/false
const isDone = (task) => task.completed === true || task.completed === 1;
 
// ---------- API calls ----------
 
async function loadTasks() {
  try {
    const data = await request(API_URL);
    tasks = Array.isArray(data) ? data : data.tasks || [];
    showMessage('');
    render();
  } catch (err) {
    showMessage('Could not load tasks: ' + err.message);
  }
}
 
async function addTask(title) {
  try {
    await request(API_URL, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    await loadTasks();
  } catch (err) {
    showMessage('Could not add task: ' + err.message);
  }
}
 
async function toggleTask(id, completed) {
  try {
    await request(`${API_URL}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    });
    await loadTasks();
  } catch (err) {
    showMessage('Could not update task: ' + err.message);
  }
}
 
async function renameTask(task, title) {
  try {
    await request(`${API_URL}/${task.id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, completed: isDone(task) }),
    });
    await loadTasks();
  } catch (err) {
    showMessage('Could not rename task: ' + err.message);
  }
}
 
async function deleteTask(id) {
  try {
    await request(`${API_URL}/${id}`, { method: 'DELETE' });
    await loadTasks();
  } catch (err) {
    showMessage('Could not delete task: ' + err.message);
  }
}
 
// ---------- rendering ----------
 
function render() {
  list.innerHTML = '';
 
  const visible = tasks.filter((t) => {
    if (currentFilter === 'active') return !isDone(t);
    if (currentFilter === 'done') return isDone(t);
    return true;
  });
 
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
 
function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = 'task' + (isDone(task) ? ' done' : '');
 
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = isDone(task);
  checkbox.addEventListener('change', () => toggleTask(task.id, checkbox.checked));
 
  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = task.title; // textContent keeps user input safe from XSS
  title.title = 'Double-click to edit';
  title.addEventListener('dblclick', () => startEdit(li, title, task));
 
  const editBtn = document.createElement('button');
  editBtn.className = 'icon-btn';
  editBtn.textContent = '✏️';
  editBtn.setAttribute('aria-label', 'Edit task');
  editBtn.addEventListener('click', () => startEdit(li, title, task));
 
  const delBtn = document.createElement('button');
  delBtn.className = 'icon-btn delete';
  delBtn.textContent = '🗑️';
  delBtn.setAttribute('aria-label', 'Delete task');
  delBtn.addEventListener('click', () => deleteTask(task.id));
 
  li.append(checkbox, title, editBtn, delBtn);
  return li;
}
 
function startEdit(li, titleEl, task) {
  const editor = document.createElement('input');
  editor.type = 'text';
  editor.className = 'edit-input';
  editor.value = task.title;
  editor.maxLength = 255;
 
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
