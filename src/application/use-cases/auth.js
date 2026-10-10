import { UnauthorizedError } from '../../domain/errors.js';

/**
 * Caso de uso `Login`. Autentica un usuario y crea una sesion.
 */
export class Login {
  constructor({ authRepository, passwordService, tokenService, auditRepository, sessionTtlMs }) {
    this.authRepository = authRepository;
    this.passwordService = passwordService;
    this.tokenService = tokenService;
    this.auditRepository = auditRepository;
    this.sessionTtlMs = sessionTtlMs;
  }

  execute({ username, password }) {
    const user = this.authRepository.findUserByUsername(username);
    if (!user || !user.active) {
      throw new UnauthorizedError('Credenciales invalidas');
    }
    if (!this.passwordService.verify(password, user.passwordHash)) {
      throw new UnauthorizedError('Credenciales invalidas');
    }

    const token = this.tokenService.generate();
    const tokenHash = this.tokenService.hash(token);
    const expiresAt = new Date(Date.now() + this.sessionTtlMs).toISOString();

    this.authRepository.createSession(tokenHash, user.id, expiresAt);
    this.auditRepository.addAudit({
      userId: user.id,
      action: 'LOGIN',
      entity: 'session',
      result: 'Autenticacion exitosa',
    });

    return {
      token,
      expiresAt,
      user: { id: user.id, name: user.name, username: user.username, role: user.role },
    };
  }
}

/**
 * Caso de uso `Logout`. Invalida la sesion actual.
 */
export class Logout {
  constructor({ authRepository, tokenService, auditRepository }) {
    this.authRepository = authRepository;
    this.tokenService = tokenService;
    this.auditRepository = auditRepository;
  }

  execute({ token, userId }) {
    if (token) {
      this.authRepository.deleteSession(this.tokenService.hash(token));
    }
    if (userId) {
      this.auditRepository.addAudit({
        userId,
        action: 'LOGOUT',
        entity: 'session',
        result: 'Sesion cerrada',
      });
    }
  }
}
