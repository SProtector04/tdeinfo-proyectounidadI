import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GetDashboard } from '../../src/application/use-cases/dashboard.js';
import { Money } from '../../src/domain/value-objects/money.js';

function makeIngredient({ id, name, unit = 'kg', stock, minStock = 0, costCents = 0, severity = null }) {
  return {
    id,
    name,
    unit,
    stock,
    minStock,
    cost: new Money(costCents),
    severity: () => severity,
  };
}

function makeProduct({ id, name, recipe = [] }) {
  return { id, name, recipe };
}

function makeSut({
  summary,
  previous,
  ingredients = [],
  products = [],
  avgConsumption = [],
  topProducts = [],
  salesSeries = [],
} = {}) {
  const calls = { summaryWindow: [] };
  const salesRepository = {
    async summaryWindow({ days, daysAgo }) {
      calls.summaryWindow.push({ days, daysAgo });
      return daysAgo === 0 ? summary : previous;
    },
    async dailyRevenue() {
      return salesSeries;
    },
    async topProducts() {
      return topProducts;
    },
    async dailyQuantitiesByProduct() {
      return [];
    },
  };
  const inventoryRepository = {
    async listAlerts() {
      return [];
    },
    async avgConsumptionByIngredient() {
      return avgConsumption;
    },
  };
  const catalogRepository = {
    async listIngredients() {
      return ingredients;
    },
    async listProducts() {
      return products;
    },
    async findProductById() {
      return null;
    },
  };
  const sut = new GetDashboard({ salesRepository, inventoryRepository, catalogRepository });
  return { sut, calls };
}

test('GetDashboard: pide la ventana actual y la inmediatamente anterior igual', async () => {
  const { sut, calls } = makeSut({ summary: { count: 2, revenueCents: 200 }, previous: { count: 1, revenueCents: 100 } });
  await sut.execute({ days: 7 });
  assert.deepEqual(calls.summaryWindow, [
    { days: 7, daysAgo: 0 },
    { days: 7, daysAgo: 7 },
  ]);
});

test('GetDashboard: variacion de ingresos con base valida', async () => {
  const { sut } = makeSut({
    summary: { count: 2, revenueCents: 200 },
    previous: { count: 1, revenueCents: 100 },
  });
  const result = await sut.execute({ days: 7 });
  assert.equal(result.changePercent, 100);
  assert.equal(result.changeCountPercent, 100);
});

test('GetDashboard: periodo anterior en cero => variacion null (no porcentaje ficticio)', async () => {
  const { sut } = makeSut({
    summary: { count: 3, revenueCents: 150 },
    previous: { count: 0, revenueCents: 0 },
  });
  const result = await sut.execute({ days: 7 });
  assert.equal(result.changePercent, null);
  assert.equal(result.changeCountPercent, null);
});

test('GetDashboard: top producto con margen bruto desde costo de receta', async () => {
  // Producto 1 receta: 0.12 kg de queso a 9000 c/kg => costo unitario 1080
  const { sut } = makeSut({
    summary: { count: 1, revenueCents: 600 },
    previous: { count: 0, revenueCents: 0 },
    ingredients: [makeIngredient({ id: 1, name: 'Queso', stock: 10, costCents: 9000 })],
    products: [makeProduct({ id: 1, name: 'Quesillo', recipe: [{ ingredientId: 1, quantity: 0.12 }] })],
    topProducts: [{ productId: 1, name: 'Quesillo', quantity: 2, revenueCents: 12000 }],
  });
  const result = await sut.execute({ days: 7 });
  const p = result.topProducts[0];
  // costo unitario 1080, vendio 2 => costo 2160; margen 12000-2160=9840; % = 82
  assert.equal(p.costCents, 2160);
  assert.equal(p.marginCents, 9840);
  assert.equal(p.marginPercent, 82);
  assert.equal(p.hasCost, true);
});

test('GetDashboard: insumo sin costo registrado => margen no calculable', async () => {
  const { sut } = makeSut({
    summary: { count: 1, revenueCents: 600 },
    previous: { count: 0, revenueCents: 0 },
    ingredients: [makeIngredient({ id: 1, name: 'Queso', stock: 10, costCents: 0 })],
    products: [makeProduct({ id: 1, name: 'Quesillo', recipe: [{ ingredientId: 1, quantity: 0.12 }] })],
    topProducts: [{ productId: 1, name: 'Quesillo', quantity: 2, revenueCents: 12000 }],
  });
  const result = await sut.execute({ days: 7 });
  const p = result.topProducts[0];
  assert.equal(p.hasCost, false);
  assert.equal(p.marginCents, null);
  assert.equal(p.marginPercent, null);
});

test('GetDashboard: inventario ordenado por criticidad y luego por dias restantes', async () => {
  const { sut } = makeSut({
    summary: { count: 0, revenueCents: 0 },
    previous: { count: 0, revenueCents: 0 },
    ingredients: [
      makeIngredient({ id: 1, name: 'Sano', stock: 100, severity: null }),
      makeIngredient({ id: 2, name: 'Critico', stock: 1, severity: 'CRITICAL' }),
      makeIngredient({ id: 3, name: 'Bajo', stock: 5, severity: 'WARNING' }),
    ],
    avgConsumption: [
      { ingredientId: 1, avg: 1 },
      { ingredientId: 2, avg: 0.5 },
      { ingredientId: 3, avg: 5 },
    ],
  });
  const result = await sut.execute({ days: 7 });
  assert.deepEqual(result.inventory.map((i) => i.name), ['Critico', 'Bajo', 'Sano']);
  assert.equal(result.inventory[1].daysRemaining, 1); // 5 / 5
  assert.equal(result.inventory[2].daysRemaining, 100); // 100 / 1
});
