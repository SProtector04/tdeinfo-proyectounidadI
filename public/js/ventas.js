import { api, formatMoney } from './api.js';
import { renderNav, setError } from './common.js';

await renderNav('/ventas.html');

const products = await api('/products');
const rowsEl = document.getElementById('rows');
rowsEl.innerHTML = products
  .map(
    (p) => `
    <tr>
      <td>${p.name}</td>
      <td>${p.formattedPrice}</td>
      <td><input type="number" min="0" step="1" data-id="${p.id}" value="0" style="max-width:90px" /></td>
    </tr>`,
  )
  .join('');

document.getElementById('sale-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('error');
  setError(errorEl, '');

  const items = [...rowsEl.querySelectorAll('input')]
    .map((i) => ({ productId: Number(i.dataset.id), quantity: Number(i.value) }))
    .filter((x) => x.quantity > 0);

  if (items.length === 0) {
    setError(errorEl, 'Indica la cantidad de al menos un producto.');
    return;
  }

  const customerName = document.getElementById('customer').value.trim() || null;

  try {
    const result = await api('/sales', { method: 'POST', body: { customerName, items } });
    setError(
      errorEl,
      `Venta #${result.saleId} registrada (${formatMoney(result.totalCents)}).` +
        (result.alerts.length ? ' Se genero(n) alerta(s) de stock bajo.' : ''),
    );
    window.location.reload();
  } catch (err) {
    setError(errorEl, err.message);
  }
});

const sales = await api('/sales');
document.getElementById('sales').innerHTML =
  sales.length === 0
    ? '<p class="muted">Sin ventas.</p>'
    : `<table>
        <tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Cajero</th><th>Detalle</th><th>Total</th></tr>
        ${sales
          .map(
            (s) => `<tr>
              <td>${s.id}</td>
              <td>${s.createdAt}</td>
              <td>${s.customerName ?? '-'}</td>
              <td>${s.userName}</td>
              <td>${s.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')}</td>
              <td>${formatMoney(s.totalCents)}</td>
            </tr>`,
          )
          .join('')}
      </table>`;
