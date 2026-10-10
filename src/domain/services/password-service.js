/**
 * Puerto `PasswordService`. Define el contrato de hashing de contraseñas.
 * La implementacion concreta (scrypt) vive en infraestructura, de modo que el
 * dominio y la aplicacion no dependen de `crypto` ni de librerias concretas.
 */
export class PasswordService {
  hash(password) {
    throw new Error('Not implemented');
  }

  verify(password, hash) {
    throw new Error('Not implemented');
  }
}
