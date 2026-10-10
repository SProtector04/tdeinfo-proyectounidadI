import { ValidationError } from '../errors.js';
import { round3 } from '../units.js';

export const MOVEMENT_TYPES = Object.freeze({
  ENTRADA: 'ENTRADA',
  SALIDA: 'SALIDA',
  AJUSTE: 'AJUSTE',
  CONSUMO: 'CONSUMO',
});

/**
 * Entidad `InventoryMovement`. Registra un movimiento de inventario de un
 * insumo (entrada, salida, ajuste o consumo por venta). Es la base de la
 * trazabilidad del stock.
 */
export class InventoryMovement {
  constructor({ id = null, ingredientId, type, quantity, reason = null, userId, createdAt = null }) {
    if (!ingredientId) throw new ValidationError('El movimiento requiere un insumo');
    if (!Object.values(MOVEMENT_TYPES).includes(type)) {
      throw new ValidationError(`Tipo de movimiento invalido: ${type}`);
    }
    if (!Number.isFinite(Number(quantity))) {
      throw new ValidationError('Cantidad invalida en el movimiento');
    }
    if (!userId) throw new ValidationError('El movimiento requiere un usuario');
    this.id = id;
    this.ingredientId = ingredientId;
    this.type = type;
    this.quantity = round3(Number(quantity));
    this.reason = reason ? String(reason).trim() : null;
    this.userId = userId;
    this.createdAt = createdAt;
  }
}
