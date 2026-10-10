/**
 * Errores de dominio y aplicacion.
 *
 * Cada error lleva un `code` estable que la capa de infraestructura (HTTP)
 * mapea a un codigo de estado. Asi el dominio no depende del framework web.
 */
export class AppError extends Error {
  constructor(message, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message) {
    super(message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado') {
    super(message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Sin permisos suficientes') {
    super(message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class InsufficientStockError extends AppError {
  constructor(message = 'Stock insuficiente') {
    super(message, 'INSUFFICIENT_STOCK');
    this.name = 'InsufficientStockError';
  }
}

export function assertNonNegative(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new ValidationError(`${field} no puede ser negativo`);
  }
  return n;
}

export function assertPositive(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new ValidationError(`${field} debe ser mayor que cero`);
  }
  return n;
}
