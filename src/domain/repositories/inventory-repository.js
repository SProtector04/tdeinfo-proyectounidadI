/**
 * Puerto `InventoryRepository`. Abstrae movimientos de inventario, alertas y
 * auditoria (trazabilidad).
 */
export class InventoryRepository {
  addMovement({ ingredientId, type, quantity, reason, userId }) {
    throw new Error('Not implemented');
  }

  listMovements({ limit }) {
    throw new Error('Not implemented');
  }

  avgConsumptionByIngredient(days) {
    throw new Error('Not implemented');
  }

  createAlert({ type, severity, message }) {
    throw new Error('Not implemented');
  }

  listAlerts({ status }) {
    throw new Error('Not implemented');
  }

  resolveAlert(id) {
    throw new Error('Not implemented');
  }

  addAudit({ userId, action, entity, entityId, result }) {
    throw new Error('Not implemented');
  }

  listAudit({ limit }) {
    throw new Error('Not implemented');
  }
}
