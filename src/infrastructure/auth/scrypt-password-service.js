import { PasswordService } from '../../domain/services/password-service.js';
import crypto from 'node:crypto';

/**
 * Implementacion del puerto `PasswordService` usando scrypt (modulo nativo de
 * Node, sin dependencias externas). El hash se almacena como `salt:hash`.
 */
export class ScryptPasswordService extends PasswordService {
  hash(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  verify(password, stored) {
    if (!stored || !stored.includes(':')) return false;
    const [salt, expected] = stored.split(':');
    const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(expected, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}
