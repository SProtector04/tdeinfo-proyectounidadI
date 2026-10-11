/**
 * Esquema de base de datos (DDL) para PostgreSQL. Unica fuente de verdad del
 * modelo relacional. Todas las sentencias son idempotentes (`IF NOT EXISTS`).
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT        NOT NULL,
  username      TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL CHECK (role IN ('ADMIN','CAJERO')),
  active        INTEGER     NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT        PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingredients (
  id         SERIAL           PRIMARY KEY,
  name       TEXT             NOT NULL,
  unit       TEXT             NOT NULL,
  stock      DOUBLE PRECISION NOT NULL DEFAULT 0,
  min_stock  DOUBLE PRECISION NOT NULL DEFAULT 0,
  cost_cents INTEGER          NOT NULL DEFAULT 0,
  active     INTEGER          NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS products (
  id          SERIAL  PRIMARY KEY,
  name        TEXT    NOT NULL,
  category    TEXT    NOT NULL,
  price_cents INTEGER NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS product_ingredients (
  product_id    INTEGER          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id INTEGER          NOT NULL REFERENCES ingredients(id),
  quantity      DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (product_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS sales (
  id            SERIAL      PRIMARY KEY,
  user_id       INTEGER     NOT NULL REFERENCES users(id),
  customer_name TEXT,
  total_cents   INTEGER     NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'COMPLETED',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id               SERIAL           PRIMARY KEY,
  sale_id          INTEGER          NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id       INTEGER          NOT NULL REFERENCES products(id),
  quantity         DOUBLE PRECISION NOT NULL,
  unit_price_cents INTEGER          NOT NULL,
  subtotal_cents   INTEGER          NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id            SERIAL           PRIMARY KEY,
  ingredient_id INTEGER          NOT NULL REFERENCES ingredients(id),
  type          TEXT             NOT NULL CHECK (type IN ('ENTRADA','SALIDA','AJUSTE','CONSUMO')),
  quantity      DOUBLE PRECISION NOT NULL,
  reason        TEXT,
  user_id       INTEGER          NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id          SERIAL      PRIMARY KEY,
  type        TEXT        NOT NULL,
  severity    TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         SERIAL      PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users(id),
  action     TEXT        NOT NULL,
  entity     TEXT        NOT NULL,
  entity_id  INTEGER,
  result     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export async function ensureSchema(db) {
  await db.query(SCHEMA_SQL);
}
