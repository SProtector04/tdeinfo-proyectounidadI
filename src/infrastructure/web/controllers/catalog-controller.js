export function catalogController({ listProducts, createProduct, listIngredients, createIngredient }) {
  const toProduct = (p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    priceCents: p.price.cents,
    formattedPrice: p.price.format(),
    recipe: p.recipe,
  });

  const toIngredient = (i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    stock: i.stock,
    minStock: i.minStock,
    costCents: i.cost.cents,
    formattedCost: i.cost.format(),
    lowStock: i.isLowStock(),
    severity: i.severity(),
  });

  return {
    listProducts(_req, res, next) {
      try {
        res.json(listProducts.execute().map(toProduct));
      } catch (err) {
        next(err);
      }
    },

    createProduct(req, res, next) {
      try {
        const { name, category, priceCents, recipe } = req.body ?? {};
        const result = createProduct.execute({ name, category, priceCents, recipe, userId: req.user.id });
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },

    listIngredients(_req, res, next) {
      try {
        res.json(listIngredients.execute().map(toIngredient));
      } catch (err) {
        next(err);
      }
    },

    createIngredient(req, res, next) {
      try {
        const { name, unit, stock, minStock, costCents } = req.body ?? {};
        const result = createIngredient.execute({ name, unit, stock, minStock, costCents, userId: req.user.id });
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
