import { Product } from '../../domain/entities/product.js';
import { Ingredient } from '../../domain/entities/ingredient.js';

export class ListProducts {
  constructor({ catalogRepository }) {
    this.catalogRepository = catalogRepository;
  }

  execute() {
    return this.catalogRepository.listProducts();
  }
}

export class CreateProduct {
  constructor({ catalogRepository, inventoryRepository, transaction }) {
    this.catalogRepository = catalogRepository;
    this.inventoryRepository = inventoryRepository;
    this.transaction = transaction;
  }

  execute({ name, category, priceCents, recipe = [], userId }) {
    const product = new Product({ name, category, price: priceCents, recipe });
    let id;
    this.transaction(() => {
      id = this.catalogRepository.createProduct({
        name: product.name,
        category: product.category,
        priceCents: product.price.cents,
        recipe: product.recipe,
      });
      this.inventoryRepository.addAudit({
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

  execute() {
    return this.catalogRepository.listIngredients();
  }
}

export class CreateIngredient {
  constructor({ catalogRepository, inventoryRepository, transaction }) {
    this.catalogRepository = catalogRepository;
    this.inventoryRepository = inventoryRepository;
    this.transaction = transaction;
  }

  execute({ name, unit, stock, minStock, costCents, userId }) {
    const ingredient = new Ingredient({ name, unit, stock, minStock, cost: costCents });
    let id;
    this.transaction(() => {
      id = this.catalogRepository.createIngredient({
        name: ingredient.name,
        unit: ingredient.unit,
        stock: ingredient.stock,
        minStock: ingredient.minStock,
        costCents: ingredient.cost.cents,
      });
      this.inventoryRepository.addAudit({
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
