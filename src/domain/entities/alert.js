import { ValidationError } from '../errors.js';

export const ALERT_STATUS = Object.freeze({
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
});

/**
 * Entidad `Alert`. Salida de la regla de automatizacion: una alerta o
 * recomendacion generada por el dominio a partir de los datos.
 */
export class Alert {
  constructor({ id = null, type, severity = 'INFO', message, status = ALERT_STATUS.OPEN, createdAt = null, resolvedAt = null }) {
    if (!type) throw new ValidationError('La alerta requiere un tipo');
    if (!message || !String(message).trim()) {
      throw new ValidationError('La alerta requiere un mensaje');
    }
    this.id = id;
    this.type = type;
    this.severity = severity;
    this.message = String(message).trim();
    this.status = status;
    this.createdAt = createdAt;
    this.resolvedAt = resolvedAt;
  }
}
