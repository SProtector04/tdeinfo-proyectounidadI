export function inventoryController({
  addStock,
  adjustStock,
  listMovements,
  listAlerts,
  resolveAlert,
  listAudit,
}) {
  return {
    addStock(req, res, next) {
      try {
        const { ingredientId, quantity, reason } = req.body ?? {};
        res.status(201).json(addStock.execute({ ingredientId, quantity, reason, userId: req.user.id }));
      } catch (err) {
        next(err);
      }
    },

    adjustStock(req, res, next) {
      try {
        const { ingredientId, target, reason } = req.body ?? {};
        res.json(adjustStock.execute({ ingredientId, target, reason, userId: req.user.id }));
      } catch (err) {
        next(err);
      }
    },

    listMovements(req, res, next) {
      try {
        res.json(listMovements.execute({ limit: Number(req.query.limit ?? 100) }));
      } catch (err) {
        next(err);
      }
    },

    listAlerts(req, res, next) {
      try {
        res.json(listAlerts.execute({ status: req.query.status ?? null }));
      } catch (err) {
        next(err);
      }
    },

    resolveAlert(req, res, next) {
      try {
        res.json(resolveAlert.execute({ alertId: Number(req.params.id), userId: req.user.id }));
      } catch (err) {
        next(err);
      }
    },

    listAudit(req, res, next) {
      try {
        res.json(listAudit.execute({ limit: Number(req.query.limit ?? 100) }));
      } catch (err) {
        next(err);
      }
    },
  };
}
