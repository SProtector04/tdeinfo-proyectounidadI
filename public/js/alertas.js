import { api } from './api.js';
import { renderNav, getCurrentUser } from './common.js';

const user = await getCurrentUser();
await renderNav('/alertas.html');

const alerts = await api('/alerts');
const isAdmin = user.role === 'ADMIN';

document.getElementById('alerts').innerHTML = alerts.length
  ? alerts
      .map(
        (a) => `<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; border-bottom:1px solid #e7dfd3; padding:8px 0">
          <div>
            <span class="badge ${a.severity.toLowerCase()}">${a.severity}</span>
            <span class="badge ${a.status.toLowerCase()}">${a.status}</span>
            <span class="muted" style="font-size:0.8rem">${a.createdAt}</span>
            <div style="margin-top:4px">${a.message}</div>
          </div>
          ${isAdmin && a.status === 'OPEN' ? `<button data-id="${a.id}" class="ghost">Resolver</button>` : ''}
        </div>`,
      )
      .join('')
  : '<p class="muted">No hay alertas.</p>';

document.querySelectorAll('button[data-id]').forEach((btn) =>
  btn.addEventListener('click', async () => {
    await api(`/alerts/${btn.dataset.id}/resolve`, { method: 'POST' });
    window.location.reload();
  }),
);
