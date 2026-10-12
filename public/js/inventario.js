import { api } from './api.js';
import { renderNav, getCurrentUser, setError } from './common.js';
import { toast, withSubmitting, formatDate, escapeHtml, placeholder, renderPager } from './ui.js';
import { renderTable } from './components/table.js';

const user = await getCurrentUser();
if (user.role !== 'ADMIN') {
  window.location.href = '/index.html';
  throw new Error('sin-permisos');
}
await renderNav('/inventario.html');

const PAGE_SIZE = 20;
let movementsOffset = 0;

const ingredientsEl = document.getElementById('ingredients');
const movementsEl = document.getElementById('movements');
const movementsPager = document.getElementById('movements-pager');
placeholder(ingredientsEl, 'Cargando insumos');
placeholder(movementsEl, 'Cargando movimientos');

const addForm = document.getElementById('add-form');
const adjustForm = document.getElementById('adjust-form');

let ingredients = [];

function renderIngredients() {
  ingredientsEl.innerHTML = renderTable({
    columns: [
      { label: 'Insumo', render: (i) => escapeHtml(i.name) },
      { label: 'Stock', render: (i) => `${i.stock} ${escapeHtml(i.unit)}` },
      { label: 'Mínimo', render: (i) => `${i.minStock} ${escapeHtml(i.unit)}` },
      {
        label: 'Estado',
        render: (i) =>
          i.severity
            ? `<span class="badge ${i.severity.toLowerCase()}">${i.severity}</span>`
            : '<span class="badge resolved">OK</span>',
      },
    ],
    rows: ingredients,
    empty: 'Sin insumos.',
  });
  const options = ingredients.map((i) => `<option value="${i.id}">${escapeHtml(i.name)} (${escapeHtml(i.unit)})</option>`).join('');
  document.getElementById('a-ingredient').innerHTML = options;
  document.getElementById('j-ingredient').innerHTML = options;
}

function renderMovements(movements) {
  movementsEl.innerHTML = renderTable({
    columns: [
      { label: 'Fecha', render: (m) => escapeHtml(formatDate(m.createdAt)) },
      { label: 'Insumo', render: (m) => escapeHtml(m.ingredientName) },
      { label: 'Tipo', render: (m) => escapeHtml(m.type) },
      { label: 'Cantidad', render: (m) => `${m.quantity} ${escapeHtml(m.unit)}` },
      { label: 'Motivo', render: (m) => escapeHtml(m.reason ?? '-') },
      { label: 'Usuario', render: (m) => escapeHtml(m.userName) },
    ],
    rows: movements,
    empty: 'Sin movimientos.',
  });
}

async function loadMovements() {
  const raw = await api(`/inventory/movements?limit=${PAGE_SIZE + 1}&offset=${movementsOffset}`);
  renderMovements(raw.slice(0, PAGE_SIZE));
  renderPager(movementsPager, {
    offset: movementsOffset,
    limit: PAGE_SIZE,
    fetched: raw.length,
    onChange: async (next) => {
      movementsOffset = next;
      await loadMovements();
    },
  });
}

async function refresh() {
  ingredients = await api('/ingredients');
  renderIngredients();
  movementsOffset = 0;
  await loadMovements();
}

await refresh();

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setError(document.getElementById('add-error'), '');
  try {
    await withSubmitting(addForm, async () => {
      await api('/inventory/add', {
        method: 'POST',
        body: {
          ingredientId: Number(document.getElementById('a-ingredient').value),
          quantity: Number(document.getElementById('a-qty').value),
          reason: document.getElementById('a-reason').value.trim() || null,
        },
      });
      document.getElementById('a-qty').value = '';
      document.getElementById('a-reason').value = '';
      toast('Entrada de stock registrada.');
      await refresh();
    });
  } catch (err) {
    setError(document.getElementById('add-error'), err.message);
  }
});

adjustForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setError(document.getElementById('adjust-error'), '');
  try {
    await withSubmitting(adjustForm, async () => {
      await api('/inventory/adjust', {
        method: 'POST',
        body: {
          ingredientId: Number(document.getElementById('j-ingredient').value),
          target: Number(document.getElementById('j-target').value),
          reason: document.getElementById('j-reason').value.trim() || null,
        },
      });
      document.getElementById('j-target').value = '';
      document.getElementById('j-reason').value = '';
      toast('Stock ajustado.');
      await refresh();
    });
  } catch (err) {
    setError(document.getElementById('adjust-error'), err.message);
  }
});
