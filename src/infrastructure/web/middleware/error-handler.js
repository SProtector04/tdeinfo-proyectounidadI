import { AppError } from '../../../domain/errors.js';

const STATUS_BY_CODE = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INSUFFICIENT_STOCK: 409,
  APP_ERROR: 500,
};

/**
 * Manejador global de errores. Traduce los errores de dominio/app a respuestas
 * HTTP con un mensaje comprensible para el usuario.
 */
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    const status = STATUS_BY_CODE[err.code] ?? 500;
    return res.status(status).json({ error: { code: err.code, message: err.message } });
  }

  // Error inesperado: no exponer detalles internos.
  console.error(err);
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Error interno del servidor' } });
}
