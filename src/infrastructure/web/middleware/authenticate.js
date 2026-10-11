import { UnauthorizedError } from '../../../domain/errors.js';

/**
 * Middleware de autenticacion. Lee `Authorization: Bearer <token>`, hashea el
 * token y busca la sesion activa. Adjunta `req.user` y `req.token`.
 */
export function authenticateFactory({ authRepository, tokenService }) {
  return async function authenticate(req, _res, next) {
    try {
      const header = req.headers.authorization ?? '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) return next(new UnauthorizedError());

      const user = await authRepository.findUserBySessionTokenHash(tokenService.hash(token));
      if (!user || !user.active) return next(new UnauthorizedError());

      req.user = user;
      req.token = token;
      return next();
    } catch (err) {
      next(err);
    }
  };
}
