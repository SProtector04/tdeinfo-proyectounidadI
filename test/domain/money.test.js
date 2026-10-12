import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Money } from '../../src/domain/value-objects/money.js';
import { ValidationError } from '../../src/domain/errors.js';

test('Money: desde centavos y desde unidades', () => {
  assert.equal(Money.fromCents(6000).cents, 6000);
  assert.equal(Money.fromNumber(60.5).cents, 6050);
});

test('Money: suma y multiplicacion enteras sin errores de flotante', () => {
  const a = Money.fromCents(6000);
  const b = Money.fromCents(1500);
  assert.equal(a.add(b).cents, 7500);
  assert.equal(a.multiply(3).cents, 18000);
  // 0.1 + 0.2 en centavos no produce residuos flotantes
  assert.equal(Money.fromNumber(0.1).add(Money.fromNumber(0.2)).cents, 30);
});

test('Money: formato cordobas', () => {
  assert.equal(Money.fromCents(6050).format(), 'C$ 60.50');
  assert.equal(Money.fromCents(5).format(), 'C$ 0.05');
});

test('Money: monto invalido lanza ValidationError', () => {
  assert.throws(() => new Money('abc'), ValidationError);
  assert.throws(() => new Money(NaN), ValidationError);
});
