import { api, formatMoney } from './api.js';
import { renderNav } from './common.js';

await renderNav('/index.html');

const data = await api('/dashboard');

document.getElementById('stats').innerHTML = `
  <div class="card stat"><div class="value">${data.today.count}</div><div class="label">Ventas hoy</div></div>
  <div class="card stat"><div class="value">${formatMoney(data.today.revenueCents)}</div><div class="label">Ingresos hoy</div></div>
  <div class="card stat"><div class="value">${data.alerts.length}</div><div class="label">Alertas abiertas</div></div>
`;

const max = Math.max(1, ...data.revenueSeries.map((r) => r.totalCents));
document.getElementById('revenue-bars').innerHTML = data.revenueSeries
  .map((r) => {
    const h = Math.max(4, Math.round((r.totalCents / max) * 100));
    const day = r.date.slice(5);
    return `<div class="bar" style="height:${h}px" title="${formatMoney(r.totalCents)}"><span>${day}</span></div>`;
  })
  .join('') || '<p class="muted">Sin ventas registradas.</p>';

document.getElementById('top-products').innerHTML =
  data.topProducts.length === 0
    ? '<p class="muted">Sin datos.</p>'
    : `<table><tr><th>Producto</th><th>Cantidad</th><th>Ingreso</th></tr>${data.topProducts
        .map((p) => `<tr><td>${p.name}</td><td>${p.quantity}</td><td>${formatMoney(p.revenueCents)}</td></tr>`)
        .join('')}</table>`;

document.getElementById('recommendations').innerHTML =
  data.recommendations.length === 0
    ? '<p class="muted">Sin historial suficiente.</p>'
    : `<table><tr><th>Producto</th><th>Preparar</th></tr>${data.recommendations
        .map((r) => `<tr><td>${r.name}</td><td>${r.recommended} unidades</td></tr>`)
        .join('')}</table>`;

document.getElementById('alerts').innerHTML =
  data.alerts.length === 0
    ? '<p class="muted">No hay alertas pendientes.</p>'
    : data.alerts
        .map(
          (a) =>
            `<p><span class="badge ${a.severity.toLowerCase()}">${a.severity}</span> ${a.message} <a href="/alertas.html">Gestionar</a></p>`,
        )
        .join('');
