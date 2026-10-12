# Matriz de pruebas

Ejecucion:

```bash
npm test          # unitarias: dominio + casos de uso (sin infraestructura)
npm run test:int  # integracion contra PostgreSQL (requiere `db` del compose)
```

La suite de integracion se **omite automaticamente** si `DATABASE_URL` no
responde, por lo que es segura de correr en CI o en una maquina sin la base.

Convencion de resultado: **esperado** y **obtenido** se comparan en el codigo;
una fila en verde significa que el aserto correspondiente paso.

## Unitarias — dominio (`test/domain/`)

| ID | Caso | Tipo | Datos | Esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| U-01 | Money: centavos y unidades | Positiva | `fromCents(6000)`, `fromNumber(60.5)` | 6000, 6050 | OK |
| U-02 | Money: suma/multiplicacion enteras | Positiva | 6000 + 1500; 6000 × 3 | 7500; 18000 | OK |
| U-03 | Money: formato cordobas | Positiva | 6050; 5 | `C$ 60.50`; `C$ 0.05` | OK |
| U-04 | Money: monto invalido | Negativa | `'abc'`, `NaN` | `ValidationError` | OK |
| U-05 | round3 redondea a 3 decimales | Positiva | 0.1234; 2; `'1.5'` | 0.123; 2; 1.5 | OK |
| U-06 | planConsumption escala por receta | Positiva | quesillo ×2 | queso 0.24, tortilla 2 | OK |
| U-07 | planConsumption reporta faltante | Negativa | stock queso 0.1, ×2 | 1 faltante con nombre/montos | OK |
| U-08 | planConsumption insumo inexistente | Negativa | receta con id 99 | 1 faltante, disponible 0 | OK |
| U-09 | planConsumption producto sin receta | Positiva | receta vacía ×5 | consumo vacío, 0 faltantes | OK |
| U-10 | movingAverage ventana reciente | Positiva | [1,2,3,4] ventana 3 | 3 | OK |
| U-11 | movingAverage sin historial | Borde | `[]` | 0 | OK |
| U-12 | recommend redondea hacia arriba | Positiva | [2,2,3] ventana 3 | recomendado 3 | OK |
| U-13 | recommend ignora fuera de ventana | Positiva | [100,1,1,1] ventana 3 | recomendado 1 | OK |
| U-14 | percentChange variacion | Positiva | 120 vs 100; 80 vs 100 | +20; −20 | OK |
| U-15 | percentChange base cero | Borde | 50 vs 0; 0 vs 0 | `null` (no % ficticio) | OK |
| U-16 | daysRemaining stock/consumo | Positiva | 10/2; 1/3 | 5; 0.333 | OK |
| U-17 | daysRemaining consumo cero | Borde | consumo 0 / null / `'x'` | `null` | OK |
| U-18 | daysRemaining stock negativo | Borde | −1 / 2 | `null` (no dias negativos) | OK |
| U-19 | grossMargin ingreso − costo | Positiva | ingreso 18000, costo 10500 | margen 7500 (42%) | OK |
| U-20 | grossMargin negativo | Negativa | ingreso 5000, costo 7000 | margen −2000 (−40%) | OK |
| U-21 | grossMargin sin costo de insumos | Borde | `hasCost:false` | `null` (no numero enganoso) | OK |

## Unitarias — casos de uso (`test/application/`)

| ID | Caso | Tipo | Datos | Esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| U-22 | RegisterSale exitosa | Positiva | venta ×2 quesillo | stock 9.76/198, total 12000, consumo + auditoria | OK |
| U-23 | RegisterSale genera alerta al minimo | Positiva | stock 0.48, min 0.3 | 1 alerta WARNING | OK |
| U-24 | RegisterSale stock insuficiente | Negativa | stock 0.1, ×2 | `InsufficientStockError` + **cero escrituras** | OK |
| U-25 | RegisterSale validacion fallida | Negativa | `items:[]`; cantidad 0 | `ValidationError` + **cero escrituras** | OK |
| U-26 | RegisterSale producto inexistente | Negativa | `productId: 99` | `NotFoundError` + cero escrituras | OK |
| U-27 | CreateUser crea con hash y auditoria | Positiva | password `'secreta123'` | hash + auditoria CREATE | OK |
| U-28 | CreateUser username duplicado | Negativa | usuario existente | `ConflictError`, sin escrituras | OK |
| U-29 | CreateUser password corta | Negativa | `'123'` | `ValidationError` | OK |
| U-30 | GetDashboard ventanas equivalentes | Positiva | days 7 | pide `daysAgo` 0 y 7 | OK |
| U-31 | GetDashboard variacion con base | Positiva | 200 vs 100 | `changePercent` 100 | OK |
| U-32 | GetDashboard base cero | Borde | 150 vs 0 | `changePercent` `null` | OK |
| U-33 | GetDashboard margen desde receta | Positiva | receta 0.12×9000, ×2 | costo 2160, margen 9840 (82%) | OK |
| U-34 | GetDashboard sin costo registrado | Borde | insumo costo 0 con receta | `hasCost:false`, margen `null` | OK |
| U-35 | GetDashboard orden de inventario | Positiva | CRITICAL/WARNING/OK | orden por criticidad y dias | OK |

## Integracion (`test/integration/`)

| ID | Caso | Tipo | Datos | Esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| I-01 | Sin token | Seguridad | `GET /api/sales` | 401 | OK |
| I-02 | Flujo completo | Positiva | login → venta → tablero | venta visible y contada | OK |
| I-03 | Autorizacion por rol | Seguridad | cajero → `GET /api/users` | 403 | OK |
| I-04 | Validacion de entrada | Negativa | login sin password; cantidad 0; `productId` `'x'` | 400 `VALIDATION_ERROR` | OK |
| I-05 | Indisponibilidad de BD | Disponibilidad | `buildApp` con URL sin servidor | rechaza con `ECONNREFUSED` (no deja servidor semi-funcional) | OK |
| I-06 | Rollback de transaccion | Negativa | INSERT + throw dentro de la transaccion | **cero escrituras parciales** | OK |
| I-07 | Commit de transaccion | Positiva | INSERT + COMMIT | fila persiste y se limpia | OK |

## Pruebas manuales (demostracion / smoke)

| ID | Caso | Tipo | Accion | Esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| M-01 | Login valido | Positiva | `admin / admin123` | 200 + token | OK |
| M-02 | Recuperacion tras caida de BD | Disponibilidad | `docker compose stop db` → login → `start db` → login | 500 controlado → luego 200, sin reiniciar la app | OK |
| M-03 | Cobro end-to-end | Positiva | venta 2 productos desde la UI | toast de confirmacion + ticket imprimible | OK |
| M-04 | Analitica del tablero | Positiva | cambiar periodo 1/7/30 | KPIs, margen e inventario se recalculan | OK |

> M-01..M-04 se ejecutan contra `docker compose up` con un cliente HTTP o el
> navegador. M-02 evidencia la estrategia de operacion descrita en el README
> (seccion «Operacion sin internet o con el servicio caido»).
