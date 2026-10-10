import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AlertService } from '../src/domain/services/alert-service.js';
import { Ingredient } from '../src/domain/entities/ingredient.js';

function ingredient(id, stock, minStock) {
  return new Ingredient({ id, name: 'Queso', unit: 'kg', stock, minStock, cost: 9000 });
}

test('no genera alertas cuando el stock esta sobre el minimo', () => {
  const service = new AlertService();
  const alerts = service.evaluateLowStock([ingredient(1, 10, 3)]);
  assert.equal(alerts.length, 0);
});

test('genera alerta WARNING cuando stock <= minimo', () => {
  const service = new AlertService();
  const alerts = service.evaluateLowStock([ingredient(1, 3, 3)]);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].severity, 'WARNING');
  assert.equal(alerts[0].type, 'LOW_STOCK');
});

test('genera alerta CRITICAL cuando stock <= 0', () => {
  const service = new AlertService();
  const alerts = service.evaluateLowStock([ingredient(1, 0, 3)]);
  assert.equal(alerts[0].severity, 'CRITICAL');
});
