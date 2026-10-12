import { validateSaleBody, parsePagination } from '../validation.js';

export function salesController({ registerSale, listSales }) {
  return {
    async register(req, res, next) {
      try {
        const { customerName, items } = validateSaleBody(req.body);
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
        const { limit, offset } = parsePagination(req.query);
        const result = await listSales.execute({ limit, offset });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
