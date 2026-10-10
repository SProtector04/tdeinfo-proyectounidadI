import { ValidationError, assertPositive } from '../errors.js';
import { Money } from '../value-objects/money.js';
import { round3 } from '../units.js';

export const SALE_STATUS = Object.freeze({
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

/**
 * Entidad `SaleItem`. Linea de una venta (un producto y su cantidad).
 */
export class SaleItem {
  constructor({ productId, quantity, unitPriceCents, subtotalCents }) {
    if (!productId) throw new ValidationError('El item requiere un producto');
    this.productId = productId;
    this.quantity = round3(assertPositive(quantity, 'cantidad'));
    this.unitPriceCents = new Money(unitPriceCents).cents;
    this.subtotalCents = new Money(subtotalCents).cents;
  }
}

/**
 * Entidad `Sale`. Agrega una venta con sus items y su total.
 */
export class Sale {
  constructor({ id = null, userId, customerName = null, totalCents, status = SALE_STATUS.COMPLETED, items = [], createdAt = null }) {
    if (!userId) throw new ValidationError('La venta requiere un usuario');
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('La venta debe tener al menos un item');
    }
    this.id = id;
    this.userId = userId;
    this.customerName = customerName ? String(customerName).trim() : null;
    this.totalCents = new Money(totalCents).cents;
    this.status = status;
    this.items = items.map((i) => (i instanceof SaleItem ? i : new SaleItem(i)));
    this.createdAt = createdAt;
  }
}
