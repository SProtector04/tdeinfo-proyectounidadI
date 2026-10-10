import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Crea (o abre) la conexion a SQLite.
 *
 * - `WAL` permite lecturas concurrentes con una unica escritora (conveniente
 *   porque el contenedor SQLite y la app comparten el mismo archivo).
 * - `foreign_keys = ON` garantiza integridad referencial.
 */
export function createConnection(databasePath) {
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }
  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

/**
 * Ejecuta un bloque dentro de una transaccion SQLite. Se inyecta en los casos
 * de uso que requieren atomicidad (ventas, ajustes).
 */
export function makeTransaction(db) {
  return (fn) => db.transaction(fn)();
}
