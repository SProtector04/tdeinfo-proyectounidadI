import { ROLES } from '../../domain/entities/user.js';

/**
 * Datos de prueba (sinteticos) que representan el proceso real del
 * Centro del Quesillo. No contienen datos personales reales.
 *
 * El sembrado es idempotente: solo inserta cuando la tabla esta vacia.
 */

const INGREDIENTS = [
  { name: 'Queso fresco', unit: 'kg', stock: 10, minStock: 3, costCents: 9000 },
  { name: 'Tortilla', unit: 'unidad', stock: 200, minStock: 60, costCents: 300 },
  { name: 'Crema', unit: 'litro', stock: 5, minStock: 1.5, costCents: 7000 },
  { name: 'Cebolla encurtida', unit: 'kg', stock: 4, minStock: 1, costCents: 3000 },
  { name: 'Vinagre', unit: 'litro', stock: 2, minStock: 1, costCents: 2500 },
  { name: 'Chile', unit: 'kg', stock: 1, minStock: 0.3, costCents: 4000 },
  { name: 'Tiste (polvo)', unit: 'kg', stock: 3, minStock: 1, costCents: 6000 },
  { name: 'Cacao', unit: 'kg', stock: 2, minStock: 0.5, costCents: 12000 },
];

const PRODUCTS = [
  { name: 'Quesillo sencillo', category: 'Quesillo', priceCents: 6000, recipe: { 'Queso fresco': 0.12, 'Tortilla': 1, 'Crema': 0.02, 'Cebolla encurtida': 0.03, 'Vinagre': 0.01 } },
  { name: 'Quesillo con crema', category: 'Quesillo', priceCents: 7500, recipe: { 'Queso fresco': 0.15, 'Tortilla': 1, 'Crema': 0.04, 'Cebolla encurtida': 0.03, 'Vinagre': 0.01 } },
  { name: 'Quesillo doble', category: 'Quesillo', priceCents: 9000, recipe: { 'Queso fresco': 0.22, 'Tortilla': 1, 'Crema': 0.04, 'Cebolla encurtida': 0.03, 'Vinagre': 0.01 } },
  { name: 'Tiste', category: 'Bebida', priceCents: 3000, recipe: { 'Tiste (polvo)': 0.05, 'Cacao': 0.01 } },
  { name: 'Cacao', category: 'Bebida', priceCents: 3500, recipe: { 'Cacao': 0.05 } },
  { name: 'Fresco natural', category: 'Bebida', priceCents: 2500, recipe: {} },
];

export function seedDatabase(db, { passwordService, config }) {
  seedUsers(db, { passwordService, config });
  seedCatalog(db);
}

function seedUsers(db, { passwordService, config }) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (count > 0) return;

  const insert = db.prepare(
    'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)',
  );

  insert.run(
    config.admin.name,
    config.admin.username,
    passwordService.hash(config.admin.password),
    ROLES.ADMIN,
  );
  insert.run(
    config.cajero.name,
    config.cajero.username,
    passwordService.hash(config.cajero.password),
    ROLES.CAJERO,
  );
}

function seedCatalog(db) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM ingredients').get().n;
  if (count > 0) return;

  const insertIngredient = db.prepare(
    'INSERT INTO ingredients (name, unit, stock, min_stock, cost_cents) VALUES (?, ?, ?, ?, ?)',
  );
  const insertProduct = db.prepare(
    'INSERT INTO products (name, category, price_cents) VALUES (?, ?, ?)',
  );
  const insertRecipe = db.prepare(
    'INSERT INTO product_ingredients (product_id, ingredient_id, quantity) VALUES (?, ?, ?)',
  );

  const ingredientIds = {};
  for (const ing of INGREDIENTS) {
    const info = insertIngredient.run(ing.name, ing.unit, ing.stock, ing.minStock, ing.costCents);
    ingredientIds[ing.name] = info.lastInsertRowid;
  }

  for (const prod of PRODUCTS) {
    const info = insertProduct.run(prod.name, prod.category, prod.priceCents);
    for (const [ingName, quantity] of Object.entries(prod.recipe)) {
      insertRecipe.run(info.lastInsertRowid, ingredientIds[ingName], quantity);
    }
  }
}
