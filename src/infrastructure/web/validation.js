import { ValidationError } from '../../domain/errors.js';

/**
 * Validacion de entradas en el borde HTTP. Rechaza payloads malformados con
 * VALIDATION_ERROR antes de que lleguen al dominio. Sin dependencias externas.
 */

function requireString(value, field, { max = 200 } = {}) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${field} es obligatorio`);
  }
  if (value.trim().length > max) {
    throw new ValidationError(`${field} no puede exceder ${max} caracteres`);
  }
  return value.trim();
}

export function validateLoginBody(body) {
  return {
    username: requireString(body?.username, 'El usuario', { max: 50 }),
    password: requireString(body?.password, 'La contrasena', { max: 200 }),
  };
}

export function validateSaleBody(body) {
  const items = body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('La venta debe tener al menos un producto');
  }
  if (items.length > 50) {
    throw new ValidationError('La venta no puede exceder 50 productos distintos');
  }

  const normalized = items.map((item, index) => {
    const productId = item?.productId;
    const quantity = item?.quantity;
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new ValidationError(`Producto invalido en la linea ${index + 1}`);
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ValidationError(`Cantidad invalida en la linea ${index + 1}`);
    }
    return { productId, quantity };
  });

  const customerName = body?.customerName;
  return {
    customerName:
      customerName == null || customerName === ''
        ? null
        : requireString(customerName, 'El nombre del cliente', { max: 120 }),
    items: normalized,
  };
}

/** `limit` y `offset` desde querystring, acotados y con defaults. */
export function parsePagination(query, { defaultLimit = 50, maxLimit = 200 } = {}) {
  const limit = Number(query?.limit ?? defaultLimit);
  const offset = Number(query?.offset ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    throw new ValidationError(`limit debe ser un entero entre 1 y ${maxLimit}`);
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new ValidationError('offset debe ser un entero mayor o igual a 0');
  }
  return { limit, offset };
}

/** Periodo de analitica (dias) desde querystring, acotado. */
export function parsePeriod(query, { allowed = [1, 7, 30], fallback = 7 } = {}) {
  const raw = query?.days ?? fallback;
  const days = Number(raw);
  if (!allowed.includes(days)) {
    throw new ValidationError(`days debe ser uno de: ${allowed.join(', ')}`);
  }
  return days;
}
