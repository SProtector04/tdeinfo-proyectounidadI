import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RecommendationService } from '../../src/domain/services/recommendation-service.js';

const service = new RecommendationService();

test('movingAverage: media de la ventana mas reciente', () => {
  assert.equal(RecommendationService.movingAverage([1, 2, 3, 4], 3), 3);
  assert.equal(RecommendationService.movingAverage([10], 7), 10);
});

test('movingAverage: sin historial devuelve 0', () => {
  assert.equal(RecommendationService.movingAverage([], 7), 0);
});

test('recommend: redondea hacia arriba (no se prepara medio quesillo)', () => {
  const byProduct = new Map([[1, [2, 2, 3]]]);
  const result = service.recommend(byProduct, 3);
  assert.deepEqual(result, [{ productId: 1, recommended: 3 }]);
});

test('recommend: ignora dias fuera de la ventana', () => {
  const byProduct = new Map([[1, [100, 1, 1, 1]]]);
  const result = service.recommend(byProduct, 3);
  assert.deepEqual(result, [{ productId: 1, recommended: 1 }]);
});
