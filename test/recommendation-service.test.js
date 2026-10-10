import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RecommendationService } from '../src/domain/services/recommendation-service.js';

test('movingAverage promedia los ultimos N valores', () => {
  assert.equal(RecommendationService.movingAverage([10, 20, 30], 3), 20);
  assert.equal(RecommendationService.movingAverage([], 3), 0);
});

test('recommend redondea hacia arriba la media', () => {
  const service = new RecommendationService();
  const dailyTotals = new Map([[1, [1, 2, 1, 2]]]); // media 1.5 -> 2
  const result = service.recommend(dailyTotals, 4);
  assert.deepEqual(result, [{ productId: 1, recommended: 2 }]);
});

test('recommend devuelve lista vacia sin historial', () => {
  const service = new RecommendationService();
  assert.deepEqual(service.recommend(new Map()), []);
});
