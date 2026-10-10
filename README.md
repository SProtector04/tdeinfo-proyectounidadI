# Centro del Quesillo

Aplicacion web para la **transformacion digital del proceso de venta y control
de inventario** de un negocio real de quesillos. Proyecto de la *Unidad I:
Fundamentos y transformacion digital* de la asignatura **Tecnologia de la
Informacion**.

La aplicacion captura datos (ventas, insumos, movimientos), los almacena en
SQLite, los procesa con reglas de negocio y presenta informacion util para que
un usuario tome una decision: **alertas de stock bajo** y **recomendacion de
produccion** con limites claramente definidos.

---

## 1. Contexto y problema

Un "centro del quesillo" es un negocio de comida tipica nicaraguense que vende
quesillos, tiste y otras bebidas. El proceso actual es **manual**:

- Los pedidos se anotan en papel y se totalizan de memoria.
- El inventario (queso, tortilla, crema, cebolla...) se revisa "a ojo".
- No hay trazabilidad de quien hizo que, ni historial de ventas.
- Las decisiones de cuanta mercancia comprar/preparar se toman **solo por
  experiencia**, lo que provoca quiebres de stock o desperdicio.

**Problema delimitado**: falta una herramienta que registre ventas e inventario
de forma consistente y que convierta esos datos en **alertas** y
**recomendaciones** accionables.

## 2. Recorrido dato -> informacion -> conocimiento -> decision -> accion -> retroalimentacion

| Etapa | En esta aplicacion |
| --- | --- |
| **Dato** | Un item de venta (`producto`, `cantidad`), un movimiento de stock, un usuario. |
| **Informacion** | Total de una venta, stock actual de cada insumo, serie diaria de ingresos. |
| **Conocimiento** | Promedio de consumo diario por insumo; media movil de ventas por producto. |
| **Decision** | Que comprar y cuanto reponer; cuantas unidades preparar para el proximo dia. |
| **Accion** | Registrar una entrada de stock, preparar N quesillos, resolver una alerta. |
| **Retroalimentacion** | El historial de ventas/movimientos alimenta la media movil y el promedio de consumo. |

## 3. Requisitos de la practica cubiertos

- [x] Dos roles de usuario: `ADMIN` (gerente) y `CAJERO` (empleado).
- [x] Captura de datos por formularios web y API REST.
- [x] Persistencia en base de datos (SQLite).
- [x] Validacion de datos, manejo de errores y control de estados.
- [x] Regla de automatizacion (alertas de stock + recomendacion) con limites explicados.
- [x] Salida util para decidir: tablero, alertas y recomendacion.
- [x] Trazabilidad minima: usuario, fecha, accion y resultado (tabla `audit_logs`).
- [x] Funciones protegidas por rol (middleware de autorizacion).
- [x] Arquitectura coherente (Clean Architecture).
- [x] Ejecucion reproducible (Docker Compose).
- [x] Tecnologias habilitadoras: **analitica de datos** + **IA (prediccion simple)**.

## 4. Stack tecnologico

| Componente | Tecnologia | Imagen Docker Hub |
| --- | --- | --- |
| Runtime | Node.js 22 | `node:22-alpine` (oficial) |
| Framework web | Express 4 | - |
| Base de datos | SQLite (via `better-sqlite3`) | `nouchka/sqlite3` (contenedor CLI/admin) |
| Orquestacion | Docker Compose | - |
| Pruebas | `node:test` (nativo) | - |

> Nota sobre SQLite: es una base de datos **embebida** (un archivo). La
> aplicacion Node lee/escribe el archivo sobre un volumen compartido `db-data`.
> El contenedor `db` (imagen `nouchka/sqlite3`) mantiene vivo el CLI `sqlite3`
> para consultas, auditorias y respaldos: `docker compose exec db sqlite3
> /data/cdq.db`.

## 5. Requisitos

