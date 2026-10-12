import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RegisterSale } from '../../src/application/use-cases/sales.js';
import { StockService } from '../../src/domain/services/stock-service.js';
import { AlertService } from '../../src/domain/services/alert-service.js';
import { ValidationError, InsufficientStockError, NotFoundError } from '../../src/domain/errors.js';
import {
  makeFakeCatalogRepository,
  makeFakeSalesRepository,
  makeFakeInventoryRepository,
  makeProduct,
  makeIngredient,
  fakeTransaction,
} from '../helpers/fake-repos.js';

function makeSut({ stock = 10, minStock = 1, avgByIngredient = [] } = {}) {
  const catalogRepository = makeFakeCatalogRepository({
    products: [
      makeProduct({
        id: 1,
        name: 'Quesillo sencillo',
        priceCents: 6000,
        recipe: [
          { ingredientId: 1, quantity: 0.12 },
          { ingredientId: 2, quantity: 1 },
        ],
      }),
    ],
    ingredients: [
      makeIngredient({ id: 1, name: 'Queso fresco', stock, minStock }),
      makeIngredient({ id: 2, name: 'Tortilla', unit: 'unidad', stock: 200, minStock: 60 }),
    ],
  });
  const salesRepository = makeFakeSalesRepository();
  const inventoryRepository = makeFakeInventoryRepository({ avgByIngredient });

  const registerSale = new RegisterSale({
    catalogRepository,
    salesRepository,
    inventoryRepository,
    stockService: new StockService(),
    alertService: new AlertService(),
    transaction: fakeTransaction,
  });

  return { registerSale, catalogRepository, salesRepository, inventoryRepository };
}

function anyWrites({ catalogRepository, salesRepository, inventoryRepository }) {
  return (
    catalogRepository.calls.updateIngredientStock.length +
    salesRepository.calls.create.length +
    salesRepository.calls.createItems.length +
    inventoryRepository.calls.addMovement.length +
    inventoryRepository.calls.createAlert.length
  );
}

test('RegisterSale: venta exitosa descuenta stock, calcula totales y audita', async () => {
  const sut = makeSut({ stock: 10 });
  const result = await sut.registerSale.execute({
    userId: 1,
    customerName: 'Cliente',
    items: [{ productId: 1, quantity: 2 }],
  });

  assert.equal(result.totalCents, 12000);
  assert.ok(result.saleId >= 1);

  // Stock descontado: 2 quesillos = 0.24 kg de queso y 2 tortillas
  const updates = sut.catalogRepository.calls.updateIngredientStock;
  assert.deepEqual(updates, [
    { ingredientId: 1, newStock: 9.76 },
    { ingredientId: 2, newStock: 198 },
  ]);

  // Items registrados con precio unitario
  const items = sut.salesRepository.itemsBySale.get(result.saleId);
  assert.equal(items.length, 1);
  assert.deepEqual(items[0], {
    productId: 1,
    quantity: 2,
    unitPriceCents: 6000,
    subtotalCents: 12000,
  });

  // Movimiento de consumo y auditoria
  assert.equal(sut.inventoryRepository.calls.addMovement.length, 2);
  assert.equal(sut.inventoryRepository.calls.addMovement[0].type, 'CONSUMO');
  assert.equal(sut.inventoryRepository.calls.addAudit[0].action, 'SALE');
});

test('RegisterSale: genera alerta cuando el stock cae al minimo', async () => {
  // 0.24 kg usado deja el queso en 0.24 <= minimo 0.3 -> alerta
  const sut = makeSut({ stock: 0.48, minStock: 0.3, avgByIngredient: [{ ingredientId: 1, avg: 0.5 }] });
  const result = await sut.registerSale.execute({ userId: 1, items: [{ productId: 1, quantity: 2 }] });

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].severity, 'WARNING');
  assert.match(result.alerts[0].message, /Queso fresco/);
  assert.equal(sut.inventoryRepository.calls.createAlert.length, 1);
});

test('RegisterSale: rechaza por stock insuficiente sin escribir nada', async () => {
  const sut = makeSut({ stock: 0.1 }); // menos que los 0.24 requeridos

  await assert.rejects(
    () => sut.registerSale.execute({ userId: 1, items: [{ productId: 1, quantity: 2 }] }),
    (err) => {
      assert.ok(err instanceof InsufficientStockError);
      assert.match(err.message, /Queso fresco: faltan 0\.14/);
      return true;
    },
  );
  assert.equal(anyWrites(sut), 0);
});

test('RegisterSale: validacion fallida antes de persistir no escribe nada', async () => {
  const sutEmpty = makeSut();
  await assert.rejects(
    () => sutEmpty.registerSale.execute({ userId: 1, items: [] }),
    ValidationError,
  );
  assert.equal(anyWrites(sutEmpty), 0);

  const sutBadQty = makeSut();
  await assert.rejects(
    () => sutBadQty.registerSale.execute({ userId: 1, items: [{ productId: 1, quantity: 0 }] }),
    ValidationError,
  );
  assert.equal(anyWrites(sutBadQty), 0);
});

test('RegisterSale: producto inexistente lanza NotFoundError sin escribir', async () => {
  const sut = makeSut();
  await assert.rejects(
    () => sut.registerSale.execute({ userId: 1, items: [{ productId: 99, quantity: 1 }] }),
    NotFoundError,
  );
  assert.equal(anyWrites(sut), 0);
});
