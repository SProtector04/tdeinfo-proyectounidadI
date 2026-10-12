import {
  InsufficientStockError,
  NotFoundError,
  ValidationError,
  assertPositive,
} from '../../domain/errors.js';
import { SaleItem, SALE_STATUS } from '../../domain/entities/sale.js';
import { Ingredient } from '../../domain/entities/ingredient.js';
import { Money } from '../../domain/value-objects/money.js';
import { round3 } from '../../domain/units.js';

/**
 * Caso de uso `RegisterSale`.
 *
 * Orquesta la regla de negocio central: vender productos descontando insumos
 * del inventario, validar stock, calcular totales y generar alertas de stock
 * bajo. Toda la logica de negocio vive aqui y en los servicios de dominio; la
 * persistencia se ejecuta atomicamente mediante `transaction`.
 */
export class RegisterSale {
  constructor({ catalogRepository, salesRepository, inventoryRepository, stockService, alertService, transaction }) {
    this.catalogRepository = catalogRepository;
    this.salesRepository = salesRepository;
    this.inventoryRepository = inventoryRepository;
    this.stockService = stockService;
    this.alertService = alertService;
    this.transaction = transaction;
  }

  async execute({ userId, customerName = null, items }) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('La venta debe tener al menos un producto');
    }

    const normalized = items.map((i) => ({
      productId: i.productId,
      quantity: assertPositive(i.quantity, 'cantidad'),
    }));

    // Cargar productos (con receta) e insumos involucrados.
    const productIds = [...new Set(normalized.map((i) => i.productId))];
    const products = await this.catalogRepository.findProductsByIds(productIds);
    const productsById = new Map(products.map((p) => [p.id, p]));
    for (const id of productIds) {
      if (!productsById.has(id)) throw new NotFoundError(`Producto no encontrado: #${id}`);
    }

    const ingredientIds = [...new Set(products.flatMap((p) => p.recipe.map((r) => r.ingredientId)))];
    const ingredients = await this.catalogRepository.findIngredientsByIds(ingredientIds);
    const ingredientsById = new Map(ingredients.map((i) => [i.id, i]));

    // Calcular consumo total y verificar stock.
    const consumption = new Map();
    const missing = [];
    for (const { productId, quantity } of normalized) {
      const product = productsById.get(productId);
      const plan = this.stockService.planConsumption(product, ingredientsById, quantity);
      for (const [ingId, qty] of plan.consumption.entries()) {
        consumption.set(ingId, round3((consumption.get(ingId) ?? 0) + qty));
      }
      missing.push(...plan.missing);
    }

    if (missing.length > 0) {
      const detail = missing
        .map((m) => `${m.name}: faltan ${round3(m.required - m.available)} (requerido ${m.required}, hay ${m.available})`)
        .join('; ');
      throw new InsufficientStockError(`Stock insuficiente para completar la venta. ${detail}`);
    }

    // Calcular totales.
    const saleItems = normalized.map(({ productId, quantity }) => {
      const product = productsById.get(productId);
      const unitPriceCents = product.price.cents;
      const subtotalCents = product.price.multiply(quantity).cents;
      return new SaleItem({ productId, quantity, unitPriceCents, subtotalCents });
    });
    const totalCents = saleItems.reduce((acc, i) => acc + i.subtotalCents, 0);

    // Calcular stock resultante y alertas solo para insumos afectados.
    const avgDaily = new Map(
      (await this.inventoryRepository.avgConsumptionByIngredient(7)).map((r) => [r.ingredientId, r.avg]),
    );
    const postStock = new Map();
    const alerts = [];
    for (const [ingredientId, used] of consumption.entries()) {
      const ing = ingredientsById.get(ingredientId);
      const newStock = round3(ing.stock - used);
      postStock.set(ingredientId, newStock);
      if (newStock <= ing.minStock) {
        const snapshot = new Ingredient({
          id: ing.id,
          name: ing.name,
          unit: ing.unit,
          stock: newStock,
          minStock: ing.minStock,
          cost: ing.cost,
        });
        alerts.push(...this.alertService.evaluateLowStock([snapshot], avgDaily));
      }
    }

    // Persistir atomicamente.
    let saleId;
    await this.transaction(async () => {
      saleId = await this.salesRepository.create({
        userId,
        customerName,
        totalCents,
        status: SALE_STATUS.COMPLETED,
      });
      await this.salesRepository.createItems(
        saleId,
        saleItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPriceCents: i.unitPriceCents,
          subtotalCents: i.subtotalCents,
        })),
      );
      for (const [ingredientId, used] of consumption.entries()) {
        await this.catalogRepository.updateIngredientStock(ingredientId, postStock.get(ingredientId));
        await this.inventoryRepository.addMovement({
          ingredientId,
          type: 'CONSUMO',
          quantity: used,
          reason: `Venta #${saleId}`,
          userId,
        });
      }
      for (const alert of alerts) {
        await this.inventoryRepository.createAlert({
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
        });
      }
      await this.inventoryRepository.addAudit({
        userId,
        action: 'SALE',
        entity: 'sale',
        entityId: saleId,
        result: `Venta registrada por ${new Money(totalCents).format()}`,
      });
    });

    return { saleId, totalCents, alerts };
  }
}

/**
 * Caso de uso `ListSales`. Recupera las ultimas ventas con sus items.
 */
export class ListSales {
  constructor({ salesRepository }) {
    this.salesRepository = salesRepository;
  }

  async execute({ limit = 50, offset = 0 } = {}) {
    return this.salesRepository.list({ limit, offset });
  }
}
