import { AnalyticsService } from '../../domain/services/analytics-service.js';
import { RecommendationService } from '../../domain/services/recommendation-service.js';

/**
 * Caso de uso `GetDashboard`.
 *
 * Agrega datos en informacion util para la toma de decisiones:
 *  - resumen de la ventana actual y de la inmediatamente anterior (comparativa)
 *  - serie diaria de ingresos de la ventana
 *  - productos mas vendidos con costo de receta y margen bruto
 *  - dias de inventario restante por insumo (alerta proactiva de reposicion)
 *  - alertas abiertas y recomendacion de produccion (media movil simple)
 *
 * Toda la logica de calculo pura vive en `AnalyticsService`; aqui solo se
 * cargan datos desde los puertos y se combinan.
 */
export class GetDashboard {
  constructor({
    salesRepository,
    inventoryRepository,
    catalogRepository,
    recommendationService = new RecommendationService(),
    analyticsService = AnalyticsService,
  }) {
    this.salesRepository = salesRepository;
    this.inventoryRepository = inventoryRepository;
    this.catalogRepository = catalogRepository;
    this.recommendationService = recommendationService;
    this.analytics = analyticsService;
  }

  /**
   * @param {object} params
   * @param {number} params.days Ventana de analisis en dias (1, 7 o 30).
   */
  async execute({ days = 7 } = {}) {
    // Resumen de la ventana actual y de la inmediatamente anterior de igual
    // longitud (days dias calendario terminados hoy y terminados hace `days`).
    const [summary, previous] = await Promise.all([
      this.salesRepository.summaryWindow({ days, daysAgo: 0 }),
      this.salesRepository.summaryWindow({ days, daysAgo: days }),
    ]);

    const [revenueSeries, alerts, ingredients] = await Promise.all([
      this.salesRepository.dailyRevenue(days),
      this.inventoryRepository.listAlerts({ status: 'OPEN' }),
      this.catalogRepository.listIngredients(),
    ]);

    // Cargar recetas y costos solo de los insumos activos (para dias restantes).
    const ingredientCostsById = new Map(ingredients.map((i) => [i.id, i.cost.cents]));

    // Dias de inventario restante por insumo (consumo promedio diario real).
    const avgConsumption = await this.inventoryRepository.avgConsumptionByIngredient(days);
    const inventory = ingredients
      .map((ing) => {
        const avgRow = avgConsumption.find((r) => r.ingredientId === ing.id);
        return {
          ingredientId: ing.id,
          name: ing.name,
          unit: ing.unit,
          stock: ing.stock,
          minStock: ing.minStock,
          severity: ing.severity(),
          avgDailyConsumption: avgRow ? Number(avgRow.avg) : 0,
          daysRemaining: this.analytics.daysRemaining({
            stock: ing.stock,
            avgDailyConsumption: avgRow ? avgRow.avg : 0,
          }),
        };
      })
      // Los criticos primero; luego por dias restantes ascendente (los que se
      // acaban antes arriba). Los que quedan al final no tienen consumo.
      .sort((a, b) => {
        const rank = (x) => (x.severity === 'CRITICAL' ? 0 : x.severity === 'WARNING' ? 1 : 2);
        if (rank(a) !== rank(b)) return rank(a) - rank(b);
        const da = a.daysRemaining ?? Number.POSITIVE_INFINITY;
        const db = b.daysRemaining ?? Number.POSITIVE_INFINITY;
        return da - db;
      });

    // Productos mas vendidos con margen bruto (costo de receta actual).
    const topProducts = await this.#topProductsWithMargin(days, ingredientCostsById);

    // Recomendacion de produccion (prediccion por media movil simple).
    const dailyQuantities = await this.salesRepository.dailyQuantitiesByProduct(days);
    const byProduct = new Map();
    for (const row of dailyQuantities) {
      if (!byProduct.has(row.productId)) byProduct.set(row.productId, []);
      byProduct.get(row.productId).push(row.quantity);
    }
    const recommendations = [];
    for (const r of this.recommendationService.recommend(byProduct, days)) {
      const product = await this.catalogRepository.findProductById(r.productId);
      recommendations.push({ ...r, name: product ? product.name : `Producto #${r.productId}` });
    }

    const alertsBySeverity = { CRITICAL: 0, WARNING: 0 };
    for (const a of alerts) {
      if (a.severity in alertsBySeverity) alertsBySeverity[a.severity] += 1;
    }

    return {
      days,
      summary,
      previous,
      changePercent: this.analytics.percentChange(summary.revenueCents, previous.revenueCents),
      changeCountPercent: this.analytics.percentChange(summary.count, previous.count),
      revenueSeries,
      topProducts,
      inventory,
      alerts,
      alertsBySeverity,
      recommendations,
    };
  }

  async #topProductsWithMargin(days, ingredientCostsById) {
    // Precargar recetas (con costos por insumo) de todos los productos activos.
    const products = await this.catalogRepository.listProducts();
    const recipesByProductId = new Map(products.map((p) => [p.id, p.recipe]));

    const rows = await this.salesRepository.topProducts({ days });

    return rows.map((r) => {
      const recipe = recipesByProductId.get(r.productId) ?? [];
      // Producto sin receta: no consume insumos, su costo es 0 y el margen es
      // el ingreso completo (caso valido, p. ej. un articuo reenvasado).
      if (recipe.length === 0) {
        const margin = this.analytics.grossMargin({
          revenueCents: r.revenueCents,
          quantity: r.quantity,
          costPerUnitCents: 0,
          hasCost: true,
        });
        return { ...r, ...margin };
      }
      // Con receta: si cualquier insumo tiene costo 0 (default de la BD) se
      // asume "sin costo registrado" y NO se calcula margen, para no
      // presentar un porcentaje enganoso.
      let costPerUnitCents = 0;
      let hasCost = true;
      for (const line of recipe) {
        const unitCost = ingredientCostsById.get(line.ingredientId);
        if (!unitCost) {
          hasCost = false;
          break;
        }
        costPerUnitCents += unitCost * line.quantity;
      }
      const margin = this.analytics.grossMargin({
        revenueCents: r.revenueCents,
        quantity: r.quantity,
        costPerUnitCents,
        hasCost,
      });
      return { ...r, ...margin };
    });
  }
}
