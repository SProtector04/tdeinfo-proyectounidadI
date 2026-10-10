import { api } from './api.js';
import { renderNav, getCurrentUser, setError } from './common.js';

const user = await getCurrentUser();
if (user.role !== 'ADMIN') {
  window.location.href = '/index.html';
  throw new Error('sin-permisos');
}
await renderNav('/usuarios.html');

const users = await api('/users');
document.getElementById('users').innerHTML = `
  <table>
    <tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Activo</th></tr>
    ${users
      .map(
        (u) => `<tr>
          <td>${u.name}</td>
          <td>${u.username}</td>
          <td><span class="badge ${u.role.toLowerCase()}">${u.role}</span></td>
          <td>${u.active ? 'Si' : 'No'}</td>
        </tr>`,
      )
      .join('')}
  </table>`;

document.getElementById('user-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  setError(document.getElementById('error'), '');
  try {
    await api('/users', {
      method: 'POST',
      body: {
        name: document.getElementById('u-name').value.trim(),
        username: document.getElementById('u-username').value.trim(),
        password: document.getElementById('u-password').value,
        role: document.getElementById('u-role').value,
      },
    });
    window.location.reload();
  } catch (err) {
    setError(document.getElementById('error'), err.message);
  }
});
