/**
 * Puerto `CatalogRepository`. Abstrae el acceso al catalogo (productos,
 * recetas e insumos). La capa de aplicacion depende SOLO de este contrato;
 * la implementacion PostgreSQL vive en infraestructura.
 */
export class CatalogRepository {
  listProducts() {
    throw new Error('Not implemented');
  }

  findProductById(id) {
    throw new Error('Not implemented');
  }

  findProductsByIds(ids) {
    throw new Error('Not implemented');
  }

  createProduct({ name, category, priceCents, recipe }) {
    throw new Error('Not implemented');
  }

  listIngredients() {
    throw new Error('Not implemented');
  }

  findIngredientById(id) {
    throw new Error('Not implemented');
  }

  findIngredientsByIds(ids) {
    throw new Error('Not implemented');
  }

  createIngredient({ name, unit, stock, minStock, costCents }) {
    throw new Error('Not implemented');
  }

  updateIngredientStock(id, newStock) {
    throw new Error('Not implemented');
  }
}
