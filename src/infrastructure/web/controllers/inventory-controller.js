import { parsePagination } from '../validation.js';

export function inventoryController({
  addStock,
  adjustStock,
  listMovements,
  listAlerts,
  alertSummary,
  resolveAlert,
  listAudit,
}) {
  return {
    async addStock(req, res, next) {
      try {
        const { ingredientId, quantity, reason } = req.body ?? {};
        const result = await addStock.execute({ ingredientId, quantity, reason, userId: req.user.id });
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },

    async adjustStock(req, res, next) {
      try {
        const { ingredientId, target, reason } = req.body ?? {};
        const result = await adjustStock.execute({ ingredientId, target, reason, userId: req.user.id });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async listMovements(req, res, next) {
      try {
        const { limit, offset } = parsePagination(req.query, { defaultLimit: 50 });
        const result = await listMovements.execute({ limit, offset });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async listAlerts(req, res, next) {
      try {
        const { limit, offset } = parsePagination(req.query, { defaultLimit: 15 });
        const result = await listAlerts.execute({ status: req.query.status ?? null, limit, offset });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async alertSummary(_req, res, next) {
      try {
        const result = await alertSummary.execute();
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async resolveAlert(req, res, next) {
      try {
        const result = await resolveAlert.execute({ alertId: Number(req.params.id), userId: req.user.id });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async listAudit(req, res, next) {
      try {
        const { limit, offset } = parsePagination(req.query, { defaultLimit: 100 });
        const result = await listAudit.execute({ limit, offset });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
