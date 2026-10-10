/**
 * Puerto `AuthRepository`. Abstrae usuarios y sesiones para autenticacion y
 * autorizacion.
 */
export class AuthRepository {
  findUserByUsername(username) {
    throw new Error('Not implemented');
  }

  findUserById(id) {
    throw new Error('Not implemented');
  }

  listUsers() {
    throw new Error('Not implemented');
  }

  createUser({ name, username, passwordHash, role }) {
    throw new Error('Not implemented');
  }

  createSession(tokenHash, userId, expiresAt) {
    throw new Error('Not implemented');
  }

  findUserBySessionTokenHash(tokenHash) {
    throw new Error('Not implemented');
  }

  deleteSession(tokenHash) {
    throw new Error('Not implemented');
  }
}
