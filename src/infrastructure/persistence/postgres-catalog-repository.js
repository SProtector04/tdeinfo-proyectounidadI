import { CatalogRepository } from '../../domain/repositories/catalog-repository.js';
import { Product } from '../../domain/entities/product.js';
import { Ingredient } from '../../domain/entities/ingredient.js';
import { Money } from '../../domain/value-objects/money.js';

export class PostgresCatalogRepository extends CatalogRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  async #attachRecipe(products) {
    if (products.length === 0) return products;
    const rows = await this.db.query(
      `SELECT product_id, ingredient_id, quantity
       FROM product_ingredients
       WHERE product_id = ANY($1::int[])`,
      [products.map((p) => p.id)],
    );

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

  async listProducts() {
    const rows = await this.db.query('SELECT * FROM products WHERE active = 1 ORDER BY name');
    return this.#attachRecipe(rows.map((r) => this.#toProduct(r)));
  }

  async findProductById(id) {
    const rows = await this.db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (rows.length === 0) return null;
    return (await this.#attachRecipe([this.#toProduct(rows[0])]))[0];
  }

  async findProductsByIds(ids) {
    if (!ids || ids.length === 0) return [];
    const rows = await this.db.query('SELECT * FROM products WHERE id = ANY($1::int[])', [ids]);
    return this.#attachRecipe(rows.map((r) => this.#toProduct(r)));
  }

  async createProduct({ name, category, priceCents, recipe }) {
    const created = await this.db.query(
      'INSERT INTO products (name, category, price_cents) VALUES ($1, $2, $3) RETURNING id',
      [name, category, priceCents],
    );
    const productId = created[0].id;

    if (recipe && recipe.length > 0) {
      for (const r of recipe) {
        await this.db.query(
          'INSERT INTO product_ingredients (product_id, ingredient_id, quantity) VALUES ($1, $2, $3)',
          [productId, r.ingredientId, r.quantity],
        );
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

  async listIngredients() {
    const rows = await this.db.query('SELECT * FROM ingredients WHERE active = 1 ORDER BY name');
    return rows.map((r) => this.#toIngredient(r));
  }

  async findIngredientById(id) {
    const rows = await this.db.query('SELECT * FROM ingredients WHERE id = $1', [id]);
    return rows.length ? this.#toIngredient(rows[0]) : null;
  }

  async findIngredientsByIds(ids) {
    if (!ids || ids.length === 0) return [];
    const rows = await this.db.query('SELECT * FROM ingredients WHERE id = ANY($1::int[])', [ids]);
    return rows.map((r) => this.#toIngredient(r));
  }

  async createIngredient({ name, unit, stock, minStock, costCents }) {
    const created = await this.db.query(
      'INSERT INTO ingredients (name, unit, stock, min_stock, cost_cents) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name, unit, stock, minStock, costCents],
    );
    return created[0].id;
  }

  async updateIngredientStock(id, newStock) {
    await this.db.query('UPDATE ingredients SET stock = $1 WHERE id = $2', [newStock, id]);
  }
}
