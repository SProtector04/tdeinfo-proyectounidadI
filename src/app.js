import { createConnection, makeTransaction } from './infrastructure/persistence/db.js';
import { ensureSchema } from './infrastructure/persistence/schema.js';
import { seedDatabase } from './infrastructure/persistence/seed.js';

import { PostgresCatalogRepository } from './infrastructure/persistence/postgres-catalog-repository.js';
import { PostgresSalesRepository } from './infrastructure/persistence/postgres-sales-repository.js';
import { PostgresInventoryRepository } from './infrastructure/persistence/postgres-inventory-repository.js';
import { PostgresAuthRepository } from './infrastructure/persistence/postgres-auth-repository.js';

import { ScryptPasswordService } from './infrastructure/auth/scrypt-password-service.js';
import { CryptoTokenService } from './infrastructure/auth/crypto-token-service.js';

import { StockService } from './domain/services/stock-service.js';
import { RecommendationService } from './domain/services/recommendation-service.js';
import { AlertService } from './domain/services/alert-service.js';

import { Login, Logout } from './application/use-cases/auth.js';
import { RegisterSale, ListSales } from './application/use-cases/sales.js';
import { GetDashboard } from './application/use-cases/dashboard.js';
import { ListProducts, CreateProduct, ListIngredients, CreateIngredient } from './application/use-cases/catalog.js';
import { AddStock, AdjustStock, ListMovements, ListAlerts, ResolveAlert, ListAudit } from './application/use-cases/inventory.js';
import { ListUsers, CreateUser } from './application/use-cases/users.js';

import { createHttpServer } from './infrastructure/web/http-server.js';
import { authController } from './infrastructure/web/controllers/auth-controller.js';
import { salesController } from './infrastructure/web/controllers/sales-controller.js';
import { catalogController } from './infrastructure/web/controllers/catalog-controller.js';
import { inventoryController } from './infrastructure/web/controllers/inventory-controller.js';
import { dashboardController } from './infrastructure/web/controllers/dashboard-controller.js';
import { usersController } from './infrastructure/web/controllers/users-controller.js';

/**
 * Raiz de composicion (compose root). Unico lugar donde se instancian y se
 * conectan las dependencias concretas. Las capas internas (dominio y
 * aplicacion) solo conocen interfaces (puertos), nunca implementaciones.
 */
export async function buildApp(config) {
  const db = createConnection(config.databaseUrl);
  await ensureSchema(db);

  const passwordService = new ScryptPasswordService();
  const tokenService = new CryptoTokenService();
  await seedDatabase(db, { passwordService, config });

  const authRepository = new PostgresAuthRepository(db);
  await authRepository.deleteExpiredSessions();

  const catalogRepository = new PostgresCatalogRepository(db);
  const salesRepository = new PostgresSalesRepository(db);
  const inventoryRepository = new PostgresInventoryRepository(db);

  const stockService = new StockService();
  const recommendationService = new RecommendationService();
  const alertService = new AlertService();

  const transaction = makeTransaction(db);

  const login = new Login({
    authRepository,
    passwordService,
    tokenService,
    auditRepository: inventoryRepository,
    sessionTtlMs: config.sessionTtlMs,
  });
  const logout = new Logout({ authRepository, tokenService, auditRepository: inventoryRepository });

  const registerSale = new RegisterSale({
    catalogRepository,
    salesRepository,
    inventoryRepository,
    stockService,
    alertService,
    transaction,
  });
  const listSales = new ListSales({ salesRepository });
  const getDashboard = new GetDashboard({ salesRepository, inventoryRepository, catalogRepository, recommendationService });

  const listProducts = new ListProducts({ catalogRepository });
  const createProduct = new CreateProduct({ catalogRepository, inventoryRepository, transaction });
  const listIngredients = new ListIngredients({ catalogRepository });
  const createIngredient = new CreateIngredient({ catalogRepository, inventoryRepository, transaction });

  const addStock = new AddStock({ catalogRepository, inventoryRepository, transaction });
  const adjustStock = new AdjustStock({ catalogRepository, inventoryRepository, transaction });
  const listMovements = new ListMovements({ inventoryRepository });
  const listAlerts = new ListAlerts({ inventoryRepository });
  const resolveAlert = new ResolveAlert({ inventoryRepository, transaction });
  const listAudit = new ListAudit({ inventoryRepository });

  const listUsers = new ListUsers({ authRepository });
  const createUser = new CreateUser({ authRepository, passwordService, inventoryRepository, transaction });

  const controllers = {
    auth: authController({ login, logout }),
    sales: salesController({ registerSale, listSales }),
    catalog: catalogController({ listProducts, createProduct, listIngredients, createIngredient }),
    inventory: inventoryController({ addStock, adjustStock, listMovements, listAlerts, resolveAlert, listAudit }),
    dashboard: dashboardController({ getDashboard }),
    users: usersController({ listUsers, createUser }),
  };

  const app = createHttpServer({ authRepository, tokenService, controllers });

  return { app, container: { db, config } };
}
