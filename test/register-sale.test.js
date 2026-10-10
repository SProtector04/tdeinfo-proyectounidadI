import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createConnection, makeTransaction } from '../src/infrastructure/persistence/db.js';
import { ensureSchema } from '../src/infrastructure/persistence/schema.js';
import { SqliteCatalogRepository } from '../src/infrastructure/persistence/sqlite-catalog-repository.js';
import { SqliteSalesRepository } from '../src/infrastructure/persistence/sqlite-sales-repository.js';
import { SqliteInventoryRepository } from '../src/infrastructure/persistence/sqlite-inventory-repository.js';
import { StockService } from '../src/domain/services/stock-service.js';
import { AlertService } from '../src/domain/services/alert-service.js';
import { RegisterSale } from '../src/application/use-cases/sales.js';
import { InsufficientStockError } from '../src/domain/errors.js';

function setup() {
  const db = createConnection(':memory:');
  ensureSchema(db);
  db.prepare(
    "INSERT INTO users (name, username, password_hash, role) VALUES ('Admin', 'admin', 'x', 'ADMIN')",
  ).run();

  const catalog = new SqliteCatalogRepository(db);
  const sales = new SqliteSalesRepository(db);
  const inventory = new SqliteInventoryRepository(db);

  const quesoId = catalog.createIngredient({
    name: 'Queso fresco', unit: 'kg', stock: 10, minStock: 3, costCents: 9000,
  });
  const tortillaId = catalog.createIngredient({
    name: 'Tortilla', unit: 'unidad', stock: 5, minStock: 2, costCents: 300,
  });
  const productId = catalog.createProduct({
    name: 'Quesillo sencillo',
    category: 'Quesillo',
    priceCents: 6000,
    recipe: [
      { ingredientId: quesoId, quantity: 0.12 },
      { ingredientId: tortillaId, quantity: 1 },
    ],
  });

  const registerSale = new RegisterSale({
    catalogRepository: catalog,
    salesRepository: sales,
    inventoryRepository: inventory,
    stockService: new StockService(),
    alertService: new AlertService(),
    transaction: makeTransaction(db),
  });

  return { db, catalog, sales, inventory, registerSale, userId: 1, productId };
}

test('una venta descuenta stock, registra movimiento y totaliza', () => {
  const { db, catalog, sales, inventory, registerSale, userId, productId } = setup();

  const result = registerSale.execute({
    userId,
    items: [{ productId, quantity: 2 }],
  });

  assert.equal(result.totalCents, 12000);

  const queso = catalog.findIngredientById(1);
  const tortilla = catalog.findIngredientById(2);
  assert.equal(queso.stock, 9.76);
  assert.equal(tortilla.stock, 3);

  const movements = inventory.listMovements({ limit: 100 });
  assert.equal(movements.length, 2);
  assert.ok(movements.every((m) => m.type === 'CONSUMO'));

  const salesList = sales.list({ limit: 10 });
  assert.equal(salesList.length, 1);
  assert.equal(salesList[0].items.length, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM audit_logs').get().n, 1);
});

test('rechaza la venta cuando no hay stock suficiente', () => {
  const { registerSale, userId, productId } = setup();
  assert.throws(
    () => registerSale.execute({ userId, items: [{ productId, quantity: 100 }] }),
    InsufficientStockError,
  );
});

test('genera alerta de stock bajo al cruzar el minimo', () => {
  const { catalog, inventory, registerSale, userId, productId } = setup();
  // Subir el minimo de tortilla para que la venta la deje por debajo.
  catalog.db.prepare('UPDATE ingredients SET min_stock = 4 WHERE id = 2').run();

  const result = registerSale.execute({ userId, items: [{ productId, quantity: 2 }] });

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].type, 'LOW_STOCK');

  const alerts = inventory.listAlerts({ status: 'OPEN' });
  assert.equal(alerts.length, 1);
});
