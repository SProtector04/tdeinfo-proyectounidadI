import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StockService } from '../../src/domain/services/stock-service.js';
import { makeIngredient } from '../helpers/fake-repos.js';

const service = new StockService();

const queso = makeIngredient({ id: 1, name: 'Queso fresco', stock: 10 });
const tortilla = makeIngredient({ id: 2, name: 'Tortilla', unit: 'unidad', stock: 200 });
const ingredientsById = new Map([[1, queso], [2, tortilla]]);

const quesillo = {
  recipe: [
    { ingredientId: 1, quantity: 0.12 },
    { ingredientId: 2, quantity: 1 },
  ],
};

test('planConsumption: escala el consumo por receta y factor', () => {
  const { consumption, missing } = service.planConsumption(quesillo, ingredientsById, 2);
  assert.equal(consumption.get(1), 0.24);
  assert.equal(consumption.get(2), 2);
  assert.equal(missing.length, 0);
});

test('planConsumption: reporta insumo faltante con nombre y montos', () => {
  const escaso = new Map([[1, makeIngredient({ id: 1, name: 'Queso fresco', stock: 0.1 })], [2, tortilla]]);
  const { missing } = service.planConsumption(quesillo, escaso, 2);
  assert.equal(missing.length, 1);
  assert.equal(missing[0].name, 'Queso fresco');
  assert.equal(missing[0].required, 0.24);
  assert.equal(missing[0].available, 0.1);
});

test('planConsumption: insumo inexistente cuenta como faltante', () => {
  const { missing } = service.planConsumption(quesillo, new Map([[2, tortilla]]), 1);
  assert.equal(missing.length, 1);
  assert.equal(missing[0].name, 'insumo #1');
  assert.equal(missing[0].available, 0);
});

test('planConsumption: producto sin receta no consume nada', () => {
  const { consumption, missing } = service.planConsumption({ recipe: [] }, ingredientsById, 5);
  assert.equal(consumption.size, 0);
  assert.equal(missing.length, 0);
});
