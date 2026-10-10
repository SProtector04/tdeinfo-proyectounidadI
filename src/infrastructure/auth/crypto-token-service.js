import { TokenService } from '../../domain/services/token-service.js';
import crypto from 'node:crypto';

/**
 * Implementacion del puerto `TokenService`. Genera tokens de sesion aleatorios
 * y guarda su hash SHA-256 (nunca el token en claro) en la base de datos.
 */
export class CryptoTokenService extends TokenService {
  generate() {
    return crypto.randomBytes(32).toString('hex');
  }

  hash(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
  }
}
