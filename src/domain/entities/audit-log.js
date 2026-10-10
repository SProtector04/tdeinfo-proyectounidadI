import { ValidationError } from '../errors.js';

/**
 * Entidad `AuditLog`. Registra la trazabilidad minima de las operaciones
 * importantes: usuario, accion, entidad, resultado y fecha.
 */
export class AuditLog {
  constructor({ id = null, userId, action, entity, entityId = null, result = null, createdAt = null }) {
    if (!userId) throw new ValidationError('La auditoria requiere un usuario');
    if (!action) throw new ValidationError('La auditoria requiere una accion');
    if (!entity) throw new ValidationError('La auditoria requiere una entidad');
    this.id = id;
    this.userId = userId;
    this.action = String(action);
    this.entity = String(entity);
    this.entityId = entityId;
    this.result = result;
    this.createdAt = createdAt;
  }
}
