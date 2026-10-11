/**
 * Utilidades numericas del dominio.
 *
 * PostgreSQL almacena DOUBLE PRECISION; las cantidades (kg, litro, unidad) se redondean a 3
 * decimales para evitar errores de punto flotante en los calculos de stock.
 */
export function round3(n) {
  return Math.round(Number(n) * 1000) / 1000;
}
