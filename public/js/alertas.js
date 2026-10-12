import { api } from './api.js';
import { renderNav, getCurrentUser } from './common.js';
import { toast, formatDate, escapeHtml, placeholder, emptyState, icon, renderPager } from './ui.js';

const SEVERITY_ICON = { CRITICAL: 'critical', WARNING: 'warning' };
const PAGE_SIZE = 15;

const user = await getCurrentUser();
await renderNav('/alertas.html');

const summaryEl = document.getElementById('alert-summary');
const alertsEl = document.getElementById('alerts');
const pagerEl = document.getElementById('alerts-pager');
const filtersEl = document.getElementById('alert-filters');
placeholder(summaryEl, 'Cargando resumen');
placeholder(alertsEl, 'Cargando alertas');

const isAdmin = user.role === 'ADMIN';
let statusFilter = '';
let offset = 0;

function renderSummary(summary) {
  summaryEl.innerHTML = `
    <div class="card stat stat--critical">
      <div class="value">${summary.CRITICAL}</div>
      <div class="label">Críticas abiertas</div>
    </div>
    <div class="card stat stat--warning">
      <div class="value">${summary.WARNING}</div>
      <div class="label">Avisos abiertos</div>
    </div>
    <div class="card stat stat--total">
      <div class="value">${summary.total}</div>
      <div class="label">Total abiertas</div>
    </div>
  `;
}

/**
 * Separa el mensaje de dominio (`"Insumo": detalle`) en titulo y detalle para
 * que la alerta sea escaneable. Si el formato cambia, cae al mensaje completo.
 */
function parseMessage(message) {
  const match = /^"([^"]+)":\s*(.*)$/.exec(message);
  return match ? { title: match[1], detail: match[2] } : { title: null, detail: message };
}

function alertRow(a) {
  const { title, detail } = parseMessage(a.message);
  const isResolved = a.status === 'RESOLVED';
  const mod = isResolved ? 'resolved' : a.severity === 'CRITICAL' ? 'critical' : 'warning';
  const iconName = isResolved ? 'checkCircle' : SEVERITY_ICON[a.severity] ?? 'warning';
  const badge = isResolved
    ? '<span class="badge resolved">Resuelta</span>'
    : `<span class="badge ${a.severity.toLowerCase()}">${a.severity}</span>`;
  const resolvedMeta = isResolved && a.resolvedAt ? ` · resuelta ${escapeHtml(formatDate(a.resolvedAt))}` : '';
  return `
    <div class="alert-row alert-row--${mod}">
      <span class="alert-row__icon">${icon(iconName)}</span>
      <div class="alert-row__body">
        <div class="alert-row__top">
          ${title ? `<span class="alert-row__title">${escapeHtml(title)}</span>` : ''}
          ${badge}
        </div>
        <p class="alert-row__detail">${escapeHtml(detail)}</p>
        <span class="alert-row__meta">${escapeHtml(formatDate(a.createdAt))}${resolvedMeta}</span>
      </div>
      ${isAdmin && !isResolved ? `<button data-id="${a.id}" class="ghost alert-row__action">${icon('check')}<span>Resolver</span></button>` : ''}
    </div>`;
}

function renderAlertsList(alerts) {
  alertsEl.innerHTML = alerts.length
    ? alerts.map(alertRow).join('')
    : emptyState('No hay alertas con este filtro.', 'filter');

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
  const params = new URLSearchParams({ limit: String(PAGE_SIZE + 1), offset: String(offset) });
  if (statusFilter) params.set('status', statusFilter);

  const [summary, raw] = await Promise.all([api('/alerts/summary'), api(`/alerts?${params.toString()}`)]);

  // Si la pagina quedo vacia tras resolver (offset mayor al total), retrocede.
  if (raw.length === 0 && offset > 0) {
    offset = Math.max(0, offset - PAGE_SIZE);
    return load();
  }

  renderSummary(summary);
  renderAlertsList(raw.slice(0, PAGE_SIZE));
  renderPager(pagerEl, {
    offset,
    limit: PAGE_SIZE,
    fetched: raw.length,
    onChange: async (next) => {
      offset = next;
      await load();
    },
  });
}

filtersEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-status]');
  if (!btn) return;
  statusFilter = btn.dataset.status;
  offset = 0;
  filtersEl.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
  await load();
});

// Icono izquierdo de cada filtro.
const FILTER_ICON = { '': 'filter', OPEN: 'alert', RESOLVED: 'checkCircle' };
for (const b of filtersEl.querySelectorAll('button[data-status]')) {
  b.insertAdjacentHTML('afterbegin', icon(FILTER_ICON[b.dataset.status] ?? 'filter'));
}

await load();
