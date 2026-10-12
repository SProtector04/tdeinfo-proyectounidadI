import { api } from './api.js';
import { setError } from './common.js';
import { withSubmitting, icon } from './ui.js';

const form = document.getElementById('login-form');

// Icono del boton de ingreso (el HTML no lleva SVG).
form.querySelector('button[type="submit"]').insertAdjacentHTML('afterbegin', icon('logout'));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('error');
  setError(errorEl, '');

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    await withSubmitting(form, async () => {
      const result = await api('/auth/login', { method: 'POST', body: { username, password } });
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      window.location.href = '/index.html';
    });
  } catch (err) {
    setError(errorEl, err.message);
  }
});
