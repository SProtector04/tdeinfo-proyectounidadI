import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StockService } from '../src/domain/services/stock-service.js';

function ingredients(map) {
  const m = new Map();
  for (const [id, stock] of Object.entries(map)) {
    m.set(Number(id), { id: Number(id), name: `insumo-${id}`, stock, unit: 'unidad' });
  }
  return m;
}

test('planConsumption calcula el consumo de cada insumo', () => {
  const service = new StockService();
  const product = {
    recipe: [
      { ingredientId: 1, quantity: 0.12 },
      { ingredientId: 2, quantity: 1 },
    ],
  };
  const plan = service.planConsumption(product, ingredients({ 1: 10, 2: 5 }), 2);

  assert.equal(plan.consumption.get(1), 0.24);
  assert.equal(plan.consumption.get(2), 2);
  assert.equal(plan.missing.length, 0);
});

test('planConsumption reporta faltante cuando no hay stock', () => {
  const service = new StockService();
  const product = { recipe: [{ ingredientId: 1, quantity: 1 }] };
  const plan = service.planConsumption(product, ingredients({ 1: 0.5 }), 1);

  assert.equal(plan.missing.length, 1);
  assert.equal(plan.missing[0].required, 1);
  assert.equal(plan.missing[0].available, 0.5);
});

test('planConsumption reporta insumo inexistente', () => {
  const service = new StockService();
  const product = { recipe: [{ ingredientId: 99, quantity: 1 }] };
  const plan = service.planConsumption(product, ingredients({}), 1);
  assert.equal(plan.missing.length, 1);
});
