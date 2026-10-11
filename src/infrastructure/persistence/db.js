import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Crea un pool de conexiones a PostgreSQL y expone un facade `db.query` que
 * enruta automaticamente al cliente de la transaccion activa (si la hay) o al
 * pool (fuera de transaccion).
 *
 * `AsyncLocalStorage` guarda el cliente dedicado durante una transaccion para
 * que los repositorios (que reciben `db`) usen siempre la misma conexion.
 */
export function createConnection(connectionString) {
  const pool = new pg.Pool({ connectionString });
  const als = new AsyncLocalStorage();

  async function query(text, params = []) {
    const client = als.getStore();
    const result = client
      ? await client.query(text, params)
      : await pool.query(text, params);
    return result.rows;
  }

  return {
    pool,
    query,
    _runInTransaction: (client, fn) => als.run(client, fn),
  };
}

/**
 * Ejecuta un bloque dentro de una transaccion. Se inyecta en los casos de uso
 * que requieren atomicidad (ventas, ajustes, creacion de entidades).
 */
export function makeTransaction(db) {
  return async (fn) => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await db._runInTransaction(client, fn);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  };
}
