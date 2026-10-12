import { api } from './api.js';
import { renderNav, getCurrentUser } from './common.js';
import { toast, formatDate, escapeHtml, placeholder } from './ui.js';

const user = await getCurrentUser();
await renderNav('/alertas.html');

const summaryEl = document.getElementById('alert-summary');
const alertsEl = document.getElementById('alerts');
const filtersEl = document.getElementById('alert-filters');
placeholder(summaryEl, 'Cargando resumen');
placeholder(alertsEl, 'Cargando alertas');

const isAdmin = user.role === 'ADMIN';
let statusFilter = '';

function renderSummary(alerts) {
  const counts = { CRITICAL: 0, WARNING: 0 };
  for (const a of alerts) if (a.severity in counts) counts[a.severity] += 1;
  summaryEl.innerHTML = `
    <div class="card stat">
      <div class="value">${counts.CRITICAL}</div>
      <div class="label">Críticas</div>
    </div>
    <div class="card stat">
      <div class="value">${counts.WARNING}</div>
      <div class="label">Avisos</div>
    </div>
    <div class="card stat">
      <div class="value">${alerts.length}</div>
      <div class="label">Total listadas</div>
    </div>
  `;
}

function renderAlertsList(alerts) {
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
    : '<p class="muted">No hay alertas con este filtro.</p>';

  alertsEl.querySelectorAll('button[data-id]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await api(`/alerts/${btn.dataset.id}/resolve`, { method: 'POST' });
        toast('Alerta resuelta.');
        await load();
      } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false;
      }
    }),
  );
}

async function load() {
  placeholder(alertsEl, 'Cargando alertas');
  const query = statusFilter ? `?status=${statusFilter}` : '';
  const alerts = await api('/alerts' + query);
  // El resumen siempre refleja las abiertas (lo que importa decidir).
  const openAlerts = statusFilter === 'RESOLVED' ? await api('/alerts?status=OPEN') : alerts;
  renderSummary(openAlerts);
  renderAlertsList(alerts);
}

filtersEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-status]');
  if (!btn) return;
  statusFilter = btn.dataset.status;
  filtersEl.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
  await load();
});

await load();
