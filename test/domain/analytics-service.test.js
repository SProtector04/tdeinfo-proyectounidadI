import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AnalyticsService } from '../../src/domain/services/analytics-service.js';

test('percentChange: calcula la variacion entre dos valores', () => {
  assert.equal(AnalyticsService.percentChange(120, 100), 20);
  assert.equal(AnalyticsService.percentChange(80, 100), -20);
  assert.equal(AnalyticsService.percentChange(100, 100), 0);
});

test('percentChange: base cero devuelve null (sin base de comparacion)', () => {
  assert.equal(AnalyticsService.percentChange(50, 0), null);
  assert.equal(AnalyticsService.percentChange(0, 0), null);
});

test('daysRemaining: stock entre consumo diario promedio', () => {
  assert.equal(AnalyticsService.daysRemaining({ stock: 10, avgDailyConsumption: 2 }), 5);
  // fraccion de dia: informacion util, no se trunca a entero
  assert.equal(AnalyticsService.daysRemaining({ stock: 1, avgDailyConsumption: 3 }), 0.333);
});

test('daysRemaining: consumo promedio cero devuelve null (sin consumo reciente)', () => {
  assert.equal(AnalyticsService.daysRemaining({ stock: 10, avgDailyConsumption: 0 }), null);
  assert.equal(AnalyticsService.daysRemaining({ stock: 10, avgDailyConsumption: null }), null);
  assert.equal(AnalyticsService.daysRemaining({ stock: 10, avgDailyConsumption: 'x' }), null);
});

test('daysRemaining: stock negativo (no esperado) no genera dias negativos', () => {
  // Un stock ya consumido de mas no debe presentarse como "dias" util.
  assert.equal(AnalyticsService.daysRemaining({ stock: -1, avgDailyConsumption: 2 }), null);
});

test('grossMargin: ingreso menos costo de insumos de la receta', () => {
  // vende 3 unidades a 6000 c/u; insumos cuestan 3500 c/u => costo 10500
  const m = AnalyticsService.grossMargin({
    revenueCents: 18000,
    quantity: 3,
    costPerUnitCents: 3500,
    hasCost: true,
  });
  assert.equal(m.costCents, 10500);
  assert.equal(m.marginCents, 7500);
  assert.equal(m.marginPercent, 42);
  assert.equal(m.hasCost, true);
});

test('grossMargin: margen negativo cuando el costo supera el ingreso', () => {
  const m = AnalyticsService.grossMargin({
    revenueCents: 5000,
    quantity: 1,
    costPerUnitCents: 7000,
    hasCost: true,
  });
  assert.equal(m.marginCents, -2000);
  assert.equal(m.marginPercent, -40);
});

test('grossMargin: sin costo de insumos no calcula margen (no presenta numero enganoso)', () => {
  const m = AnalyticsService.grossMargin({
    revenueCents: 18000,
    quantity: 3,
    costPerUnitCents: 0,
    hasCost: false,
  });
  assert.equal(m.costCents, null);
  assert.equal(m.marginCents, null);
  assert.equal(m.marginPercent, null);
  assert.equal(m.hasCost, false);
});
