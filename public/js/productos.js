import { api, formatMoney } from './api.js';
import { renderNav, getCurrentUser, setError } from './common.js';

const user = await getCurrentUser();
await renderNav('/productos.html');

const [products, ingredients] = await Promise.all([api('/products'), api('/ingredients')]);
const ingredientNames = new Map(ingredients.map((i) => [i.id, i.name]));

function renderProducts() {
  document.getElementById('products').innerHTML = products
    .map(
      (p) => `
      <div style="border-bottom:1px solid #e7dfd3; padding:8px 0">
        <strong>${p.name}</strong>
        <span class="muted">(${p.category})</span> - <strong>${p.formattedPrice}</strong>
        <div class="muted" style="font-size:0.82rem">
          ${p.recipe.length ? 'Receta: ' + p.recipe.map((r) => `${ingredientNames.get(r.ingredientId) ?? '#' + r.ingredientId} ${r.quantity}`).join(', ') : 'Sin receta (no consume inventario)'}
        </div>
      </div>`,
    )
    .join('');
}
renderProducts();

if (user.role === 'ADMIN') {
  document.getElementById('admin-section').style.display = 'block';
  const select = document.getElementById('r-ingredient');
  select.innerHTML = ingredients.map((i) => `<option value="${i.id}">${i.name} (${i.unit})</option>`).join('');

  const recipe = new Map(); // ingredientId -> quantity
  const recipeRows = document.getElementById('recipe-rows');
  const renderRecipe = () => {
    recipeRows.innerHTML = [...recipe.entries()]
      .map(
        ([id, qty]) => `
        <div class="row">
          <span>${ingredientNames.get(id)}</span>
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

  document.getElementById('product-form').addEventListener('submit', async (e) => {
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
      await api('/products', { method: 'POST', body: payload });
      window.location.reload();
    } catch (err) {
      setError(errorEl, err.message);
    }
  });
}
