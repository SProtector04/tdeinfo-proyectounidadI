import { NotFoundError, ValidationError, assertNonNegative, assertPositive } from '../../domain/errors.js';
import { round3 } from '../../domain/units.js';

export class AddStock {
  constructor({ catalogRepository, inventoryRepository, transaction }) {
    this.catalogRepository = catalogRepository;
    this.inventoryRepository = inventoryRepository;
    this.transaction = transaction;
  }

  execute({ ingredientId, quantity, reason, userId }) {
    const qty = assertPositive(quantity, 'cantidad');
    const ingredient = this.catalogRepository.findIngredientById(ingredientId);
    if (!ingredient) throw new NotFoundError(`Insumo no encontrado: #${ingredientId}`);

    const newStock = round3(ingredient.stock + qty);
    let movementId;
    this.transaction(() => {
      this.catalogRepository.updateIngredientStock(ingredientId, newStock);
      movementId = this.inventoryRepository.addMovement({
        ingredientId,
        type: 'ENTRADA',
        quantity: qty,
        reason,
        userId,
      });
      this.inventoryRepository.addAudit({
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

  execute({ ingredientId, target, reason, userId }) {
    const targetStock = assertNonNegative(target, 'stock objetivo');
    const ingredient = this.catalogRepository.findIngredientById(ingredientId);
    if (!ingredient) throw new NotFoundError(`Insumo no encontrado: #${ingredientId}`);

    const delta = round3(targetStock - ingredient.stock);
    if (delta === 0) throw new ValidationError('El ajuste no produce cambios');

    this.transaction(() => {
      this.catalogRepository.updateIngredientStock(ingredientId, targetStock);
      this.inventoryRepository.addMovement({
        ingredientId,
        type: 'AJUSTE',
        quantity: delta,
        reason,
        userId,
      });
      this.inventoryRepository.addAudit({
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

  execute({ limit = 100 } = {}) {
    return this.inventoryRepository.listMovements({ limit });
  }
}

export class ListAlerts {
  constructor({ inventoryRepository }) {
    this.inventoryRepository = inventoryRepository;
  }

  execute({ status = null } = {}) {
    return this.inventoryRepository.listAlerts({ status });
  }
}

export class ResolveAlert {
  constructor({ inventoryRepository, transaction }) {
    this.inventoryRepository = inventoryRepository;
    this.transaction = transaction;
  }

  execute({ alertId, userId }) {
    this.transaction(() => {
      this.inventoryRepository.resolveAlert(alertId);
      this.inventoryRepository.addAudit({
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

  execute({ limit = 100 } = {}) {
    return this.inventoryRepository.listAudit({ limit });
  }
}
