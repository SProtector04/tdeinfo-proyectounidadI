import { api, formatMoney } from './api.js';
import { renderNav } from './common.js';
import { escapeHtml, formatDate, placeholder } from './ui.js';
import { renderTable } from './components/table.js';

await renderNav('/index.html');

const statsEl = document.getElementById('stats');
const barsEl = document.getElementById('revenue-bars');
const topEl = document.getElementById('top-products');
const recEl = document.getElementById('recommendations');
const inventoryEl = document.getElementById('inventory');
const alertsEl = document.getElementById('alerts');
const revenueTitle = document.getElementById('revenue-title');
const periodBar = document.getElementById('period-bar');

const PERIOD_LABEL = { 1: 'hoy', 7: 'últimos 7 días', 30: 'últimos 30 días' };
let currentDays = 7;

periodBar.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-days]');
  if (!btn) return;
  load(Number(btn.dataset.days));
});

function highlightPeriod(days) {
  periodBar.querySelectorAll('button[data-days]').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.days) === days);
  });
}

/** Variacion vs periodo anterior. Cero => «sin base», nunca % ficticio. */
function changeBadge(pct) {
  if (pct === null || pct === undefined) return '<span class="muted">sin base de comparación</span>';
  const sign = pct > 0 ? '+' : '';
  const cls = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  return `<span class="change ${cls}">${sign}${pct}% vs. periodo anterior</span>`;
}

function renderStats(data) {
  statsEl.innerHTML = `
    <div class="card stat">
      <div class="value">${data.summary.count}</div>
      <div class="label">Ventas</div>
      <div class="delta">${changeBadge(data.changeCountPercent)}</div>
    </div>
    <div class="card stat">
      <div class="value">${formatMoney(data.summary.revenueCents)}</div>
      <div class="label">Ingresos</div>
      <div class="delta">${changeBadge(data.changePercent)}</div>
    </div>
    <div class="card stat">
      <div class="value">${data.alerts.length}</div>
      <div class="label">Alertas abiertas</div>
      <div class="delta muted">${data.alertsBySeverity.CRITICAL} críticas · ${data.alertsBySeverity.WARNING} avisos</div>
    </div>
  `;
}

function renderSeries(data) {
  revenueTitle.textContent = `Ingresos (${PERIOD_LABEL[currentDays]})`;
  const max = Math.max(1, ...data.revenueSeries.map((r) => r.totalCents));
  if (data.revenueSeries.length === 0) {
    barsEl.innerHTML = '<p class="muted">Sin ventas registradas.</p>';
  } else {
    barsEl.innerHTML = '';
    for (const r of data.revenueSeries) {
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = `${Math.max(4, Math.round((r.totalCents / max) * 100))}px`;
      bar.title = `${r.date}: ${formatMoney(r.totalCents)}`;
      const span = document.createElement('span');
      span.textContent = r.date.slice(5);
      bar.appendChild(span);
      barsEl.appendChild(bar);
    }
  }
}

function renderTop(data) {
  topEl.innerHTML = renderTable({
    columns: [
      { label: 'Producto', render: (p) => escapeHtml(p.name) },
      { label: 'Cant.', render: (p) => p.quantity },
      { label: 'Ingreso', render: (p) => formatMoney(p.revenueCents) },
      {
        label: 'Margen bruto est.',
        render: (p) =>
          p.hasCost
            ? `${formatMoney(p.marginCents)} <span class="muted">(${p.marginPercent}%)</span>`
            : '<span class="muted">sin costo</span>',
      },
    ],
    rows: data.topProducts,
    empty: 'Sin datos.',
  });
}

function renderInventory(data) {
  inventoryEl.innerHTML = renderTable({
    columns: [
      { label: 'Insumo', render: (i) => escapeHtml(i.name) },
      { label: 'Stock', render: (i) => `${i.stock} ${escapeHtml(i.unit)}` },
      {
        label: 'Estado',
        render: (i) =>
          i.severity
            ? `<span class="badge ${i.severity.toLowerCase()}">${i.severity}</span>`
            : '<span class="badge resolved">OK</span>',
      },
      {
        label: 'Alcanza para',
        render: (i) =>
          i.daysRemaining === null
            ? '<span class="muted">sin consumo reciente</span>'
            : `${i.daysRemaining} días`,
      },
    ],
    rows: data.inventory,
    empty: 'Sin insumos registrados.',
  });
}

function renderRec(data) {
  recEl.innerHTML = renderTable({
    columns: [
      { label: 'Producto', render: (r) => escapeHtml(r.name) },
      { label: 'Preparar', render: (r) => `${r.recommended} unidades` },
    ],
    rows: data.recommendations,
    empty: 'Sin historial suficiente.',
  });
}

function renderAlerts(data) {
  alertsEl.innerHTML =
    data.alerts.length === 0
      ? '<p class="muted">No hay alertas pendientes.</p>'
      : data.alerts
          .map(
            (a) =>
              `<p><span class="badge ${a.severity.toLowerCase()}">${a.severity}</span> ${escapeHtml(a.message)} <span class="muted">${escapeHtml(formatDate(a.createdAt))}</span> <a href="/alertas.html">Gestionar</a></p>`,
          )
          .join('');
}

async function load(days = currentDays) {
  currentDays = days;
  highlightPeriod(days);
  [statsEl, barsEl, topEl, recEl, inventoryEl, alertsEl].forEach((el) => placeholder(el, 'Cargando'));
  const data = await api(`/dashboard?days=${days}`);
  renderStats(data);
  renderSeries(data);
  renderTop(data);
  renderInventory(data);
  renderRec(data);
  renderAlerts(data);
}

await load(7);
