import { Alert } from '../entities/alert.js';
import { round3 } from '../units.js';

/**
 * Servicio de dominio `AlertService`.
 *
 * Regla de automatizacion: evalua el inventario y genera alertas de stock
 * bajo con una recomendacion de reposicion basada en el consumo promedio
 * diario de cada insumo.
 */
export class AlertService {
  /**
   * @param {Array<Ingredient>} ingredients Insumos a evaluar.
   * @param {Map} avgDailyConsumption Map id -> consumo promedio diario.
   * @returns {Array<Alert>} Alertas nuevas (solo para insumos en nivel bajo).
   */
  evaluateLowStock(ingredients, avgDailyConsumption = new Map()) {
    const alerts = [];
    for (const ing of ingredients) {
      const severity = ing.severity();
      if (!severity) continue;

      const avg = avgDailyConsumption.get(ing.id) ?? 0;
      const suggested = Math.max(0, Math.ceil(round3(avg * 3 + ing.minStock - ing.stock)));

      const message = [
        `"${ing.name}": stock ${ing.stock} ${ing.unit} <= minimo ${ing.minStock} ${ing.unit}.`,
        `Reposicion sugerida: ${suggested} ${ing.unit} (consumo promedio diario ${round3(avg)} ${ing.unit}).`,
      ].join(' ');

      alerts.push(new Alert({ type: 'LOW_STOCK', severity, message }));
    }
    return alerts;
  }
}
