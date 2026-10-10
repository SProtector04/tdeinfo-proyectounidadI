import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROLES } from '../../domain/entities/user.js';
import { errorHandler } from './middleware/error-handler.js';
import { authenticateFactory } from './middleware/authenticate.js';
import { authorizeFactory } from './middleware/authorize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../../../public');

/**
 * Crea y configura el servidor HTTP (Express). Es un adaptador de entrada que
 * no contiene logica de negocio: solo orquesta middlewares y controladores.
 */
export function createHttpServer({ authRepository, tokenService, controllers }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  const authenticate = authenticateFactory({ authRepository, tokenService });
  const authorizeAdmin = authorizeFactory(ROLES.ADMIN);
  const authorizeStaff = authorizeFactory(ROLES.ADMIN, ROLES.CAJERO);

  const api = express.Router();

  // Autenticacion (publico)
  api.post('/auth/login', controllers.auth.login);

  // Rutas protegidas (requieren sesion valida)
  api.use(authenticate);
  api.post('/auth/logout', controllers.auth.logout);
  api.get('/auth/me', controllers.auth.me);

  // Ventas (admin y cajero)
  api.get('/sales', authorizeStaff, controllers.sales.list);
  api.post('/sales', authorizeStaff, controllers.sales.register);

  // Catalogo (lectura para staff, escritura solo admin)
  api.get('/products', authorizeStaff, controllers.catalog.listProducts);
  api.post('/products', authorizeAdmin, controllers.catalog.createProduct);
  api.get('/ingredients', authorizeStaff, controllers.catalog.listIngredients);
  api.post('/ingredients', authorizeAdmin, controllers.catalog.createIngredient);

  // Inventario y alertas
  api.post('/inventory/add', authorizeAdmin, controllers.inventory.addStock);
  api.post('/inventory/adjust', authorizeAdmin, controllers.inventory.adjustStock);
  api.get('/inventory/movements', authorizeAdmin, controllers.inventory.listMovements);
  api.get('/alerts', authorizeStaff, controllers.inventory.listAlerts);
  api.post('/alerts/:id/resolve', authorizeAdmin, controllers.inventory.resolveAlert);
  api.get('/audit', authorizeAdmin, controllers.inventory.listAudit);

  // Tablero (staff)
  api.get('/dashboard', authorizeStaff, controllers.dashboard.get);

  // Usuarios (solo admin)
  api.get('/users', authorizeAdmin, controllers.users.list);
  api.post('/users', authorizeAdmin, controllers.users.create);

  app.use('/api', api);

  // Frontend estatico
  app.use(express.static(PUBLIC_DIR));

  // Fallback para las rutas del SPA -> index
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  app.use(errorHandler);
  return app;
}
