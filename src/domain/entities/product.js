import { ValidationError, assertNonNegative } from '../errors.js';
import { Money } from '../value-objects/money.js';

/**
 * Entidad `Product`. Es un item del menu que se vende (quesillo, tiste...).
 * Su `recipe` indica que insumos consume y en que cantidad, lo que permite
 * descontar automaticamente el inventario al vender.
 */
export class Product {
  constructor({ id = null, name, category, price, active = true, recipe = [] }) {
    if (!name || !String(name).trim()) {
      throw new ValidationError('El nombre del producto es obligatorio');
    }
    if (!category || !String(category).trim()) {
      throw new ValidationError('La categoria es obligatoria');
    }
    const priceMoney = price instanceof Money ? price : new Money(price);
    if (priceMoney.cents < 0) {
      throw new ValidationError('El precio no puede ser negativo');
    }
    if (!Array.isArray(recipe)) {
      throw new ValidationError('La receta debe ser una lista');
    }
    for (const item of recipe) {
      if (!item.ingredientId) {
        throw new ValidationError(`Receta de "${name}" tiene un ingrediente sin id`);
      }
      assertNonNegative(item.quantity, `cantidad en receta de "${name}"`);
    }

    this.id = id;
    this.name = String(name).trim();
    this.category = String(category).trim();
    this.price = priceMoney;
    this.active = Boolean(active);
    this.recipe = recipe.map((r) => ({ ingredientId: r.ingredientId, quantity: r.quantity }));
  }

  /**
   * Indica si el producto consume algun insumo (tiene receta). Los productos
   * sin receta (p. ej. un fresco envasado) no descuentan inventario.
   */
  consumesStock() {
    return this.recipe.length > 0;
  }
}
