import { api } from './api.js';
import { renderNav, getCurrentUser, setError } from './common.js';
import { toast, withSubmitting, escapeHtml, placeholder, initViewSwitcher } from './ui.js';
import { renderTable } from './components/table.js';

const user = await getCurrentUser();
if (user.role !== 'ADMIN') {
  window.location.href = '/index.html';
  throw new Error('sin-permisos');
}
await renderNav('/usuarios.html');

// --- Vista: Lista ---
const usersEl = document.getElementById('users');

async function renderUsers() {
  placeholder(usersEl, 'Cargando usuarios');
  const users = await api('/users');
  usersEl.innerHTML = renderTable({
    columns: [
      { label: 'Nombre', render: (u) => escapeHtml(u.name) },
      { label: 'Usuario', render: (u) => escapeHtml(u.username) },
      {
        label: 'Rol',
        render: (u) => `<span class="badge ${u.role.toLowerCase()}">${u.role}</span>`,
      },
      { label: 'Activo', render: (u) => (u.active ? 'Sí' : 'No') },
    ],
    rows: users,
    empty: 'Sin usuarios.',
  });
}

// --- Vista: Nuevo usuario ---
const form = document.getElementById('user-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setError(document.getElementById('error'), '');
  const username = document.getElementById('u-username').value.trim();
  try {
    await withSubmitting(form, async () => {
      await api('/users', {
        method: 'POST',
        body: {
          name: document.getElementById('u-name').value.trim(),
          username,
          password: document.getElementById('u-password').value,
          role: document.getElementById('u-role').value,
        },
      });
      form.reset();
      toast(`Usuario "${username}" creado.`);
      await renderUsers();
      switcher.go('lista');
    });
  } catch (err) {
    setError(document.getElementById('error'), err.message);
  }
});

document.querySelectorAll('button[data-goto]').forEach((b) =>
  b.addEventListener('click', () => switcher.go(b.dataset.goto)),
);

// --- Selector de vistas ---
const switcher = initViewSwitcher({
  defaultView: 'lista',
  onEnter: {
    lista: renderUsers,
    nuevo: () => {},
  },
});
