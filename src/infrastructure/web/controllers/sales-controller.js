export function salesController({ registerSale, listSales }) {
  return {
    async register(req, res, next) {
      try {
        const { customerName, items } = req.body ?? {};
        const result = await registerSale.execute({
          userId: req.user.id,
          customerName,
          items,
        });
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },

    async list(req, res, next) {
      try {
        const limit = Number(req.query.limit ?? 50);
        const result = await listSales.execute({ limit });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
