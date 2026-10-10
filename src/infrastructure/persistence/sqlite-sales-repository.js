import { SalesRepository } from '../../domain/repositories/sales-repository.js';
import { Sale, SaleItem } from '../../domain/entities/sale.js';

export class SqliteSalesRepository extends SalesRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  create({ userId, customerName, totalCents, status }) {
    const info = this.db
      .prepare('INSERT INTO sales (user_id, customer_name, total_cents, status) VALUES (?, ?, ?, ?)')
      .run(userId, customerName ?? null, totalCents, status);
    return Number(info.lastInsertRowid);
  }

  createItems(saleId, items) {
    const insert = this.db.prepare(
      'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price_cents, subtotal_cents) VALUES (?, ?, ?, ?, ?)',
    );
    for (const item of items) {
      insert.run(saleId, item.productId, item.quantity, item.unitPriceCents, item.subtotalCents);
    }
  }

  list({ limit = 50 } = {}) {
    const sales = this.db
      .prepare(
        `SELECT s.*, u.name AS user_name
         FROM sales s JOIN users u ON u.id = s.user_id
         ORDER BY s.id DESC LIMIT ?`,
      )
      .all(limit);

    const ids = sales.map((s) => s.id);
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => '?').join(',');
    const itemRows = this.db
      .prepare(
        `SELECT si.*, p.name AS product_name
         FROM sale_items si JOIN products p ON p.id = si.product_id
         WHERE si.sale_id IN (${placeholders})`,
      )
      .all(...ids);

    const itemsBySale = new Map();
    for (const r of itemRows) {
      if (!itemsBySale.has(r.sale_id)) itemsBySale.set(r.sale_id, []);
      itemsBySale.get(r.sale_id).push(r);
    }

    return sales.map((s) => ({
      id: s.id,
      userId: s.user_id,
      userName: s.user_name,
      customerName: s.customer_name,
      totalCents: s.total_cents,
      status: s.status,
      createdAt: s.created_at,
      items: (itemsBySale.get(s.id) ?? []).map((r) => ({
        productId: r.product_id,
        productName: r.product_name,
        quantity: r.quantity,
        unitPriceCents: r.unit_price_cents,
        subtotalCents: r.subtotal_cents,
      })),
    }));
  }

  todaySummary() {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS count, COALESCE(SUM(total_cents), 0) AS revenue
         FROM sales WHERE date(created_at) = date('now') AND status = 'COMPLETED'`,
      )
      .get();
    return { count: row.count, revenueCents: row.revenue };
  }

  dailyRevenue(days) {
    return this.db
      .prepare(
        `SELECT date(created_at) AS date, SUM(total_cents) AS totalCents
         FROM sales
         WHERE status = 'COMPLETED' AND date(created_at) >= date('now', ?)
         GROUP BY date(created_at)
         ORDER BY date(created_at)`,
      )
      .all(`-${days} day`);
  }

  topProducts(days) {
    return this.db
      .prepare(
        `SELECT p.id AS productId, p.name AS name,
                SUM(si.quantity) AS quantity,
                SUM(si.subtotal_cents) AS revenueCents
         FROM sale_items si
         JOIN products p ON p.id = si.product_id
         JOIN sales s ON s.id = si.sale_id
         WHERE s.status = 'COMPLETED' AND date(s.created_at) >= date('now', ?)
         GROUP BY p.id
         ORDER BY quantity DESC
         LIMIT 5`,
      )
      .all(`-${days} day`);
  }

  dailyQuantitiesByProduct(days) {
    return this.db
      .prepare(
        `SELECT si.product_id AS productId,
                date(s.created_at) AS date,
                SUM(si.quantity) AS quantity
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         WHERE s.status = 'COMPLETED' AND date(s.created_at) >= date('now', ?)
         GROUP BY si.product_id, date(s.created_at)
         ORDER BY date(s.created_at)`,
      )
      .all(`-${days} day`);
  }
}
