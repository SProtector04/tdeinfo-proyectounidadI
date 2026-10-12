import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { createConnection, makeTransaction } from '../../src/infrastructure/persistence/db.js';

/**
 * Comprobacion de rollback contra PostgreSQL real: una transaccion abortada
 * no deja escrituras parciales. (Los fakes no pueden demostrar esta garantia.)
 * Se omite si la base de datos no esta disponible.
 */

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://cdq:cdq@localhost:5432/cdq';

let db;
let available = false;
let userId;

before(async () => {
  const probe = new pg.Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 2000 });
  try {
    await probe.connect();
    db = createConnection(DATABASE_URL);
    const users = await db.query('SELECT id FROM users ORDER BY id LIMIT 1');
    if (users.length > 0) {
      userId = users[0].id;
      available = true;
    }
  } catch {
    available = false;
    console.warn('test:int (rollback) omitido: PostgreSQL no disponible');
  } finally {
    await probe.end().catch(() => {});
  }
});

after(async () => {
  await db?.pool.end().catch(() => {});
});

async function salesCount() {
  const rows = await db.query('SELECT COUNT(*)::int AS n FROM sales');
  return rows[0].n;
}

test('transaccion abortada: no quedan escrituras parciales', async (t) => {
  if (!available) return t.skip('PostgreSQL no disponible');

  const countBefore = await salesCount();

  await assert.rejects(
    () =>
      makeTransaction(db)(async () => {
        await db.query(
          'INSERT INTO sales (user_id, customer_name, total_cents) VALUES ($1, $2, $3)',
          [userId, 'rollback-test', 123],
        );
        throw new Error('fallo simulado dentro de la transaccion');
      }),
    /fallo simulado/,
  );

  assert.equal(await salesCount(), countBefore, 'el INSERT se revirtio');
});

test('transaccion confirmada: la escritura persiste y se limpia', async (t) => {
  if (!available) return t.skip('PostgreSQL no disponible');

  const countBefore = await salesCount();

  const saleId = await makeTransaction(db)(async () => {
    const rows = await db.query(
      'INSERT INTO sales (user_id, customer_name, total_cents) VALUES ($1, $2, $3) RETURNING id',
      [userId, 'commit-test', 456],
    );
    return rows[0].id;
  });

  assert.equal(await salesCount(), countBefore + 1);
  await db.query('DELETE FROM sales WHERE id = $1', [saleId]);
  assert.equal(await salesCount(), countBefore);
});