- [Docker](https://docs.docker.com/get-docker/) y Docker Compose, **o**
- Node.js >= 20 y npm.

## 6. Ejecucion

### Con Docker (recomendado)

```bash
cp .env.example .env            # opcional: ajustar credenciales y puerto
docker compose up --build
```

Abre `http://localhost:3000`.

### Local (sin Docker)

```bash
npm install
npm start
```

### Datos de prueba

Al primer arranque se siembran (idempotente):

- **Usuarios**: `admin / admin123` (ADMIN) y `cajero / cajero123` (CAJERO).
- **Insumos** (queso, tortilla, crema, cebolla, vinagre, chile, tiste, cacao) con stock y minimo.
- **Productos** (quesillo sencillo/con crema/doble, tiste, cacao, fresco) con sus recetas.

## 7. Reglas de automatizacion (y sus limites)

### 7.1 Alerta de stock bajo

Cuando una venta deja un insumo con `stock <= minimo`, se genera una alerta
(`WARNING`, o `CRITICAL` si `stock <= 0`) con una **reposicion sugerida** basada
en el consumo promedio diario de los ultimos 7 dias.

**Limites**: asume consumo estable; no anticipa picos (feriados, eventos);
depende de que los minimos esten bien configurados; la sugerencia es un
estimado, no una orden de compra.

### 7.2 Recomendacion de produccion (prediccion)

Recomienda cuantas unidades de cada producto preparar para el proximo dia usando
una **media movil simple (SMA)** de las ventas de los ultimos 7 dias.

**Limites**: no modela estacionalidad, dia de la semana ni clima; es una media
(sin tendencia); subestima productos nuevos sin historial. Es un **apoyo** a la
decision, no un reemplazo del criterio del gerente.

## 8. Tecnologias habilitadoras

1. **Analitica de datos**: el tablero agrega datos crudos en informacion
   (ventas de hoy, serie de ingresos, top productos, consumo promedio).
2. **IA (modelo predictivo simple)**: la SMA para la recomendacion de produccion.
3. **Nube (empacado)**: empaquetado con Docker, listo para desplegar en
   cualquier proveedor o servidor.

**Por que no IoT**: el proceso actual no usa sensores. Se deja como evolucion
(sensor de temperatura para la cadena de frio del queso y la crema).

## 9. Seguridad, privacidad y etica

- Contrasenas con hash `scrypt` (nunca en claro); tokens de sesion guardados como hash SHA-256.
- No se usan datos personales reales: los datos son **sinteticos**.
- Autorizacion por rol en cada endpoint (se niega informacion innecesaria).
- Trazabilidad de operaciones en `audit_logs`.
- Sin secretos en el repositorio (`.env` esta en `.gitignore`; existe `.env.example`).

## 10. Pruebas

```bash
npm test
```

Cubre: calculo de consumo, insuficiencia de stock, alertas, recomendacion y el
caso de uso central `RegisterSale` (descuento de stock, movimiento, auditoria y
alerta) contra una base SQLite en memoria. Ver `docs/pruebas.md` para la matriz
completa.

## 11. Estructura del proyecto (Clean Architecture)

```
centrodelquesillo/
├── src/
│   ├── domain/            # Entidades, value objects, servicios y puertos (sin deps externas)
│   ├── application/       # Casos de uso (orquestan dominio + puertos)
│   ├── infrastructure/    # Adaptadores: SQLite, auth, web (Express)
│   ├── config/            # Configuracion desde variables de entorno
│   ├── app.js             # Raiz de composicion (inversion de dependencias)
│   └── index.js           # Punto de entrada
├── public/                # Frontend estatico (HTML/CSS/JS)
├── test/                  # Pruebas unitarias e integracion
├── docs/                  # Arquitectura, modelo de datos, justificacion, pruebas
├── Dockerfile
└── docker-compose.yml
```

La **regla de dependencia** se respeta: `domain` no conoce nada externo;
`application` depende solo de puertos; `infrastructure` implementa esos puertos.
Las dependencias se ensamblan en un unico lugar (`src/app.js`).

## 12. Limitaciones y evolucion a produccion

- Autenticacion por token de sesion simple (sin refresh tokens ni bloqueo de intentos).
- Sin HTTPS (se resuelve con un proxy inverso / la plataforma de despliegue).
- SQLite es adecuado para un solo negocio; a escala multi-sucursal se migraria a PostgreSQL.
- La recomendacion es una SMA; se podria evolucionar a un modelo de series temporales.

## 13. Licencia

MIT. Ver `LICENSE`.
