import { api } from './api.js';
import { renderNav, getCurrentUser, setError } from './common.js';
import { toast, withSubmitting, escapeHtml, placeholder, initViewSwitcher, emptyState, icon } from './ui.js';

const user = await getCurrentUser();
await renderNav('/productos.html');

const productsEl = document.getElementById('products');
const searchEl = document.getElementById('product-search');
let ingredients = [];
let ingredientNames = new Map();
let ingredientSeverity = new Map();
let allProducts = [];
let searchTerm = '';
let switcher;

/**
 * Estado de insumo faltante de un producto. Solo lo declara cuando los datos
 * lo justifican: un insumo de la receta en WARNING/CRITICAL, o un insumo que
 * la receta referencia pero no esta en el catalogo (dato incompleto). Si no
 * hay receta o todos los insumos estan OK, no se muestra nada.
 */
function shortage(product) {
  if (!product.recipe?.length) return null;
  const missing = [];
  for (const line of product.recipe) {
    const severity = ingredientSeverity.get(line.ingredientId);
    if (severity === 'CRITICAL' || severity === 'WARNING' || severity === undefined) {
      missing.push(ingredientNames.get(line.ingredientId) ?? `#${line.ingredientId}`);
    }
  }
  return missing.length ? missing : null;
}

/** Tarjeta de producto: nombre, categoria, precio destacado y receta. */
// Imagen por producto. El mapa usa el nombre exacto del producto sembrado;
// cualquier producto nuevo (o sin foto propia) cae al SVG generico.
const PRODUCT_IMAGE = {
  'Quesillo sencillo': '/img/quesillo-sencillo.png',
  'Quesillo con crema': '/img/quesillo-crema.png',
  'Quesillo doble': '/img/quesillo-doble.png',
  Tiste: '/img/tiste.png',
  Cacao: '/img/cacao.png',
  'Fresco natural': '/img/refrescos-naturales.png',
};

function productImage(name) {
  return PRODUCT_IMAGE[name] ?? '/img/generico.svg';
}

function productCard(p) {
  const short = shortage(p);
  const recipeLine = p.recipe.length
    ? p.recipe.map((r) => `${escapeHtml(ingredientNames.get(r.ingredientId) ?? '#' + r.ingredientId)} ${r.quantity}`).join(' · ')
    : 'No consume inventario';
  return `
    <article class="product-card${short ? ' product-card--short' : ''}">
      <img class="product-card__img" src="${productImage(p.name)}" alt="" loading="lazy" />
      <div class="product-card__head">
        <span class="product-card__cat">${escapeHtml(p.category)}</span>
        <strong class="product-card__price">${escapeHtml(p.formattedPrice)}</strong>
      </div>
      <h3 class="product-card__name">${escapeHtml(p.name)}</h3>
      <p class="product-card__recipe">${recipeLine}</p>
      ${short ? `<p class="product-card__alert">${icon('warning')}<span>Falta insumo: ${short.map(escapeHtml).join(', ')}</span></p>` : ''}
    </article>`;
}

/** Agrupa por categoria y aplica el filtro de busqueda (nombre o categoria). */
function renderCatalog(products) {
  const term = searchTerm.trim().toLowerCase();
  const filtered = term
    ? products.filter((p) => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term))
    : products;

  if (!filtered.length) {
    productsEl.innerHTML = term
      ? emptyState(`Sin resultados para “${searchTerm.trim()}”.`, 'search')
      : emptyState('Sin productos en el menú.', 'menu');
    return;
  }

  // Secciones por categoria, en orden alfabético; categorias vacias tras el
  // filtro simplemente no aparecen.
  const groups = new Map();
  for (const p of filtered) {
    if (!groups.has(p.category)) groups.set(p.category, []);
    groups.get(p.category).push(p);
  }
  const sections = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'));

  productsEl.innerHTML = sections
    .map(
      ([category, items]) => `
      <section class="cat-group">
        <h2 class="cat-group__title">${escapeHtml(category)} <span class="cat-group__count">${items.length}</span></h2>
        <div class="product-grid">${items.map(productCard).join('')}</div>
      </section>`,
    )
    .join('');
}

// --- Vista: Lista ---
async function renderProducts() {
  placeholder(productsEl, 'Cargando productos');
  allProducts = await api('/products');
  renderCatalog(allProducts);
}

// Busqueda instantanea, sin llamada al backend (filtra `allProducts`).
searchEl.addEventListener('input', (e) => {
  searchTerm = e.target.value;
  renderCatalog(allProducts);
});

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
ingredientSeverity = new Map(ingredients.map((i) => [i.id, i.severity]));
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
