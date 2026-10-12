# Trazabilidad requisitos → modulos → pruebas

Relaciona cada funcionalidad del prototipo con su implementacion y con las
pruebas que la verifican. Los identificadores `U-*`, `I-*` y `M-*` corresponden
a `docs/pruebas.md`.

Leyenda de roles: **ADMIN** y **CAJERO** (definidos en la autenticacion por
sesion; el frontend oculta acciones que el rol no puede realizar).

## Casos de uso funcionales

| ID | Requisito | Rol | Endpoint | Modulo de negocio (caso de uso) | Pruebas |
| --- | --- | --- | --- | --- | --- |
| R-01 | Autenticarse y obtener sesion | publico | `POST /api/auth/login` | `application/use-cases/auth.js` → `Login` | M-01, I-01 |
| R-02 | Cerrar sesion | ADMIN, CAJERO | `POST /api/auth/logout` | `application/use-cases/auth.js` → `Logout` | M-01 |
| R-03 | Registrar una venta (cobra y descuenta inventario) | ADMIN, CAJERO | `POST /api/sales` | `application/use-cases/sales.js` → `RegisterSale` | U-22..U-26, I-02, M-03 |
| R-04 | Consultar ventas paginadas | ADMIN, CAJERO | `GET /api/sales?limit&offset` | `application/use-cases/sales.js` → `ListSales` | I-02 |
| R-05 | Ver tablero de decisiones (periodo 1/7/30) | ADMIN, CAJERO | `GET /api/dashboard?days` | `application/use-cases/dashboard.js` → `GetDashboard` | U-30..U-35, I-02, M-04 |
| R-06 | Consultar productos y recetas | ADMIN, CAJERO | `GET /api/products` | `application/use-cases/catalog.js` → `ListProducts` | I-02 |
| R-07 | Crear producto con receta | ADMIN | `POST /api/products` | `application/use-cases/catalog.js` → `CreateProduct` | I-04 (validacion) |
| R-08 | Consultar insumos y estado de stock | ADMIN, CAJERO | `GET /api/ingredients` | `application/use-cases/catalog.js` → `ListIngredients` | I-02 |
| R-09 | Registrar entrada de stock | ADMIN | `POST /api/inventory/add` | `application/use-cases/inventory.js` → `AddStock` | M-03 |
| R-10 | Ajustar stock (conteo fisico / merma) | ADMIN | `POST /api/inventory/adjust` | `application/use-cases/inventory.js` → `AdjustStock` | M-03 |
| R-11 | Consultar movimientos de inventario | ADMIN | `GET /api/inventory/movements` | `application/use-cases/inventory.js` → `ListMovements` | M-03 |
| R-12 | Listar alertas (todas / abiertas / resueltas) | ADMIN, CAJERO | `GET /api/alerts?status` | `application/use-cases/inventory.js` → `ListAlerts` | U-23, M-04 |
| R-13 | Resolver una alerta | ADMIN | `POST /api/alerts/:id/resolve` | `application/use-cases/inventory.js` → `ResolveAlert` | U-23 |
| R-14 | Consultar bitacora de auditoria | ADMIN | `GET /api/audit` | `application/use-cases/inventory.js` → `ListAudit` | U-22 (auditoria generada) |
| R-15 | Listar usuarios | ADMIN | `GET /api/users` | `application/use-cases/users.js` → `ListUsers` | I-03 |
| R-16 | Crear usuario | ADMIN | `POST /api/users` | `application/use-cases/users.js` → `CreateUser` | U-27..U-29, I-04 |

## Reglas de negocio y automatizaciones

| ID | Regla / automatizacion | Limite declarado | Modulo | Pruebas |
| --- | --- | --- | --- | --- |
| R-17 | Consumo de insumos por receta al vender | Receta por unidad; redondeo a 3 decimales | `domain/services/stock-service.js` | U-06..U-09 |
| R-18 | Venta atomica: o se registra completa o no registra nada | Transaccion SQL (BEGIN/COMMIT/ROLLBACK) | `application/use-cases/sales.js` + `infrastructure/persistence/db.js` | U-24..U-26, I-06, I-07 |
| R-19 | Alerta de stock bajo al caer al minimo | `stock <= min_stock`; severidad CRITICAL si `stock <= 0` | `domain/services/alert-service.js` | U-23 |
| R-20 | Recomendacion de produccion del proximo dia | Media movil simple (SMA); no modela estacionalidad ni tendencia | `domain/services/recommendation-service.js` | U-10..U-13 |
| R-21 | Dias de inventario restante | `stock / consumo_prom_diario`; sin consumo → sin estimacion | `domain/services/analytics-service.js` | U-16..U-18, U-35 |
| R-22 | Margen bruto estimado por producto | Ingreso − costo de insumos de la receta (costo **actual**, no historico); sin costo registrado → sin margen | `domain/services/analytics-service.js` | U-19..U-21, U-33, U-34 |
| R-23 | Variacion contra el periodo anterior | Ventanas equivalentes (1/7/30); base cero → sin porcentaje | `domain/services/analytics-service.js` | U-14, U-15, U-31, U-32 |

## Controles de seguridad y trazabilidad

| ID | Control | Implementacion | Pruebas |
| --- | --- | --- | --- |
| R-24 | Sesion por token; solo el hash se persiste | `infrastructure/auth/crypto-token-service.js`, tabla `sessions` | I-01 |
| R-25 | Autorizacion por rol en cada endpoint | `infrastructure/web/middleware/` (`authorize*`) | I-03 |
| R-26 | Validacion de entradas en el borde HTTP | `infrastructure/web/validation.js` | U-04, U-25, I-04 |
| R-27 | Manejo de errores sin fugar detalles internos | `infrastructure/web/` (manejador de errores) | I-05, M-02 |
| R-28 | Auditoria de acciones importantes (usuario, fecha, accion, resultado) | tabla `audit_logs` escrita desde los casos de uso | U-22, U-27 |
| R-29 | Degradacion ante caida de la BD | `buildApp` rechaza el arranque; compose `depends_on: service_healthy` | I-05, M-02 |

## Frontend (sin framework, estatico)

| ID | Pantalla | Vistas | Modulo |
| --- | --- | --- | --- |
| R-03, R-04 | `ventas.html` | Cobrar (por defecto) / Historial | `public/js/ventas.js` |
| R-05 | `index.html` | Tablero con selector de periodo | `public/js/dashboard.js` |
| R-08..R-11 | `inventario.html` | Estado / Entrada / Ajuste / Movimientos | `public/js/inventario.js` |
| R-06, R-07 | `productos.html` | Lista / Nuevo | `public/js/productos.js` |
| R-12, R-13 | `alertas.html` | Resumen de severidad + lista filtrable | `public/js/alertas.js` |
| R-15, R-16 | `usuarios.html` | Lista / Nuevo | `public/js/usuarios.js` |
| R-01 | `login.html` | Formulario de acceso | `public/js/login.js` |
| soporte | todas | Cliente HTTP con reintento de lectura y mensaje de sin conexion | `public/js/api.js` |
