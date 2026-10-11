/**
 * Caso de uso `GetDashboard`.
 *
 * Agrega datos en informacion util para la toma de decisiones: ventas de hoy,
 * serie de ingresos, productos mas vendidos, alertas pendientes y una
 * recomendacion de produccion para el proximo dia.
 */
export class GetDashboard {
  constructor({ salesRepository, inventoryRepository, catalogRepository, recommendationService }) {
    this.salesRepository = salesRepository;
    this.inventoryRepository = inventoryRepository;
    this.catalogRepository = catalogRepository;
    this.recommendationService = recommendationService;
  }

  async execute({ days = 7 } = {}) {
    const today = await this.salesRepository.todaySummary();
    const revenueSeries = await this.salesRepository.dailyRevenue(days);
    const topProducts = await this.salesRepository.topProducts(days);
    const alerts = await this.inventoryRepository.listAlerts({ status: 'OPEN' });

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

    return { today, revenueSeries, topProducts, alerts, recommendations, days };
  }
}
