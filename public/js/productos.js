import { api } from './api.js';
import { renderNav, getCurrentUser, setError } from './common.js';
import { toast, withSubmitting, escapeHtml, placeholder, initViewSwitcher, emptyState, icon } from './ui.js';

const user = await getCurrentUser();
await renderNav('/productos.html');

const productsEl = document.getElementById('products');
let ingredients = [];
let ingredientNames = new Map();
let switcher;

// --- Vista: Lista ---
async function renderProducts() {
  placeholder(productsEl, 'Cargando productos');
  const products = await api('/products');
  if (!products.length) {
    productsEl.innerHTML = emptyState('Sin productos en el menú.', 'menu');
    return;
  }
  productsEl.innerHTML = products
    .map(
      (p) => `
      <div class="product-row">
        <strong>${escapeHtml(p.name)}</strong>
        <span class="muted">(${escapeHtml(p.category)})</span> - <strong>${escapeHtml(p.formattedPrice)}</strong>
        <div class="muted recipe-line">
          ${p.recipe.length ? 'Receta: ' + p.recipe.map((r) => `${escapeHtml(ingredientNames.get(r.ingredientId) ?? '#' + r.ingredientId)} ${r.quantity}`).join(', ') : 'Sin receta (no consume inventario)'}
        </div>
      </div>`,
    )
    .join('');
}

// --- Vista: Nuevo producto (admin) ---
if (user.role === 'ADMIN') {
  document.getElementById('tab-nuevo').classList.remove('hidden');

  const select = document.getElementById('r-ingredient');
  const recipe = new Map(); // ingredientId -> quantity
  const recipeRows = document.getElementById('recipe-rows');

  const renderRecipe = () => {
    recipeRows.innerHTML = [...recipe.entries()]
      .map(
        ([id, qty]) => `
        <div class="row">
          <span>${escapeHtml(ingredientNames.get(id))}</span>
          <span>${qty}</span>
          <button type="button" data-remove="${id}" class="ghost">Quitar</button>
        </div>`,
      )
      .join('');
    recipeRows.querySelectorAll('button[data-remove]').forEach((b) =>
      b.addEventListener('click', () => {
        recipe.delete(Number(b.dataset.remove));
        renderRecipe();
      }),
    );
  };

  document.getElementById('add-recipe').addEventListener('click', () => {
    const id = Number(select.value);
    const qty = Number(document.getElementById('r-qty').value);
    if (!id || !(qty > 0)) return;
    recipe.set(id, qty);
    renderRecipe();
  });

  const form = document.getElementById('product-form');
  // Iconos de los botones del formulario (el HTML no lleva SVG).
  document.getElementById('add-recipe').insertAdjacentHTML('afterbegin', icon('plus'));
  form.querySelector('button[data-goto]').insertAdjacentHTML('afterbegin', icon('chevronLeft'));
  form.querySelector('button[type="submit"]').insertAdjacentHTML('afterbegin', icon('check'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('error');
    setError(errorEl, '');
    const priceCents = Math.round(Number(document.getElementById('p-price').value) * 100);
    const payload = {
      name: document.getElementById('p-name').value.trim(),
      category: document.getElementById('p-category').value.trim(),
      priceCents,
      recipe: [...recipe.entries()].map(([ingredientId, quantity]) => ({ ingredientId, quantity })),
    };
    try {
      await withSubmitting(form, async () => {
        await api('/products', { method: 'POST', body: payload });
        form.reset();
        recipe.clear();
        renderRecipe();
        toast(`Producto "${payload.name}" creado.`);
        await renderProducts();
        switcher.go('lista');
      });
    } catch (err) {
      setError(errorEl, err.message);
    }
  });

  document.querySelectorAll('button[data-goto]').forEach((b) =>
    b.addEventListener('click', () => switcher.go(b.dataset.goto)),
  );
}

// --- Arranque: cargar insumos (necesarios para la lista y el select) ---
placeholder(productsEl, 'Cargando productos');
ingredients = await api('/ingredients');
ingredientNames = new Map(ingredients.map((i) => [i.id, i.name]));
document.getElementById('r-ingredient').innerHTML = ingredients
  .map((i) => `<option value="${i.id}">${escapeHtml(i.name)} (${escapeHtml(i.unit)})</option>`)
  .join('');

switcher = initViewSwitcher({
  defaultView: 'lista',
  onEnter: {
    lista: renderProducts,
    nuevo: () => {},
  },
  viewIcon: { lista: 'menu', nuevo: 'plus' },
});
