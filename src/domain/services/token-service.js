/**
 * Puerto `TokenService`. Abstrae la generacion de tokens de sesion y su
 * hashing (para no guardar el token en claro en la base de datos).
 */
export class TokenService {
  generate() {
    throw new Error('Not implemented');
  }

  hash(token) {
    throw new Error('Not implemented');
  }
}
