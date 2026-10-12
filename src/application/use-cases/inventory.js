import { NotFoundError, ValidationError, assertNonNegative, assertPositive } from '../../domain/errors.js';
import { round3 } from '../../domain/units.js';

export class AddStock {
  constructor({ catalogRepository, inventoryRepository, transaction }) {
    this.catalogRepository = catalogRepository;
    this.inventoryRepository = inventoryRepository;
    this.transaction = transaction;
  }

  async execute({ ingredientId, quantity, reason, userId }) {
    const qty = assertPositive(quantity, 'cantidad');
    const ingredient = await this.catalogRepository.findIngredientById(ingredientId);
    if (!ingredient) throw new NotFoundError(`Insumo no encontrado: #${ingredientId}`);

    const newStock = round3(ingredient.stock + qty);
    let movementId;
    await this.transaction(async () => {
      await this.catalogRepository.updateIngredientStock(ingredientId, newStock);
      movementId = await this.inventoryRepository.addMovement({
        ingredientId,
        type: 'ENTRADA',
        quantity: qty,
        reason,
        userId,
      });
      await this.inventoryRepository.addAudit({
        userId,
        action: 'ADD_STOCK',
        entity: 'ingredient',
        entityId: ingredientId,
        result: `Entrada de ${qty} ${ingredient.unit} de "${ingredient.name}" (stock ${newStock})`,
      });
    });
    return { ingredientId, newStock, movementId };
  }
}

export class AdjustStock {
  constructor({ catalogRepository, inventoryRepository, transaction }) {
    this.catalogRepository = catalogRepository;
    this.inventoryRepository = inventoryRepository;
    this.transaction = transaction;
  }

  async execute({ ingredientId, target, reason, userId }) {
    const targetStock = assertNonNegative(target, 'stock objetivo');
    const ingredient = await this.catalogRepository.findIngredientById(ingredientId);
    if (!ingredient) throw new NotFoundError(`Insumo no encontrado: #${ingredientId}`);

    const delta = round3(targetStock - ingredient.stock);
    if (delta === 0) throw new ValidationError('El ajuste no produce cambios');

    await this.transaction(async () => {
      await this.catalogRepository.updateIngredientStock(ingredientId, targetStock);
      await this.inventoryRepository.addMovement({
        ingredientId,
        type: 'AJUSTE',
        quantity: delta,
        reason,
        userId,
      });
      await this.inventoryRepository.addAudit({
        userId,
        action: 'ADJUST_STOCK',
        entity: 'ingredient',
        entityId: ingredientId,
        result: `Ajuste de "${ingredient.name}" a ${targetStock} ${ingredient.unit}`,
      });
    });
    return { ingredientId, newStock: targetStock };
  }
}

export class ListMovements {
  constructor({ inventoryRepository }) {
    this.inventoryRepository = inventoryRepository;
  }

  async execute({ limit = 100, offset = 0 } = {}) {
    return this.inventoryRepository.listMovements({ limit, offset });
  }
}

export class ListAlerts {
  constructor({ inventoryRepository }) {
    this.inventoryRepository = inventoryRepository;
  }

  async execute({ status = null, limit = 50, offset = 0 } = {}) {
    return this.inventoryRepository.listAlerts({ status, limit, offset });
  }
}

export class GetAlertSummary {
  constructor({ inventoryRepository }) {
    this.inventoryRepository = inventoryRepository;
  }

  async execute() {
    const rows = await this.inventoryRepository.countOpenAlertsBySeverity();
    const summary = { CRITICAL: 0, WARNING: 0, total: 0 };
    for (const r of rows) {
      if (r.severity in summary) summary[r.severity] = r.count;
      summary.total += r.count;
    }
    return summary;
  }
}

export class ResolveAlert {
  constructor({ inventoryRepository, transaction }) {
    this.inventoryRepository = inventoryRepository;
    this.transaction = transaction;
  }

  async execute({ alertId, userId }) {
    await this.transaction(async () => {
      await this.inventoryRepository.resolveAlert(alertId);
      await this.inventoryRepository.addAudit({
        userId,
        action: 'RESOLVE_ALERT',
        entity: 'alert',
        entityId: alertId,
        result: 'Alerta resuelta',
      });
    });
    return { alertId };
  }
}

export class ListAudit {
  constructor({ inventoryRepository }) {
    this.inventoryRepository = inventoryRepository;
  }

  async execute({ limit = 100, offset = 0 } = {}) {
    return this.inventoryRepository.listAudit({ limit, offset });
  }
}
