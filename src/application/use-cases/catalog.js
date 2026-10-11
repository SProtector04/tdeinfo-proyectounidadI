import { Product } from '../../domain/entities/product.js';
import { Ingredient } from '../../domain/entities/ingredient.js';

export class ListProducts {
  constructor({ catalogRepository }) {
    this.catalogRepository = catalogRepository;
  }

  async execute() {
    return this.catalogRepository.listProducts();
  }
}

export class CreateProduct {
  constructor({ catalogRepository, inventoryRepository, transaction }) {
    this.catalogRepository = catalogRepository;
    this.inventoryRepository = inventoryRepository;
    this.transaction = transaction;
  }

  async execute({ name, category, priceCents, recipe = [], userId }) {
    const product = new Product({ name, category, price: priceCents, recipe });
    let id;
    await this.transaction(async () => {
      id = await this.catalogRepository.createProduct({
        name: product.name,
        category: product.category,
        priceCents: product.price.cents,
        recipe: product.recipe,
      });
      await this.inventoryRepository.addAudit({
        userId,
        action: 'CREATE',
        entity: 'product',
        entityId: id,
        result: `Producto "${product.name}" creado`,
      });
    });
    return { id };
  }
}

export class ListIngredients {
  constructor({ catalogRepository }) {
    this.catalogRepository = catalogRepository;
  }

  async execute() {
    return this.catalogRepository.listIngredients();
  }
}

export class CreateIngredient {
  constructor({ catalogRepository, inventoryRepository, transaction }) {
    this.catalogRepository = catalogRepository;
    this.inventoryRepository = inventoryRepository;
    this.transaction = transaction;
  }

  async execute({ name, unit, stock, minStock, costCents, userId }) {
    const ingredient = new Ingredient({ name, unit, stock, minStock, cost: costCents });
    let id;
    await this.transaction(async () => {
      id = await this.catalogRepository.createIngredient({
        name: ingredient.name,
        unit: ingredient.unit,
        stock: ingredient.stock,
        minStock: ingredient.minStock,
        costCents: ingredient.cost.cents,
      });
      await this.inventoryRepository.addAudit({
        userId,
        action: 'CREATE',
        entity: 'ingredient',
        entityId: id,
        result: `Insumo "${ingredient.name}" creado`,
      });
    });
    return { id };
  }
}
