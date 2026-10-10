import { ValidationError, assertNonNegative } from '../errors.js';
import { Money } from '../value-objects/money.js';
import { round3 } from '../units.js';

/**
 * Entidad `Ingredient` (insumo). Es la materia prima (queso, tortilla, crema,
 * cebolla...) que se consume al vender los productos del menu.
 */
export class Ingredient {
  constructor({
    id = null,
    name,
    unit,
    stock = 0,
    minStock = 0,
    cost = 0,
    active = true,
  }) {
    if (!name || !String(name).trim()) {
      throw new ValidationError('El nombre del insumo es obligatorio');
    }
    if (!unit || !String(unit).trim()) {
      throw new ValidationError('La unidad de medida es obligatoria');
    }
    const costMoney = cost instanceof Money ? cost : new Money(cost);

    this.id = id;
    this.name = String(name).trim();
    this.unit = String(unit).trim();
    this.stock = round3(assertNonNegative(stock, 'stock'));
    this.minStock = round3(assertNonNegative(minStock, 'minStock'));
    this.cost = costMoney;
    this.active = Boolean(active);
  }

  /** Regla de negocio: un insumo esta "bajo" cuando stock <= minimo. */
  isLowStock() {
    return this.stock <= this.minStock;
  }

  /** Nivel de severidad para la alerta asociada. */
  severity() {
    if (this.stock <= 0) return 'CRITICAL';
    if (this.isLowStock()) return 'WARNING';
    return null;
  }
}
