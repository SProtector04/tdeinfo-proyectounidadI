import { test } from 'node:test';
import assert from 'node:assert/strict';
import { round3 } from '../../src/domain/units.js';

test('round3: redondea a 3 decimales', () => {
  assert.equal(round3(0.1234), 0.123);
  assert.equal(round3(2), 2);
  assert.equal(round3('1.5'), 1.5);
});
