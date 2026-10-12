import { InventoryRepository } from '../../domain/repositories/inventory-repository.js';

export class PostgresInventoryRepository extends InventoryRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  async addMovement({ ingredientId, type, quantity, reason, userId }) {
    const rows = await this.db.query(
      'INSERT INTO inventory_movements (ingredient_id, type, quantity, reason, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [ingredientId, type, quantity, reason ?? null, userId],
    );
    return rows[0].id;
  }

  async listMovements({ limit = 100, offset = 0 } = {}) {
    const rows = await this.db.query(
      `SELECT m.*, i.name AS ingredient_name, i.unit, u.name AS user_name
       FROM inventory_movements m
       JOIN ingredients i ON i.id = m.ingredient_id
       JOIN users u ON u.id = m.user_id
       ORDER BY m.id DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return rows.map((r) => ({
      id: r.id,
      ingredientId: r.ingredient_id,
      ingredientName: r.ingredient_name,
      unit: r.unit,
      type: r.type,
      quantity: r.quantity,
      reason: r.reason,
      userId: r.user_id,
      userName: r.user_name,
      createdAt: r.created_at,
    }));
  }

  async avgConsumptionByIngredient(days) {
    return this.db.query(
      `SELECT ingredient_id AS "ingredientId", AVG(quantity) AS avg
       FROM (
         SELECT ingredient_id, created_at::date AS day, SUM(quantity) AS quantity
         FROM inventory_movements
         WHERE type = 'CONSUMO' AND created_at::date >= CURRENT_DATE - ($1 * INTERVAL '1 day')
         GROUP BY ingredient_id, created_at::date
       ) sub
       GROUP BY ingredient_id`,
      [days],
    );
  }

  async createAlert({ type, severity, message }) {
    const rows = await this.db.query(
      'INSERT INTO alerts (type, severity, message) VALUES ($1, $2, $3) RETURNING id',
      [type, severity, message],
    );
    return rows[0].id;
  }

  async listAlerts({ status = null } = {}) {
    let sql = 'SELECT * FROM alerts';
    const params = [];
    if (status) {
      sql += ' WHERE status = $1';
      params.push(status);
    }
    sql += ' ORDER BY id DESC';
    const rows = await this.db.query(sql, params);
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      severity: r.severity,
      message: r.message,
      status: r.status,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
    }));
  }

  async resolveAlert(id) {
    await this.db.query("UPDATE alerts SET status = 'RESOLVED', resolved_at = NOW() WHERE id = $1", [id]);
  }

  async addAudit({ userId, action, entity, entityId, result }) {
    await this.db.query(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, result) VALUES ($1, $2, $3, $4, $5)',
      [userId, action, entity, entityId ?? null, result ?? null],
    );
  }

  async listAudit({ limit = 100, offset = 0 } = {}) {
    const rows = await this.db.query(
      `SELECT a.*, u.name AS user_name
       FROM audit_logs a JOIN users u ON u.id = a.user_id
       ORDER BY a.id DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      action: r.action,
      entity: r.entity,
      entityId: r.entity_id,
      result: r.result,
      createdAt: r.created_at,
    }));
  }
}
