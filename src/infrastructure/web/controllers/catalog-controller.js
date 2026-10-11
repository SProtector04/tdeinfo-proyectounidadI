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
    async listProducts(_req, res, next) {
      try {
        const products = await listProducts.execute();
        res.json(products.map(toProduct));
      } catch (err) {
        next(err);
      }
    },

    async createProduct(req, res, next) {
      try {
        const { name, category, priceCents, recipe } = req.body ?? {};
        const result = await createProduct.execute({ name, category, priceCents, recipe, userId: req.user.id });
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },

    async listIngredients(_req, res, next) {
      try {
        const ingredients = await listIngredients.execute();
        res.json(ingredients.map(toIngredient));
      } catch (err) {
        next(err);
      }
    },

    async createIngredient(req, res, next) {
      try {
        const { name, unit, stock, minStock, costCents } = req.body ?? {};
        const result = await createIngredient.execute({ name, unit, stock, minStock, costCents, userId: req.user.id });
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
