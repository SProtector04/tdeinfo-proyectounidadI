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

  execute({ days = 7 } = {}) {
    const today = this.salesRepository.todaySummary();
    const revenueSeries = this.salesRepository.dailyRevenue(days);
    const topProducts = this.salesRepository.topProducts(days);
    const alerts = this.inventoryRepository.listAlerts({ status: 'OPEN' });

    // Recomendacion de produccion (prediccion por media movil simple).
    const dailyQuantities = this.salesRepository.dailyQuantitiesByProduct(days);
    const byProduct = new Map();
    for (const row of dailyQuantities) {
      if (!byProduct.has(row.productId)) byProduct.set(row.productId, []);
      byProduct.get(row.productId).push(row.quantity);
    }
    const recommendations = this.recommendationService.recommend(byProduct, days).map((r) => {
      const product = this.catalogRepository.findProductById(r.productId);
      return { ...r, name: product ? product.name : `Producto #${r.productId}` };
    });

    return { today, revenueSeries, topProducts, alerts, recommendations, days };
  }
}
