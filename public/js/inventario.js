import { api } from './api.js';
import { renderNav, getCurrentUser, setError } from './common.js';
import { toast, withSubmitting, formatDate, escapeHtml, placeholder, renderPager, initViewSwitcher, emptyState, icon } from './ui.js';
import { renderTable } from './components/table.js';

const SEVERITY_ICON = { CRITICAL: 'critical', WARNING: 'warning' };

const user = await getCurrentUser();
if (user.role !== 'ADMIN') {
  window.location.href = '/index.html';
  throw new Error('sin-permisos');
}
await renderNav('/inventario.html');

const PAGE_SIZE = 20;
let movementsOffset = 0;
let ingredients = [];
let switcher;

// --- Vista: Estado (tabla ordenada por urgencia, acciones por fila) ---
const ingredientsEl = document.getElementById('ingredients');

function renderIngredients() {
  const sorted = [...ingredients].sort((a, b) => {
    const rank = (x) => (x.severity === 'CRITICAL' ? 0 : x.severity === 'WARNING' ? 1 : 2);
    return rank(a) - rank(b);
  });
  ingredientsEl.innerHTML = renderTable({
    columns: [
      { label: 'Insumo', render: (i) => escapeHtml(i.name) },
      { label: 'Stock', render: (i) => `${i.stock} ${escapeHtml(i.unit)}` },
      { label: 'Mínimo', render: (i) => `${i.minStock} ${escapeHtml(i.unit)}` },
      {
        label: 'Estado',
        render: (i) =>
          i.severity
            ? `<span class="badge icon-badge ${i.severity.toLowerCase()}">${icon(SEVERITY_ICON[i.severity] ?? 'warning')}<span>${i.severity}</span></span>`
            : `<span class="badge icon-badge resolved">${icon('checkCircle')}<span>OK</span></span>`,
      },
      {
        label: 'Acciones',
        render: (i) => `
          <button type="button" class="ghost" data-entry="${i.id}">${icon('plus')}<span>Entrada</span></button>
          <button type="button" class="ghost" data-adjust="${i.id}">${icon('refresh')}<span>Ajuste</span></button>`,
      },
    ],
    rows: sorted,
    emptyHtml: emptyState('Sin insumos.', 'box'),
  });
  ingredientsEl.querySelectorAll('button[data-entry]').forEach((b) =>
    b.addEventListener('click', () => {
      document.getElementById('a-ingredient').value = b.dataset.entry;
      switcher.go('entrada');
    }),
  );
  ingredientsEl.querySelectorAll('button[data-adjust]').forEach((b) =>
    b.addEventListener('click', () => {
      document.getElementById('j-ingredient').value = b.dataset.adjust;
      switcher.go('ajuste');
    }),
  );
  const options = ingredients
    .map((i) => `<option value="${i.id}">${escapeHtml(i.name)} (${escapeHtml(i.unit)})</option>`)
    .join('');
  document.getElementById('a-ingredient').innerHTML = options;
  document.getElementById('j-ingredient').innerHTML = options;
}

async function loadIngredients() {
  placeholder(ingredientsEl, 'Cargando insumos');
  ingredients = await api('/ingredients');
  renderIngredients();
}

// --- Vista: Movimientos (paginada, bajo demanda) ---
const movementsEl = document.getElementById('movements');
const movementsPager = document.getElementById('movements-pager');

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
    emptyHtml: emptyState('Sin movimientos.', 'refresh'),
  });
}

async function loadMovements() {
  placeholder(movementsEl, 'Cargando movimientos');
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

// --- Formularios: entrada y ajuste ---
const addForm = document.getElementById('add-form');
const adjustForm = document.getElementById('adjust-form');

// Iconos de los botones de los formularios (el HTML no lleva SVG).
addForm.querySelector('button[type="submit"]').insertAdjacentHTML('afterbegin', icon('plus'));
adjustForm.querySelector('button[type="submit"]').insertAdjacentHTML('afterbegin', icon('refresh'));
for (const b of document.querySelectorAll('button[data-goto]')) {
  b.insertAdjacentHTML('afterbegin', icon('chevronLeft'));
}

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
      await loadIngredients();
      switcher.go('estado');
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
      await loadIngredients();
      switcher.go('estado');
    });
  } catch (err) {
    setError(document.getElementById('adjust-error'), err.message);
  }
});

// --- Botones «Volver» ---
document.querySelectorAll('button[data-goto]').forEach((b) =>
  b.addEventListener('click', () => switcher.go(b.dataset.goto)),
);

// --- Selector de vistas ---
switcher = initViewSwitcher({
  defaultView: 'estado',
  onEnter: {
    estado: loadIngredients,
    entrada: loadIngredients,
    ajuste: loadIngredients,
    movimientos: loadMovements,
  },
  viewIcon: { estado: 'box', entrada: 'plus', ajuste: 'refresh', movimientos: 'menu' },
});
