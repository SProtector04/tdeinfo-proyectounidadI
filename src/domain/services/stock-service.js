import { round3 } from '../units.js';

/**
 * Servicio de dominio `StockService`.
 *
 * Regla de negocio: al vender `factor` unidades de un producto, se calcula el
 * consumo de cada insumo segun su receta y se verifica si hay stock
 * suficiente. Es una funcion pura (sin I/O): recibe datos y devuelve un plan.
 */
export class StockService {
  /**
   * @param {object} product Entidad con `recipe` [{ingredientId, quantity}].
   * @param {Map} ingredientsById Mapa id -> { id, name, stock, unit }.
   * @param {number} factor Unidades vendidas.
   * @returns {{consumption: Map<id, number>, missing: Array}}
   */
  planConsumption(product, ingredientsById, factor = 1) {
    const consumption = new Map();

    for (const { ingredientId, quantity } of product.recipe) {
      const required = round3(quantity * factor);
      const prev = consumption.get(ingredientId) ?? 0;
      consumption.set(ingredientId, round3(prev + required));
    }

    const missing = [];
    for (const [ingredientId, required] of consumption.entries()) {
      const ing = ingredientsById.get(ingredientId);
      const available = ing ? ing.stock : 0;
      if (!ing || available < required) {
        missing.push({
          ingredientId,
          name: ing ? ing.name : `insumo #${ingredientId}`,
          required,
          available,
        });
      }
    }

    return { consumption, missing };
  }
}
