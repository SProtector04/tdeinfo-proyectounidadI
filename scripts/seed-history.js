/**
 * Poblacion historica de demostracion del Centro del Quesillo.
 *
 * Genera ~3 meses de operacion (90 dias, 7 dias/semana) con ~30 clientes
 * diarios (~2800 ventas). La eleccion de productos se aleatoriza con pesos
 * realistas y la recarga de insumos se modela en tiempos oportunos:
 *   - Reposicion matutina (antes de abrir) cuando el stock cae bajo el
 *     doble del minimo, con resolucion de las alertas que quedaron abiertas.
 *   - Reposicion urgente en el momento de una venta si el stock no alcanza.
 *
 * Uso:
 *   node scripts/seed-history.js             # 90 dias (por defecto)
 *   node scripts/seed-history.js --days=30   # ajustar la ventana
 *
 * Requiere que la base ya tenga usuarios, productos e insumos: arranca la
 * app una vez (docker compose up) para sembrar los datos base. El script
 * REINICIA el historial transaccional (ventas, movimientos, alertas,
 * auditoria) y el stock de insumos a su valor base antes de generar.
 */
import pg from 'pg';
import { loadConfig } from '../src/config/env.js';
import { INGREDIENTS as SEED_INGREDIENTS } from '../src/infrastructure/persistence/seed.js';
import { Money } from '../src/domain/value-objects/money.js';

const round3 = (n) => Math.round(n * 1000) / 1000;
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const chance = (p) => Math.random() < p;

/** Peso relativo por producto: los quesillos venden mas que las bebidas. */
const PRODUCT_WEIGHT = {
  'Quesillo sencillo': 30,
  'Quesillo con crema': 20,
  'Quesillo doble': 15,
  Tiste: 12,
  Cacao: 10,
  'Fresco natural': 13,
};

/** Nombres sinteticos de cliente (no son datos personales reales). */
const CUSTOMERS = [
  null, null, null, null,
  'María', 'José', 'Carlos', 'Ana', 'Luis', 'Marta', 'Pedro', 'Sofía',
  'Juan', 'Elena', 'Miguel', 'Lucía', 'Rosa', 'Francisco', 'Carmen', 'Antonio',
];

function weightedPick(products) {
  const total = products.reduce((acc, p) => acc + (PRODUCT_WEIGHT[p.name] ?? 5), 0);
  let r = Math.random() * total;
  for (const p of products) {
    r -= PRODUCT_WEIGHT[p.name] ?? 5;
    if (r <= 0) return p;
  }
  return products[products.length - 1];
}

/** Hora del dia (UTC, que es la zona de la BD) repartida en un rango. */
function atTime(dayStart, startHour, endHour) {
  const minutes = startHour * 60 + randInt(0, (endHour - startHour) * 60) + randInt(0, 59) / 60;
  return new Date(dayStart.getTime() + Math.round(minutes) * 60000);
}

