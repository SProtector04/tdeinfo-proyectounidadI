import { api } from './api.js';
import { renderNav, getCurrentUser, setError } from './common.js';
import { toast, withSubmitting, escapeHtml, placeholder } from './ui.js';

const user = await getCurrentUser();
await renderNav('/productos.html');

const productsEl = document.getElementById('products');
placeholder(productsEl, 'Cargando productos');

const [ingredients] = await Promise.all([api('/ingredients')]);
const ingredientNames = new Map(ingredients.map((i) => [i.id, i.name]));

async function renderProducts() {
  const products = await api('/products');
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

await renderProducts();

if (user.role === 'ADMIN') {
  document.getElementById('admin-section').classList.remove('hidden');
  const select = document.getElementById('r-ingredient');
  select.innerHTML = ingredients.map((i) => `<option value="${i.id}">${escapeHtml(i.name)} (${escapeHtml(i.unit)})</option>`).join('');

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
      });
    } catch (err) {
      setError(errorEl, err.message);
    }
  });
}
