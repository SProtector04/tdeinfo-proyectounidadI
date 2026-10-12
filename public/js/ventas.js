import { api, formatMoney } from './api.js';
import { renderNav, setError } from './common.js';
import { toast, withSubmitting, formatDate, escapeHtml, placeholder, renderPager, initViewSwitcher, emptyState, icon } from './ui.js';
import { renderTable } from './components/table.js';

await renderNav('/ventas.html');

const PAGE_SIZE = 20;
let offset = 0;
let lastSaleItems = [];

// --- Vista: Cobrar (mostrador) ---
const form = document.getElementById('sale-form');
const rowsEl = document.getElementById('rows');
const errorEl = document.getElementById('error');
const totalEl = document.getElementById('sale-total');
const repeatBtn = document.getElementById('repeat-last');
const ticketEl = document.getElementById('ticket');
const ticketBody = document.getElementById('ticket-body');

// Iconos de los botones estaticos del formulario (HTML no lleva SVG).
repeatBtn.insertAdjacentHTML('afterbegin', icon('refresh'));
document.querySelector('#sale-form button[type="submit"]').insertAdjacentHTML('afterbegin', icon('cart'));
document.getElementById('print-ticket').insertAdjacentHTML('afterbegin', icon('print'));

placeholder(rowsEl, 'Cargando productos');
const products = await api('/products');
const productById = new Map(products.map((p) => [p.id, p]));

function quantityInputs() {
  return [...rowsEl.querySelectorAll('input[data-id]')];
}

function currentItems() {
  return quantityInputs()
    .map((i) => ({ productId: Number(i.dataset.id), quantity: Number(i.value) }))
    .filter((x) => x.quantity > 0);
}

function recalcTotal() {
  const totalCents = currentItems().reduce(
    (acc, { productId, quantity }) => acc + productById.get(productId).priceCents * quantity,
    0,
  );
  totalEl.textContent = formatMoney(totalCents);
}

function renderRows() {
  rowsEl.innerHTML = products
    .map(
      (p) => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.formattedPrice)}</td>
      <td class="qty-cell">
        <button type="button" class="qty-btn" data-id="${p.id}" data-step="-1" aria-label="Quitar uno">${icon('minus')}</button>
        <input type="number" min="0" step="1" data-id="${p.id}" value="0" />
        <button type="button" class="qty-btn" data-id="${p.id}" data-step="1" aria-label="Agregar uno">${icon('plus')}</button>
      </td>
    </tr>`,
    )
    .join('');
  recalcTotal();
}

function setQuantity(productId, quantity) {
  const input = rowsEl.querySelector(`input[data-id="${productId}"]`);
  if (input) input.value = Math.max(0, quantity);
}

rowsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button.qty-btn');
  if (!btn) return;
  const input = rowsEl.querySelector(`input[data-id="${btn.dataset.id}"]`);
  input.value = Math.max(0, Number(input.value) + Number(btn.dataset.step));
  recalcTotal();
});
rowsEl.addEventListener('input', recalcTotal);

function showTicket(sale, cashierName) {
  ticketBody.innerHTML = `
    <p><strong>Venta #${sale.id}</strong> &middot; ${escapeHtml(formatDate(sale.createdAt))}</p>
    <p class="muted">Cajero: ${escapeHtml(cashierName)}${sale.customerName ? ` &middot; Cliente: ${escapeHtml(sale.customerName)}` : ''}</p>
    <table>
      <tr><th>Producto</th><th>Cant.</th><th>Subtotal</th></tr>
      ${sale.items
        .map(
          (i) => `<tr>
            <td>${escapeHtml(i.productName)}</td>
            <td>${i.quantity}</td>
            <td>${formatMoney(i.subtotalCents)}</td>
          </tr>`,
        )
        .join('')}
    </table>
    <p class="ticket-total">Total: <strong>${formatMoney(sale.totalCents)}</strong></p>`;
  ticketEl.hidden = false;
}

document.getElementById('print-ticket').addEventListener('click', () => window.print());

repeatBtn.addEventListener('click', () => {
  for (const { productId, quantity } of lastSaleItems) setQuantity(productId, quantity);
  recalcTotal();
  toast('Cantidades de la última venta restauradas.', 'info');
});

renderRows();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setError(errorEl, '');

  const items = currentItems();
  if (items.length === 0) {
    setError(errorEl, 'Indica la cantidad de al menos un producto.');
    return;
  }

  const customerName = document.getElementById('customer').value.trim() || null;

  try {
    await withSubmitting(form, async () => {
      const result = await api('/sales', { method: 'POST', body: { customerName, items } });
      toast(
        `Venta #${result.saleId} registrada (${formatMoney(result.totalCents)}).` +
          (result.alerts.length ? ' Se generó(n) alerta(s) de stock bajo.' : ''),
      );
      lastSaleItems = items;
      repeatBtn.hidden = false;
      quantityInputs().forEach((i) => { i.value = 0; });
      document.getElementById('customer').value = '';
      recalcTotal();
      const created = await api(`/sales?limit=1`).then((s) => s.find((x) => x.id === result.saleId));
      const me = JSON.parse(localStorage.getItem('user') ?? 'null');
      if (created) showTicket(created, me?.name ?? 'Cajero');
    });
  } catch (err) {
    setError(errorEl, err.message);
  }
});

// --- Vista: Historial (paginada, se carga solo al entrar) ---
const salesEl = document.getElementById('sales');
const salesPager = document.getElementById('sales-pager');

function renderSales(sales) {
  salesEl.innerHTML = renderTable({
    columns: [
      { label: '#', render: (s) => s.id },
      { label: 'Fecha', render: (s) => escapeHtml(formatDate(s.createdAt)) },
      { label: 'Cliente', render: (s) => escapeHtml(s.customerName ?? '-') },
      { label: 'Cajero', render: (s) => escapeHtml(s.userName) },
      {
        label: 'Detalle',
        render: (s) => s.items.map((i) => `${escapeHtml(i.productName)} x${i.quantity}`).join(', '),
      },
      { label: 'Total', render: (s) => formatMoney(s.totalCents) },
    ],
    rows: sales,
    emptyHtml: emptyState('Sin ventas registradas.', 'cart'),
  });
}

async function loadSales() {
  placeholder(salesEl, 'Cargando ventas');
  const raw = await api(`/sales?limit=${PAGE_SIZE + 1}&offset=${offset}`);
  const page = raw.slice(0, PAGE_SIZE);
  renderSales(page);
  renderPager(salesPager, {
    offset,
    limit: PAGE_SIZE,
    fetched: raw.length,
    onChange: async (next) => {
      offset = next;
      await loadSales();
    },
  });
  if (page.length > 0 && lastSaleItems.length === 0) {
    lastSaleItems = page[0].items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
    repeatBtn.hidden = false;
  }
}

// --- Selector de vistas (Cobrar por defecto; historial bajo demanda) ---
initViewSwitcher({
  defaultView: 'cobrar',
  onEnter: {
    cobrar: () => {},
    historial: loadSales,
  },
  viewIcon: { cobrar: 'cart', historial: 'menu' },
});
