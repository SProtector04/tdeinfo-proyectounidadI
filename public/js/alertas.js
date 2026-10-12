import { api } from './api.js';
import { renderNav, getCurrentUser } from './common.js';
import { toast, formatDate, escapeHtml, placeholder } from './ui.js';

const user = await getCurrentUser();
await renderNav('/alertas.html');

const alertsEl = document.getElementById('alerts');
const filtersEl = document.getElementById('alert-filters');
placeholder(alertsEl, 'Cargando alertas');

const isAdmin = user.role === 'ADMIN';
let statusFilter = '';

async function renderAlerts() {
  const query = statusFilter ? `?status=${statusFilter}` : '';
  const alerts = await api('/alerts' + query);
  alertsEl.innerHTML = alerts.length
    ? alerts
        .map(
          (a) => `<div class="alert-row">
            <div>
              <span class="badge ${a.severity.toLowerCase()}">${a.severity}</span>
              <span class="badge ${a.status.toLowerCase()}">${a.status}</span>
              <span class="muted alert-date">${escapeHtml(formatDate(a.createdAt))}</span>
              <div class="alert-message">${escapeHtml(a.message)}</div>
            </div>
            ${isAdmin && a.status === 'OPEN' ? `<button data-id="${a.id}" class="ghost">Resolver</button>` : ''}
          </div>`,
        )
        .join('')
    : '<p class="muted">No hay alertas.</p>';

  alertsEl.querySelectorAll('button[data-id]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await api(`/alerts/${btn.dataset.id}/resolve`, { method: 'POST' });
        toast('Alerta resuelta.');
        await renderAlerts();
      } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false;
      }
    }),
  );
}

filtersEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-status]');
  if (!btn) return;
  statusFilter = btn.dataset.status;
  filtersEl.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
  await renderAlerts();
});

await renderAlerts();
