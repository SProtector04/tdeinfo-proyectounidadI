import { Money } from '../../src/domain/value-objects/money.js';
import { Product } from '../../src/domain/entities/product.js';
import { Ingredient } from '../../src/domain/entities/ingredient.js';

/**
 * Repositorios fake en memoria para tests de casos de uso.
 * Cada metodo registra sus llamadas en `calls` para poder verificar
 * ausencia de escrituras cuando la validacion falla.
 */

export function makeFakeCatalogRepository({ products = [], ingredients = [] } = {}) {
  const calls = {
    findProductsByIds: [],
    findIngredientsByIds: [],
    updateIngredientStock: [],
    createProduct: [],
    createIngredient: [],
  };

  const productsById = new Map(products.map((p) => [p.id, p]));
  const ingredientsById = new Map(ingredients.map((i) => [i.id, i]));

  return {
    calls,
    productsById,
    ingredientsById,
    async findProductsByIds(ids) {
      calls.findProductsByIds.push(ids);
      return ids.map((id) => productsById.get(id)).filter(Boolean);
    },
    async findIngredientsByIds(ids) {
      calls.findIngredientsByIds.push(ids);
      return ids.map((id) => ingredientsById.get(id)).filter(Boolean);
    },
    async updateIngredientStock(ingredientId, newStock) {
      calls.updateIngredientStock.push({ ingredientId, newStock });
      const ing = ingredientsById.get(ingredientId);
      if (ing) ing.stock = newStock;
    },
    async listProducts() {
      return [...productsById.values()];
    },
    async listIngredients() {
      return [...ingredientsById.values()];
    },
  };
}

export function makeFakeSalesRepository() {
  const calls = { create: [], createItems: [], list: [] };
  let nextId = 1;
  const sales = new Map();
  const itemsBySale = new Map();

  return {
    calls,
    sales,
    itemsBySale,
    async create(data) {
      calls.create.push(data);
      const id = nextId++;
      sales.set(id, { id, ...data });
      itemsBySale.set(id, []);
      return id;
    },
    async createItems(saleId, items) {
      calls.createItems.push({ saleId, items });
      itemsBySale.get(saleId).push(...items);
    },
    async list({ limit = 50 } = {}) {
      calls.list.push({ limit });
      return [...sales.values()].slice(-limit);
    },
  };
}

export function makeFakeInventoryRepository({ avgByIngredient = [] } = {}) {
  const calls = { addMovement: [], createAlert: [], addAudit: [], avgConsumptionByIngredient: [] };
  return {
    calls,
    async avgConsumptionByIngredient(days) {
      calls.avgConsumptionByIngredient.push(days);
      return avgByIngredient;
    },
    async addMovement(movement) {
      calls.addMovement.push(movement);
      return calls.addMovement.length;
    },
    async createAlert(alert) {
      calls.createAlert.push(alert);
      return calls.createAlert.length;
    },
    async addAudit(audit) {
      calls.addAudit.push(audit);
    },
    async listMovements() {
      return [];
    },
    async listAlerts() {
      return [];
    },
    async listAudit() {
      return [];
    },
  };
}

export function makeFakeAuthRepository({ users = [] } = {}) {
  const calls = { findUserByUsername: [], createUser: [], createSession: [] };
  const usersByUsername = new Map(users.map((u) => [u.username, u]));
  let nextId = 1000;

  return {
    calls,
    usersByUsername,
    async findUserByUsername(username) {
      calls.findUserByUsername.push(username);
      return usersByUsername.get(username) ?? null;
    },
    async createUser(data) {
      calls.createUser.push(data);
      const id = nextId++;
      usersByUsername.set(data.username, { id, ...data });
      return id;
    },
    async createSession(tokenHash, userId, expiresAt) {
      calls.createSession.push({ tokenHash, userId, expiresAt });
    },
    async listUsers() {
      return [...usersByUsername.values()];
    },
  };
}

/** PasswordService fake determinista (scrypt es lento y no aporta aqui). */
export function makeFakePasswordService() {
  return {
    hash: (password) => `hashed:${password}`,
    verify: (password, stored) => stored === `hashed:${password}`,
  };
}

/** transaction fake: ejecuta el bloque sin rollback real (el fake no simula PG). */
export const fakeTransaction = async (fn) => fn();

export function makeProduct({ id, name, category = 'Quesillo', priceCents, recipe = [] }) {
  return new Product({ id, name, category, price: new Money(priceCents), recipe });
}

export function makeIngredient({ id, name, unit = 'kg', stock, minStock = 0, costCents = 0 }) {
  return new Ingredient({ id, name, unit, stock, minStock, cost: new Money(costCents) });
}
