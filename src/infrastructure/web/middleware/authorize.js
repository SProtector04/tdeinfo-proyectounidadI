import { ForbiddenError } from '../../../domain/errors.js';

/**
 * Middleware de autorizacion por rol. Debe usarse DESPUES de `authenticate`.
 */
export function authorizeFactory(...roles) {
  return function authorize(req, _res, next) {
    if (!req.user) return next(new ForbiddenError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Tu rol no tiene permisos para esta accion'));
    }
    return next();
  };
}
