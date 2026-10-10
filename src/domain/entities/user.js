import { ValidationError } from '../errors.js';

export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  CAJERO: 'CAJERO',
});

/**
 * Entidad `User`. Encapsula las invariantes de un usuario del sistema.
 * El rol determina los permisos (ver `authorize` en la capa web).
 */
export class User {
  constructor({ id = null, name, username, passwordHash, role, active = true }) {
    if (!name || !String(name).trim()) {
      throw new ValidationError('El nombre es obligatorio');
    }
    if (!username || !String(username).trim()) {
      throw new ValidationError('El nombre de usuario es obligatorio');
    }
    if (!Object.values(ROLES).includes(role)) {
      throw new ValidationError(`Rol invalido: ${role}`);
    }
    this.id = id;
    this.name = String(name).trim();
    this.username = String(username).trim();
    this.passwordHash = passwordHash;
    this.role = role;
    this.active = Boolean(active);
  }

  isAdmin() {
    return this.role === ROLES.ADMIN;
  }
}
