import { ValidationError } from '../errors.js';

/**
 * Value Object `Money`.
 *
 * Representa dinero en centavos (enteros) para evitar errores de punto
 * flotante. Toda cantidad monetaria del dominio se expresa en centavos.
 */
export class Money {
  constructor(amountCents) {
    const cents = Math.round(Number(amountCents));
    if (!Number.isFinite(cents)) {
      throw new ValidationError('Monto invalido');
    }
    this.cents = cents;
  }

  static fromCents(cents) {
    return new Money(cents);
  }

  static fromNumber(units) {
    return new Money(Math.round(Number(units) * 100));
  }

  add(other) {
    return new Money(this.cents + other.cents);
  }

  multiply(factor) {
    return new Money(Math.round(this.cents * Number(factor)));
  }

  toCents() {
    return this.cents;
  }

  toNumber() {
    return this.cents / 100;
  }

  format() {
    const sign = this.cents < 0 ? '-' : '';
    const abs = Math.abs(this.cents);
    const whole = Math.floor(abs / 100);
    const frac = String(abs % 100).padStart(2, '0');
    return `${sign}C$ ${whole}.${frac}`;
  }

  toJSON() {
    return { cents: this.cents, formatted: this.format() };
  }
}
