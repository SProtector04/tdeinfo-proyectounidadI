import { CatalogRepository } from '../../domain/repositories/catalog-repository.js';
import { Product } from '../../domain/entities/product.js';
import { Ingredient } from '../../domain/entities/ingredient.js';
import { Money } from '../../domain/value-objects/money.js';

export class SqliteCatalogRepository extends CatalogRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  #attachRecipe(products) {
    if (products.length === 0) return products;
    const placeholders = products.map(() => '?').join(',');
    const rows = this.db
      .prepare(
        `SELECT product_id, ingredient_id, quantity
         FROM product_ingredients
         WHERE product_id IN (${placeholders})`,
      )
      .all(...products.map((p) => p.id));

    const recipeByProduct = new Map();
    for (const r of rows) {
      if (!recipeByProduct.has(r.product_id)) recipeByProduct.set(r.product_id, []);
      recipeByProduct.get(r.product_id).push({ ingredientId: r.ingredient_id, quantity: r.quantity });
    }
    return products.map((p) => ({ ...p, recipe: recipeByProduct.get(p.id) ?? [] }));
  }

  #toProduct(row) {
    return new Product({
      id: row.id,
      name: row.name,
      category: row.category,
      price: new Money(row.price_cents),
      active: Boolean(row.active),
    });
  }

  listProducts() {
    const rows = this.db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY name').all();
    return this.#attachRecipe(rows.map((r) => this.#toProduct(r)));
  }

  findProductById(id) {
    const row = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!row) return null;
    return this.#attachRecipe([this.#toProduct(row)])[0];
  }

  findProductsByIds(ids) {
    if (!ids || ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    const rows = this.db
      .prepare(`SELECT * FROM products WHERE id IN (${placeholders})`)
      .all(...ids);
    return this.#attachRecipe(rows.map((r) => this.#toProduct(r)));
  }

  createProduct({ name, category, priceCents, recipe }) {
    const info = this.db
      .prepare('INSERT INTO products (name, category, price_cents) VALUES (?, ?, ?)')
      .run(name, category, priceCents);
    const productId = Number(info.lastInsertRowid);

    if (recipe && recipe.length > 0) {
      const insertRecipe = this.db.prepare(
        'INSERT INTO product_ingredients (product_id, ingredient_id, quantity) VALUES (?, ?, ?)',
      );
      for (const r of recipe) {
        insertRecipe.run(productId, r.ingredientId, r.quantity);
      }
    }
    return productId;
  }

  #toIngredient(row) {
    return new Ingredient({
      id: row.id,
      name: row.name,
      unit: row.unit,
      stock: row.stock,
      minStock: row.min_stock,
      cost: new Money(row.cost_cents),
      active: Boolean(row.active),
    });
  }

  listIngredients() {
    const rows = this.db.prepare('SELECT * FROM ingredients WHERE active = 1 ORDER BY name').all();
    return rows.map((r) => this.#toIngredient(r));
  }

  findIngredientById(id) {
    const row = this.db.prepare('SELECT * FROM ingredients WHERE id = ?').get(id);
    return row ? this.#toIngredient(row) : null;
  }

  findIngredientsByIds(ids) {
    if (!ids || ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    const rows = this.db
      .prepare(`SELECT * FROM ingredients WHERE id IN (${placeholders})`)
      .all(...ids);
    return rows.map((r) => this.#toIngredient(r));
  }

  createIngredient({ name, unit, stock, minStock, costCents }) {
    const info = this.db
      .prepare('INSERT INTO ingredients (name, unit, stock, min_stock, cost_cents) VALUES (?, ?, ?, ?, ?)')
      .run(name, unit, stock, minStock, costCents);
    return Number(info.lastInsertRowid);
  }

  updateIngredientStock(id, newStock) {
    this.db.prepare('UPDATE ingredients SET stock = ? WHERE id = ?').run(newStock, id);
  }
}
