import { api, formatMoney } from './api.js';
import { renderNav } from './common.js';
import { escapeHtml, formatDate, placeholder, emptyState, icon } from './ui.js';

const SEVERITY_ICON = { CRITICAL: 'critical', WARNING: 'warning' };
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

// Icono del selector de periodo (el HTML no lleva SVG).
for (const b of periodBar.querySelectorAll('button[data-days]')) {
  b.insertAdjacentHTML('afterbegin', icon('refresh'));
}

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

const CHART_COLOR = { revenue: '#d97706', cost: '#cdbfa6', gain: '#166534', unknown: '#b9b0a0' };
let revenueChart = null;
let topChart = null;

function renderSeries(data) {
  revenueTitle.textContent = `Ingresos (${PERIOD_LABEL[currentDays]})`;
  if (revenueChart) {
    revenueChart.destroy();
    revenueChart = null;
  }

  const series = data.revenueSeries;
  if (series.length === 0) {
    barsEl.innerHTML = emptyState('Sin ventas registradas.', 'cart');
    return;
  }

  // Escala por el maximo local del grafico: la barra mas alta toca el techo.
  const max = Math.max(1, ...series.map((r) => r.totalCents));
  barsEl.innerHTML = '<div class="chart-canvas"><canvas></canvas></div>';
  revenueChart = new Chart(barsEl.querySelector('canvas'), {
    type: 'bar',
    data: {
      labels: series.map((r) => r.date.slice(5)),
      datasets: [
        {
          label: 'Ingresos',
          data: series.map((r) => r.totalCents),
          backgroundColor: CHART_COLOR.revenue,
          borderRadius: 4,
          maxBarThickness: 48,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => formatMoney(ctx.parsed.y) } },
      },
      scales: {
        y: { beginAtZero: true, max, ticks: { callback: (v) => formatMoney(v) }, grid: { color: '#efe7db' } },
        x: { grid: { display: false } },
      },
    },
  });
}

function renderTop(data) {
  if (topChart) {
    topChart.destroy();
    topChart = null;
  }
  const items = data.topProducts;
  if (!items.length) {
    topEl.innerHTML = emptyState('Sin datos en este periodo.', 'menu');
    return;
  }

  // Barra = venta bruta (revenueCents) repartida en costo + ganancia. Los
  // productos sin costo registrado van a un tercer segmento neutro, sin
  // inventar ganancia. maxRev define la escala local (barra mas larga = 100%).
  const cost = items.map((p) => (p.hasCost ? p.costCents : 0));
  const gain = items.map((p) => (p.hasCost ? p.marginCents : 0));
  const unknown = items.map((p) => (p.hasCost ? 0 : p.revenueCents));
  const anyUnknown = unknown.some((v) => v > 0);
  const maxRev = Math.max(1, ...items.map((p) => p.revenueCents));

  topEl.innerHTML = '<div class="chart-canvas chart-canvas--top"><canvas></canvas></div>';
  topChart = new Chart(topEl.querySelector('canvas'), {
    type: 'bar',
    data: {
      labels: items.map((p) => p.name),
      datasets: [
        { label: 'Costo de ventas', data: cost, backgroundColor: CHART_COLOR.cost },
        { label: 'Ganancia bruta', data: gain, backgroundColor: CHART_COLOR.gain },
        { label: 'Sin costo registrado', data: unknown, backgroundColor: CHART_COLOR.unknown },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'start',
          labels: { boxWidth: 12, boxHeight: 12, filter: (item) => item.text !== 'Sin costo registrado' || anyUnknown },
        },
        tooltip: {
          callbacks: {
            title: (list) => list[0].label,
            label: (ctx) => {
              const v = ctx.parsed.x;
              if (!v) return null; // omite segmentos vacios
              if (ctx.dataset.label === 'Costo de ventas') return `Costo de ventas: ${formatMoney(v)}`;
              if (ctx.dataset.label === 'Ganancia bruta') return `Ganancia bruta: ${formatMoney(v)}`;
              return 'Sin costo registrado';
            },
            footer: (list) => {
              const p = items[list[0].dataIndex];
              if (!p) return '';
              const lines = [`${p.quantity} vendidos`, `Venta bruta: ${formatMoney(p.revenueCents)}`];
              if (p.hasCost) lines.push(`Margen: ${p.marginPercent}%`);
              return lines;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          beginAtZero: true,
          max: maxRev,
          ticks: { callback: (v) => formatMoney(v) },
          grid: { color: '#efe7db' },
        },
        y: { stacked: true, grid: { display: false } },
      },
    },
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
            ? `<span class="badge icon-badge ${i.severity.toLowerCase()}">${icon(SEVERITY_ICON[i.severity] ?? 'warning')}<span>${i.severity}</span></span>`
            : `<span class="badge icon-badge resolved">${icon('checkCircle')}<span>OK</span></span>`,
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
    emptyHtml: emptyState('Sin insumos registrados.', 'box'),
  });
}

function renderRec(data) {
  recEl.innerHTML = renderTable({
    columns: [
      { label: 'Producto', render: (r) => escapeHtml(r.name) },
      { label: 'Preparar', render: (r) => `${r.recommended} unidades` },
    ],
    rows: data.recommendations,
    emptyHtml: emptyState('Sin historial suficiente.', 'refresh'),
  });
}

function renderAlerts(data) {
  alertsEl.innerHTML =
    data.alerts.length === 0
      ? emptyState('No hay alertas pendientes.', 'checkCircle')
      : data.alerts
          .map(
            (a) =>
              `<p><span class="badge icon-badge ${a.severity.toLowerCase()}">${icon(SEVERITY_ICON[a.severity] ?? 'warning')}<span>${a.severity}</span></span> ${escapeHtml(a.message)} <span class="muted">${escapeHtml(formatDate(a.createdAt))}</span> <a href="/alertas.html">Gestionar</a></p>`,
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