async function main() {
  const daysArg = process.argv.find((a) => a.startsWith('--days='));
  const days = Number(daysArg?.split('=')[1]) || 90;

  const config = loadConfig();
  const client = new pg.Client({ connectionString: config.databaseUrl });
  await client.connect();
  const q = (text, params) => client.query(text, params);

  const stats = { sales: 0, items: 0, consumptions: 0, restocks: 0, urgentRestocks: 0, alerts: 0, resolved: 0 };

  try {
    const { rows: userRows } = await q('SELECT id, role FROM users ORDER BY id');
    const cajero = userRows.find((u) => u.role === 'CAJERO') ?? userRows[0];
    const admin = userRows.find((u) => u.role === 'ADMIN') ?? userRows[0];
    if (!cajero || !admin) {
      throw new Error('No hay usuarios. Arranca la app una vez para sembrar los datos base.');
    }

    const { rows: products } = await q('SELECT id, name, price_cents FROM products WHERE active = 1');
    const { rows: ingredients } = await q('SELECT id, name, unit, stock, min_stock FROM ingredients WHERE active = 1');
    const { rows: recipeRows } = await q('SELECT product_id, ingredient_id, quantity FROM product_ingredients');
    if (products.length === 0 || ingredients.length === 0) {
      throw new Error('Faltan productos o insumos. Arranca la app una vez para sembrar los datos base.');
    }

    const ingById = new Map(
      ingredients.map((i) => [i.id, { ...i, stock: Number(i.stock), min_stock: Number(i.min_stock) }]),
    );
    const recipeByProduct = new Map();
    for (const r of recipeRows) {
      if (!recipeByProduct.has(r.product_id)) recipeByProduct.set(r.product_id, []);
      recipeByProduct.get(r.product_id).push({ ingredientId: r.ingredient_id, quantity: Number(r.quantity) });
    }

    // Capacidad/base de reposicion: valor de stock del seed.
    const capacity = new Map();
    for (const base of SEED_INGREDIENTS) {
      const real = ingredients.find((i) => i.name === base.name);
      if (real) capacity.set(real.id, base.stock);
    }

    const { rows: dateRow } = await q('SELECT CURRENT_DATE::text AS today');
    const today = new Date(`${dateRow[0].today}T00:00:00Z`);

    await q('BEGIN');

    // Reset del historial transaccional y del stock a su valor base.
    await q('DELETE FROM sale_items');
    await q('DELETE FROM sales');
    await q('DELETE FROM inventory_movements');
    await q('DELETE FROM alerts');
    await q('DELETE FROM audit_logs');
    for (const [id, cap] of capacity) {
      await q('UPDATE ingredients SET stock = $1 WHERE id = $2', [cap, id]);
      ingById.get(id).stock = cap;
    }

    for (let i = days - 1; i >= 0; i -= 1) {
      const dayStart = new Date(today.getTime() - i * 86400000);

      // --- Reposicion matutina (antes de abrir) ---
      const restockTime = atTime(dayStart, 7, 7);
      for (const ing of ingById.values()) {
        const cap = capacity.get(ing.id);
        if (cap === undefined || ing.stock >= ing.min_stock * 2) continue;
        const qty = round3(cap - ing.stock);
        if (qty <= 0) continue;
        ing.stock = round3(ing.stock + qty);
        await q('UPDATE ingredients SET stock = $1 WHERE id = $2', [ing.stock, ing.id]);
        await q(
          'INSERT INTO inventory_movements (ingredient_id, type, quantity, reason, user_id, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
          [ing.id, 'ENTRADA', qty, 'Compra a proveedor', admin.id, restockTime],
        );
        await q(
          'INSERT INTO audit_logs (user_id, action, entity, entity_id, result, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
          [admin.id, 'ADD_STOCK', 'ingredient', ing.id, `Entrada de ${qty} ${ing.unit} de "${ing.name}"`, restockTime],
        );
        stats.restocks += 1;
        // Las alertas por este insumo quedan cubiertas con la reposicion.
        const resolved = await q(
          "UPDATE alerts SET status = 'RESOLVED', resolved_at = $1 WHERE status = 'OPEN' AND message LIKE $2",
          [restockTime, `"${ing.name}":%`],
        );
        stats.resolved += resolved.rowCount;
      }

      // --- Ventas del dia ---
      const salesToday = randInt(26, 36);
      for (let s = 0; s < salesToday; s += 1) {
        const saleTime = atTime(dayStart, 8, 20);

        // Consolidar lineas por producto (si se repite, suma cantidad).
        const lines = new Map();
        for (let k = 0, count = randInt(1, 3); k < count; k += 1) {
          const product = weightedPick(products);
          const qty = chance(0.7) ? 1 : chance(0.75) ? 2 : 3;
          lines.set(product.id, (lines.get(product.id) ?? 0) + qty);
        }
        const items = [...lines.entries()].map(([productId, quantity]) => ({
          product: products.find((p) => p.id === productId),
          quantity,
        }));

        // Consumo de insumos por receta.
        const consumption = new Map();
        for (const it of items) {
          for (const line of recipeByProduct.get(it.product.id) ?? []) {
            consumption.set(
              line.ingredientId,
              round3((consumption.get(line.ingredientId) ?? 0) + line.quantity * it.quantity),
            );
          }
        }

        // Reposicion urgente si un insumo no alcanza para esta venta.
        for (const [ingId, need] of consumption) {
          const ing = ingById.get(ingId);
          if (ing.stock >= need) continue;
          const cap = capacity.get(ingId) ?? round3(need + ing.min_stock);
          const qty = round3(cap - ing.stock);
          ing.stock = round3(ing.stock + qty);
          await q('UPDATE ingredients SET stock = $1 WHERE id = $2', [ing.stock, ingId]);
          await q(
            'INSERT INTO inventory_movements (ingredient_id, type, quantity, reason, user_id, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
            [ingId, 'ENTRADA', qty, 'Compra urgente', admin.id, saleTime],
          );
          stats.urgentRestocks += 1;
        }

        const totalCents = items.reduce((acc, it) => acc + it.product.price_cents * it.quantity, 0);
        const customer = CUSTOMERS[randInt(0, CUSTOMERS.length - 1)];
        const { rows: saleRow } = await q(
          'INSERT INTO sales (user_id, customer_name, total_cents, status, created_at) VALUES ($1,$2,$3,$4,$5) RETURNING id',
          [cajero.id, customer, totalCents, 'COMPLETED', saleTime],
        );
        const saleId = saleRow[0].id;
        stats.sales += 1;

        for (const it of items) {
          await q(
            'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price_cents, subtotal_cents) VALUES ($1,$2,$3,$4,$5)',
            [saleId, it.product.id, it.quantity, it.product.price_cents, it.product.price_cents * it.quantity],
          );
          stats.items += 1;
        }

        for (const [ingId, used] of consumption) {
          const ing = ingById.get(ingId);
          const wasLow = ing.stock <= ing.min_stock;
          ing.stock = round3(ing.stock - used);
          await q('UPDATE ingredients SET stock = $1 WHERE id = $2', [ing.stock, ingId]);
          await q(
            'INSERT INTO inventory_movements (ingredient_id, type, quantity, reason, user_id, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
            [ingId, 'CONSUMO', used, `Venta #${saleId}`, cajero.id, saleTime],
          );
          stats.consumptions += 1;

          // Alerta solo en la transicion hacia stock bajo (evita duplicados).
          if (!wasLow && ing.stock <= ing.min_stock) {
            const severity = ing.stock <= 0 ? 'CRITICAL' : 'WARNING';
            await q(
              'INSERT INTO alerts (type, severity, message, status, created_at) VALUES ($1,$2,$3,$4,$5)',
              [
                'LOW_STOCK',
                severity,
                `"${ing.name}": stock ${ing.stock} ${ing.unit} <= mínimo ${ing.min_stock} ${ing.unit}.`,
                'OPEN',
                saleTime,
              ],
            );
            stats.alerts += 1;
          }
        }

        await q(
          'INSERT INTO audit_logs (user_id, action, entity, entity_id, result, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
          [cajero.id, 'SALE', 'sale', saleId, `Venta registrada por ${new Money(totalCents).format()}`, saleTime],
        );
      }

      if ((days - i) % 10 === 0) {
        process.stdout.write(`  día ${days - i}/${days} · ${stats.sales} ventas acumuladas\n`);
      }
    }

    await q('COMMIT');

    console.log('\nPoblacion historica completada:');
    console.log(`  Ventana         : ${days} días (7 días/semana)`);
    console.log(`  Ventas          : ${stats.sales}`);
    console.log(`  Líneas de venta : ${stats.items}`);
    console.log(`  Consumos        : ${stats.consumptions}`);
    console.log(`  Reposiciones    : ${stats.restocks} planificadas + ${stats.urgentRestocks} urgentes`);
    console.log(`  Alertas creadas : ${stats.alerts} (resueltas al reponer: ${stats.resolved})`);
  } catch (err) {
    await q('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error en la poblacion historica:', err.message);
  process.exitCode = 1;
});
