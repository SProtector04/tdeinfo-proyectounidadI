/**
 * Puerto `SalesRepository`. Abstrae la persistencia de ventas y sus
 * agregaciones para el tablero y la recomendacion.
 */
export class SalesRepository {
  create({ userId, customerName, totalCents, status }) {
    throw new Error('Not implemented');
  }

  createItems(saleId, items) {
    throw new Error('Not implemented');
  }

  list({ limit }) {
    throw new Error('Not implemented');
  }

  todaySummary() {
    throw new Error('Not implemented');
  }

  dailyRevenue(days) {
    throw new Error('Not implemented');
  }

  topProducts(days) {
    throw new Error('Not implemented');
  }

  dailyQuantitiesByProduct(days) {
    throw new Error('Not implemented');
  }
}
