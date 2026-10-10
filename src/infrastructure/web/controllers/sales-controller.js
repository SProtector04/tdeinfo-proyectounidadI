export function salesController({ registerSale, listSales }) {
  return {
    register(req, res, next) {
      try {
        const { customerName, items } = req.body ?? {};
        const result = registerSale.execute({
          userId: req.user.id,
          customerName,
          items,
        });
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },

    list(req, res, next) {
      try {
        const limit = Number(req.query.limit ?? 50);
        const result = listSales.execute({ limit });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
