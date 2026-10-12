import { round3 } from '../units.js';

/**
 * Servicio de dominio `AnalyticsService`.
 *
 * Reglas de calculo para el tablero de decisiones. Son funciones puras (sin
 * I/O): reciben datos ya cargados y devuelven metricas. La persistencia y el
 * orquestamiento viven en el caso de uso `GetDashboard`.
 *
 * NOTA DE CONSISTENCIA TEMPORAL: el margen usa el costo ACTUAL del insumo
 * (`ingredients.cost_cents`), no el costo historico de cada venta. Si el costo
 * cambia, el margen de ventas pasadas se recalcula con el costo vigente. Esto
 * es una simplificacion documentada; para margen historico haria falta
 * congelar el costo en `sale_items` al momento de vender.
 */
export class AnalyticsService {
  /**
   * Variacion porcentual entre dos valores. Si la base (anterior) es cero no
   * hay porcentaje definido: se devuelve `null` para que la interfaz muestre
   * «sin base de comparacion» en lugar de un numero infinito o ficticio.
   */
  static percentChange(current, previous) {
    if (!Number.isFinite(previous) || previous === 0) return null;
    return Math.round(((current - previous) / previous) * 100);
  }

  /**
   * Dias de inventario restante de un insumo: stock / consumo diario promedio.
   * - Consumo promedio cero (o no valido) => `null` («sin consumo reciente»).
   * - No se redondea a entero: una fraccion de dia es informacion util.
   */
  static daysRemaining({ stock, avgDailyConsumption }) {
    const avg = Number(avgDailyConsumption);
    const currentStock = Number(stock);
    if (!Number.isFinite(avg) || avg <= 0 || !Number.isFinite(currentStock)) return null;
    if (currentStock <= 0) return null; // ya agotado: no hay "dias restantes" utiles
    return round3(currentStock / avg);
  }

  /**
   * Margen bruto estimado de un producto vendido.
   * `costPerUnitCents` es el costo de insumos de UNA unidad segun su receta
   * (cantidad_receta * costo_insumo), usando el costo actual. Si falta algun
   * costo (`hasCost === false`) no se calcula margen para no presentar un
   * numero enganoso.
   *
   * Es margen BRUTO: no descuenta mano de obra, envase, energia ni gastos
   * operativos. Solo ingreso menos costo de insumos consumidos.
   */
  static grossMargin({ revenueCents, quantity, costPerUnitCents, hasCost }) {
    if (!hasCost) return { costCents: null, marginCents: null, marginPercent: null, hasCost: false };
    const costCents = Math.round(costPerUnitCents * quantity);
    const marginCents = Math.round(revenueCents) - costCents;
    // El margen es una proporcion del ingreso (no una variacion entre dos
    // periodos): margen / ingreso. Con ingreso cero no hay proporcion que
    // mostrar.
    const marginPercent =
      revenueCents > 0 ? Math.round((marginCents / Math.round(revenueCents)) * 100) : null;
    return { costCents, marginCents, marginPercent, hasCost: true };
  }
}
