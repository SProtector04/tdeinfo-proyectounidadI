import { SalesRepository } from '../../domain/repositories/sales-repository.js';

export class PostgresSalesRepository extends SalesRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  async create({ userId, customerName, totalCents, status }) {
    const rows = await this.db.query(
      'INSERT INTO sales (user_id, customer_name, total_cents, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, customerName ?? null, totalCents, status],
    );
    return rows[0].id;
  }

  async createItems(saleId, items) {
    for (const item of items) {
      await this.db.query(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price_cents, subtotal_cents) VALUES ($1, $2, $3, $4, $5)',
        [saleId, item.productId, item.quantity, item.unitPriceCents, item.subtotalCents],
      );
    }
  }

  async list({ limit = 50 } = {}) {
    const sales = await this.db.query(
      `SELECT s.*, u.name AS user_name
       FROM sales s JOIN users u ON u.id = s.user_id
       ORDER BY s.id DESC LIMIT $1`,
      [limit],
    );

    const ids = sales.map((s) => s.id);
    if (ids.length === 0) return [];

    const itemRows = await this.db.query(
      `SELECT si.*, p.name AS product_name
       FROM sale_items si JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = ANY($1::int[])`,
      [ids],
    );

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

  async todaySummary() {
    const rows = await this.db.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(total_cents), 0)::int AS revenue
       FROM sales WHERE created_at::date = CURRENT_DATE AND status = 'COMPLETED'`,
    );
    return { count: rows[0].count, revenueCents: rows[0].revenue };
  }

  async dailyRevenue(days) {
    return this.db.query(
      `SELECT to_char(created_at, 'YYYY-MM-DD') AS date, SUM(total_cents)::int AS "totalCents"
       FROM sales
       WHERE status = 'COMPLETED' AND created_at::date >= CURRENT_DATE - ($1 * INTERVAL '1 day')
       GROUP BY to_char(created_at, 'YYYY-MM-DD')
       ORDER BY to_char(created_at, 'YYYY-MM-DD')`,
      [days],
    );
  }

  async topProducts(days) {
    return this.db.query(
      `SELECT p.id AS "productId", p.name AS name,
              SUM(si.quantity) AS quantity,
              SUM(si.subtotal_cents)::int AS "revenueCents"
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       JOIN sales s ON s.id = si.sale_id
       WHERE s.status = 'COMPLETED' AND s.created_at::date >= CURRENT_DATE - ($1 * INTERVAL '1 day')
       GROUP BY p.id
       ORDER BY quantity DESC
       LIMIT 5`,
      [days],
    );
  }

  async dailyQuantitiesByProduct(days) {
    return this.db.query(
      `SELECT si.product_id AS "productId",
              to_char(s.created_at, 'YYYY-MM-DD') AS date,
              SUM(si.quantity) AS quantity
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.status = 'COMPLETED' AND s.created_at::date >= CURRENT_DATE - ($1 * INTERVAL '1 day')
       GROUP BY si.product_id, to_char(s.created_at, 'YYYY-MM-DD')
       ORDER BY to_char(s.created_at, 'YYYY-MM-DD')`,
      [days],
    );
  }
}
