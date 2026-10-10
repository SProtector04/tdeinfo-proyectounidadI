import { InventoryRepository } from '../../domain/repositories/inventory-repository.js';

export class SqliteInventoryRepository extends InventoryRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  addMovement({ ingredientId, type, quantity, reason, userId }) {
    const info = this.db
      .prepare(
        'INSERT INTO inventory_movements (ingredient_id, type, quantity, reason, user_id) VALUES (?, ?, ?, ?, ?)',
      )
      .run(ingredientId, type, quantity, reason ?? null, userId);
    return Number(info.lastInsertRowid);
  }

  listMovements({ limit = 100 } = {}) {
    return this.db
      .prepare(
        `SELECT m.*, i.name AS ingredient_name, i.unit, u.name AS user_name
         FROM inventory_movements m
         JOIN ingredients i ON i.id = m.ingredient_id
         JOIN users u ON u.id = m.user_id
         ORDER BY m.id DESC LIMIT ?`,
      )
      .all(limit)
      .map((r) => ({
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

  avgConsumptionByIngredient(days) {
    return this.db
      .prepare(
        `SELECT ingredient_id AS ingredientId, AVG(quantity) AS avg
         FROM (
           SELECT ingredient_id, date(created_at) AS day, SUM(quantity) AS quantity
           FROM inventory_movements
           WHERE type = 'CONSUMO' AND date(created_at) >= date('now', ?)
           GROUP BY ingredient_id, date(created_at)
         )
         GROUP BY ingredient_id`,
      )
      .all(`-${days} day`);
  }

  createAlert({ type, severity, message }) {
    const info = this.db
      .prepare('INSERT INTO alerts (type, severity, message) VALUES (?, ?, ?)')
      .run(type, severity, message);
    return Number(info.lastInsertRowid);
  }

  listAlerts({ status = null } = {}) {
    let sql = 'SELECT * FROM alerts';
    const params = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY id DESC';
    return this.db.prepare(sql).all(...params).map((r) => ({
      id: r.id,
      type: r.type,
      severity: r.severity,
      message: r.message,
      status: r.status,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
    }));
  }

  resolveAlert(id) {
    this.db
      .prepare("UPDATE alerts SET status = 'RESOLVED', resolved_at = datetime('now') WHERE id = ?")
      .run(id);
  }

  addAudit({ userId, action, entity, entityId, result }) {
    this.db
      .prepare('INSERT INTO audit_logs (user_id, action, entity, entity_id, result) VALUES (?, ?, ?, ?, ?)')
      .run(userId, action, entity, entityId ?? null, result ?? null);
  }

  listAudit({ limit = 100 } = {}) {
    return this.db
      .prepare(
        `SELECT a.*, u.name AS user_name
         FROM audit_logs a JOIN users u ON u.id = a.user_id
         ORDER BY a.id DESC LIMIT ?`,
      )
      .all(limit)
      .map((r) => ({
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
