import { api } from './api.js';
import { icon } from './ui.js';

export function requireAuth() {
  if (!localStorage.getItem('token')) {
    window.location.href = '/login.html';
    throw new Error('redirect');
  }
}

export async function getCurrentUser() {
  try {
    return await api('/auth/me');
  } catch {
    return null;
  }
}

const NAV = [
  { href: '/index.html', label: 'Tablero', icon: 'dashboard', roles: ['ADMIN', 'CAJERO'] },
  { href: '/ventas.html', label: 'Ventas', icon: 'cart', roles: ['ADMIN', 'CAJERO'] },
  { href: '/productos.html', label: 'Productos', icon: 'menu', roles: ['ADMIN', 'CAJERO'] },
  { href: '/inventario.html', label: 'Inventario', icon: 'box', roles: ['ADMIN'] },
  { href: '/alertas.html', label: 'Alertas', icon: 'alert', roles: ['ADMIN', 'CAJERO'] },
  { href: '/usuarios.html', label: 'Usuarios', icon: 'users', roles: ['ADMIN'] },
];

export async function renderNav(activePath) {
  requireAuth();
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  const visible = NAV.filter((n) => n.roles.includes(user.role));
  const nav = document.getElementById('nav');
  nav.innerHTML = `
    <header class="top">
      <div class="brand">Centro del Quesillo</div>
      <nav>
        ${visible
          .map(
            (n) =>
              `<a class="${n.href === activePath ? 'active' : ''}" href="${n.href}">${icon(n.icon)}<span>${n.label}</span></a>`,
          )
          .join('')}
      </nav>
      <div class="user">
        <span>${user.name} <span class="muted">(${user.role})</span></span>
        <button id="logout" class="ghost">${icon('logout')}<span>Salir</span></button>
      </div>
    </header>
  `;

  document.getElementById('logout').addEventListener('click', async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* ignorar errores de red al cerrar sesion */
    }
    localStorage.removeItem('token');
    window.location.href = '/login.html';
  });
}

export function setError(el, message) {
  el.textContent = message ?? '';
}
