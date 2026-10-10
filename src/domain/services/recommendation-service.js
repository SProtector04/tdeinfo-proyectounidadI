/**
 * Servicio de dominio `RecommendationService`.
 *
 * Regla de automatizacion (prediccion simple): recomienda cuantas unidades de
 * cada producto preparar para el proximo dia usando una media movil simple
 * (SMA) sobre las ventas de los ultimos `window` dias.
 *
 * LIMITES conocidos (a explicar en la demostracion):
 *  - No modela estacionalidad, dias de la semana, feriados ni clima.
 *  - No captura tendencias (es una media, no una regresion).
 *  - Puede subestimar productos nuevos (sin historial).
 */
export class RecommendationService {
  static movingAverage(values, window = 7) {
    const sample = values.slice(-window);
    if (sample.length === 0) return 0;
    const sum = sample.reduce((acc, v) => acc + v, 0);
    return sum / sample.length;
  }

  /**
   * @param {Map} dailyTotalsByProduct Map productId -> number[] (totales
   *   diarios ordenados por fecha, faltantes en cero).
   * @param {number} window Ventana de dias para la media.
   * @returns {Array<{productId, recommended}>} Recomendacion redondeada hacia
   *   arriba (no se puede preparar medio quesillo).
   */
  recommend(dailyTotalsByProduct, window = 7) {
    const result = [];
    for (const [productId, totals] of dailyTotalsByProduct.entries()) {
      const avg = RecommendationService.movingAverage(totals, window);
      result.push({ productId, recommended: Math.ceil(avg) });
    }
    return result;
  }
}
