import { api, formatMoney } from './api.js';
import { renderNav } from './common.js';
import { escapeHtml, formatDate, placeholder } from './ui.js';
import { renderTable } from './components/table.js';

await renderNav('/index.html');

const statsEl = document.getElementById('stats');
const barsEl = document.getElementById('revenue-bars');
const topEl = document.getElementById('top-products');
const recEl = document.getElementById('recommendations');
const alertsEl = document.getElementById('alerts');

[statsEl, barsEl, topEl, recEl, alertsEl].forEach((el) => placeholder(el, 'Cargando'));

const data = await api('/dashboard');

statsEl.innerHTML = `
  <div class="card stat"><div class="value">${data.today.count}</div><div class="label">Ventas hoy</div></div>
  <div class="card stat"><div class="value">${formatMoney(data.today.revenueCents)}</div><div class="label">Ingresos hoy</div></div>
  <div class="card stat"><div class="value">${data.alerts.length}</div><div class="label">Alertas abiertas</div></div>
`;

const max = Math.max(1, ...data.revenueSeries.map((r) => r.totalCents));
if (data.revenueSeries.length === 0) {
  barsEl.innerHTML = '<p class="muted">Sin ventas registradas.</p>';
} else {
  barsEl.innerHTML = '';
  for (const r of data.revenueSeries) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    // Altura via CSSOM (permitida con CSP estricta; no es atributo style)
    bar.style.height = `${Math.max(4, Math.round((r.totalCents / max) * 100))}px`;
    bar.title = formatMoney(r.totalCents);
    const span = document.createElement('span');
    span.textContent = r.date.slice(5);
    bar.appendChild(span);
    barsEl.appendChild(bar);
  }
}

topEl.innerHTML = renderTable({
  columns: [
    { label: 'Producto', render: (p) => escapeHtml(p.name) },
    { label: 'Cantidad', render: (p) => p.quantity },
    { label: 'Ingreso', render: (p) => formatMoney(p.revenueCents) },
  ],
  rows: data.topProducts,
  empty: 'Sin datos.',
});

recEl.innerHTML = renderTable({
  columns: [
    { label: 'Producto', render: (r) => escapeHtml(r.name) },
    { label: 'Preparar', render: (r) => `${r.recommended} unidades` },
  ],
  rows: data.recommendations,
  empty: 'Sin historial suficiente.',
});

alertsEl.innerHTML =
  data.alerts.length === 0
    ? '<p class="muted">No hay alertas pendientes.</p>'
    : data.alerts
        .map(
          (a) =>
            `<p><span class="badge ${a.severity.toLowerCase()}">${a.severity}</span> ${escapeHtml(a.message)} <span class="muted">${escapeHtml(formatDate(a.createdAt))}</span> <a href="/alertas.html">Gestionar</a></p>`,
        )
        .join('');
