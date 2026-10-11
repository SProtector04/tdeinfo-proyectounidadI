export function inventoryController({
  addStock,
  adjustStock,
  listMovements,
  listAlerts,
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
        const result = await listMovements.execute({ limit: Number(req.query.limit ?? 100) });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async listAlerts(req, res, next) {
      try {
        const result = await listAlerts.execute({ status: req.query.status ?? null });
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
        const result = await listAudit.execute({ limit: Number(req.query.limit ?? 100) });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
