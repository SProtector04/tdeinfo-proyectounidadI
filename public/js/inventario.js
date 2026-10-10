import { api } from './api.js';
import { renderNav, getCurrentUser, setError } from './common.js';

const user = await getCurrentUser();
if (user.role !== 'ADMIN') {
  window.location.href = '/index.html';
  throw new Error('sin-permisos');
}
await renderNav('/inventario.html');

const ingredients = await api('/ingredients');
const movements = await api('/inventory/movements');

function renderIngredients() {
  document.getElementById('ingredients').innerHTML = `
    <table>
      <tr><th>Insumo</th><th>Stock</th><th>Minimo</th><th>Estado</th></tr>
      ${ingredients
        .map(
          (i) => `<tr>
            <td>${i.name}</td>
            <td>${i.stock} ${i.unit}</td>
            <td>${i.minStock} ${i.unit}</td>
            <td>${
              i.severity
                ? `<span class="badge ${i.severity.toLowerCase()}">${i.severity}</span>`
                : '<span class="badge resolved">OK</span>'
            }</td>
          </tr>`,
        )
        .join('')}
    </table>`;
}
renderIngredients();

const options = ingredients.map((i) => `<option value="${i.id}">${i.name} (${i.unit})</option>`).join('');
document.getElementById('a-ingredient').innerHTML = options;
document.getElementById('j-ingredient').innerHTML = options;

document.getElementById('add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  setError(document.getElementById('add-error'), '');
  try {
    await api('/inventory/add', {
      method: 'POST',
      body: {
        ingredientId: Number(document.getElementById('a-ingredient').value),
        quantity: Number(document.getElementById('a-qty').value),
        reason: document.getElementById('a-reason').value.trim() || null,
      },
    });
    window.location.reload();
  } catch (err) {
    setError(document.getElementById('add-error'), err.message);
  }
});

document.getElementById('adjust-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  setError(document.getElementById('adjust-error'), '');
  try {
    await api('/inventory/adjust', {
      method: 'POST',
      body: {
        ingredientId: Number(document.getElementById('j-ingredient').value),
        target: Number(document.getElementById('j-target').value),
        reason: document.getElementById('j-reason').value.trim() || null,
      },
    });
    window.location.reload();
  } catch (err) {
    setError(document.getElementById('adjust-error'), err.message);
  }
});

document.getElementById('movements').innerHTML = movements.length
  ? `<table>
      <tr><th>Fecha</th><th>Insumo</th><th>Tipo</th><th>Cantidad</th><th>Motivo</th><th>Usuario</th></tr>
      ${movements
        .map(
          (m) => `<tr>
            <td>${m.createdAt}</td>
            <td>${m.ingredientName}</td>
            <td>${m.type}</td>
            <td>${m.quantity} ${m.unit}</td>
            <td>${m.reason ?? '-'}</td>
            <td>${m.userName}</td>
          </tr>`,
        )
        .join('')}
    </table>`
  : '<p class="muted">Sin movimientos.</p>';
