import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { loadConfig } from '../../src/config/env.js';
import { buildApp } from '../../src/app.js';

/**
 * Recorrido funcional contra PostgreSQL real (compose `db`):
 * login -> registrar venta -> verla en el tablero + comprobacion de autorizacion.
 * Se omite si la base de datos no esta disponible.
 */

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://cdq:cdq@localhost:5432/cdq';

let dbAvailable = false;
let server;
let base;

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function login(username, password) {
  const { status, data } = await api('/api/auth/login', { method: 'POST', body: { username, password } });
  assert.equal(status, 200);
  return data.token;
}

before(async () => {
  const probe = new pg.Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 2000 });
  try {
    await probe.connect();
    await probe.query('SELECT 1');
    dbAvailable = true;
  } catch {
    dbAvailable = false;
    console.warn('test:int omitido: PostgreSQL no disponible en ' + DATABASE_URL);
  } finally {
    await probe.end().catch(() => {});
  }

  if (dbAvailable) {
    const config = loadConfig({ ...process.env, DATABASE_URL });
    const { app } = await buildApp(config);
    server = app.listen(0);
    const { port } = server.address();
    base = `http://127.0.0.1:${port}`;
  }
});

after(() => {
  server?.close();
});

test('sin token la API responde 401', (t) => {
  if (!dbAvailable) return t.skip('PostgreSQL no disponible');
  return api('/api/sales').then(({ status }) => assert.equal(status, 401));
});

test('flujo completo: login -> venta -> visible en tablero y listado', async (t) => {
  if (!dbAvailable) return t.skip('PostgreSQL no disponible');

  const adminToken = await login('admin', 'admin123');

  // Producto sin receta: no consume inventario, el test es repetible
  const products = await api('/api/products', { token: adminToken });
  assert.equal(products.status, 200);
  const fresco = products.data.find((p) => p.name === 'Fresco natural');
  assert.ok(fresco, 'el seed debe incluir "Fresco natural"');

  const sale = await api('/api/sales', {
    method: 'POST',
    token: adminToken,
    body: { customerName: 'Cliente test', items: [{ productId: fresco.id, quantity: 3 }] },
  });
  assert.equal(sale.status, 201);
  assert.equal(sale.data.totalCents, 3 * fresco.priceCents);
  assert.ok(sale.data.saleId >= 1);

  const sales = await api('/api/sales', { token: adminToken });
  const registered = sales.data.find((s) => s.id === sale.data.saleId);
  assert.ok(registered, 'la venta registrada aparece en el listado');
  assert.equal(registered.totalCents, 3 * fresco.priceCents);
  assert.equal(registered.items[0].productName, 'Fresco natural');

  const dashboard = await api('/api/dashboard', { token: adminToken });
  assert.equal(dashboard.status, 200);
  assert.ok(dashboard.data.summary.count >= 1, 'el tablero cuenta ventas de la ventana');
  assert.ok(dashboard.data.summary.revenueCents >= 3 * fresco.priceCents);
  assert.ok(Array.isArray(dashboard.data.revenueSeries));
  assert.ok(Array.isArray(dashboard.data.topProducts));
  assert.ok(Array.isArray(dashboard.data.inventory));
  assert.ok('changePercent' in dashboard.data, 'expone la variacion vs periodo anterior');

  const today = await api('/api/dashboard?days=1', { token: adminToken });
  assert.equal(today.status, 200);
  assert.equal(today.data.days, 1);

  const bad = await api('/api/dashboard?days=5', { token: adminToken });
  assert.equal(bad.status, 400, 'solo se aceptan periodos 1, 7 o 30');
});

test('autorizacion: cajero no puede consultar usuarios (403)', async (t) => {
  if (!dbAvailable) return t.skip('PostgreSQL no disponible');

  const cajeroToken = await login('cajero', 'cajero123');
  const { status } = await api('/api/users', { token: cajeroToken });
  assert.equal(status, 403);
});

test('validacion: payloads malformados responden 400', async (t) => {
  if (!dbAvailable) return t.skip('PostgreSQL no disponible');

  const noPassword = await api('/api/auth/login', { method: 'POST', body: { username: 'admin' } });
  assert.equal(noPassword.status, 400);
  assert.equal(noPassword.data.error.code, 'VALIDATION_ERROR');

  const adminToken = await login('admin', 'admin123');
  const badQty = await api('/api/sales', {
    method: 'POST',
    token: adminToken,
    body: { items: [{ productId: 1, quantity: 0 }] },
  });
  assert.equal(badQty.status, 400);
  assert.equal(badQty.data.error.code, 'VALIDATION_ERROR');

  const badProduct = await api('/api/sales', {
    method: 'POST',
    token: adminToken,
    body: { items: [{ productId: 'x', quantity: 1 }] },
  });
  assert.equal(badProduct.status, 400);
});

test('indisponibilidad: con la BD caida el arranque falla explicitamente', async (t) => {
  if (!dbAvailable) return t.skip('PostgreSQL no disponible');

  // `buildApp` no deja un servidor semi-funcional con el pool roto: si la BD
  // no responde, el arranque rechaza. En Docker esto se traduce en que el
  // contenedor `app` espera a que el healthcheck de `db` lo marque sano
  // (depends_on: service_healthy) antes de levantar.
  const badUrl = 'postgresql://cdq:cdq@127.0.0.1:59999/cdq';
  await assert.rejects(
    () => buildApp(loadConfig({ ...process.env, DATABASE_URL: badUrl })),
    (err) => {
      assert.equal(err.code, 'ECONNREFUSED');
      return true;
    },
  );
});
