import { api } from './api.js';
import { renderNav, getCurrentUser, setError } from './common.js';
import { toast, withSubmitting, escapeHtml, placeholder } from './ui.js';
import { renderTable } from './components/table.js';

const user = await getCurrentUser();
if (user.role !== 'ADMIN') {
  window.location.href = '/index.html';
  throw new Error('sin-permisos');
}
await renderNav('/usuarios.html');

const usersEl = document.getElementById('users');
placeholder(usersEl, 'Cargando usuarios');

async function renderUsers() {
  const users = await api('/users');
  usersEl.innerHTML = renderTable({
    columns: [
      { label: 'Nombre', render: (u) => escapeHtml(u.name) },
      { label: 'Usuario', render: (u) => escapeHtml(u.username) },
      {
        label: 'Rol',
        render: (u) => `<span class="badge ${u.role.toLowerCase()}">${u.role}</span>`,
      },
      { label: 'Activo', render: (u) => (u.active ? 'Si' : 'No') },
    ],
    rows: users,
    empty: 'Sin usuarios.',
  });
}

await renderUsers();

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
    });
  } catch (err) {
    setError(document.getElementById('error'), err.message);
  }
});
