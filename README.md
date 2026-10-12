# Centro del Quesillo

Aplicacion web para la transformacion digital del proceso de venta y control
de inventario de un negocio real de quesillos.

La aplicacion captura datos (ventas, insumos, movimientos), los almacena en
PostgreSQL, los procesa con reglas de negocio y presenta informacion util para que
los propietarios del establecimiento reciban alertas de stock bajo y recomendaciones de
produccion con limites claramente definidos.

---

## Stack tecnologico

| Componente | Tecnologia | Imagen Docker Hub |
| --- | --- | --- |
| Runtime | Node.js 22 | `node:22-alpine` (oficial) |
| Framework web | Express 4 | - |
| Base de datos | PostgreSQL (via `pg`) | `postgres:16-alpine` (oficial) |
| Orquestacion | Docker Compose | - |
| Pruebas | `node:test` (nativo) | - |

> Nota sobre PostgreSQL: es una base de datos **cliente-servidor**. El
> contenedor `db` (imagen `postgres:16-alpine`) persiste los datos operativos
> (variables) en el volumen `pg-data`; la aplicacion se conecta por red via
> `DATABASE_URL`. Los datos fijos de prueba se siembran desde el codigo de forma
> idempotente. Para consultas y respaldos: `docker compose exec db psql -U cdq -d cdq`.

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) y Docker Compose, **o**
- Node.js >= 20 y npm.

## Ejecucion

### Con Docker (recomendado)

```bash
cp .env.example .env            # opcional: ajustar credenciales y puerto
docker compose up --build
```

Abre `http://localhost:3000`.

### Local (sin Docker)

Requiere un PostgreSQL corriendo en `localhost:5432` (o ajustar `DATABASE_URL`):

```bash
npm install
DATABASE_URL=postgresql://cdq:cdq@localhost:5432/cdq npm start
```

### Pruebas

```bash
npm test          # pruebas unitarias de dominio y casos de uso (sin infraestructura)
npm run test:int  # integracion contra PostgreSQL (requiere el `db` del compose corriendo;
                  # se omiten automaticamente si la base no esta disponible)
```

La suite de integracion cubre el recorrido funcional (login, venta, tablero,
autorizacion), la validacion de entradas y el rollback de transacciones contra
PostgreSQL real.

### Datos de prueba

Al primer arranque se siembran (idempotente):

- **Usuarios**: `admin / admin123` (ADMIN) y `cajero / cajero123` (CAJERO).
- **Insumos** (queso, tortilla, crema, cebolla, vinagre, chile, tiste, cacao) con stock y minimo.
- **Productos** (quesillo sencillo/con crema/doble, tiste, cacao, fresco) con sus recetas.

### Poblacion historica (demostracion)

Para la demostracion con datos representativos hay un generador de historial:

```bash
npm run seed:history              # ~3 meses (90 dias, ~30 clientes/dia, ~2800 ventas)
npm run seed:history -- --days=30 # ajustar la ventana
```

Genera ventas con seleccion aleatoria de productos (pesos realistas), descuenta
insumos por receta, registra movimientos de `CONSUMO` y reposiciones `ENTRADA`
en tiempos oportunos (compra matutina al caer bajo el doble del minimo, mas
reposiciones urgentes si una venta no alcanza), y crea/resuelve alertas de
stock bajo. Requiere la base base ya sembrada (arrancar la app una vez) y
**reinicia** el historial transaccional antes de generar.


## Estructura del proyecto

```
centrodelquesillo/
├── src/
│   ├── domain/            # Entidades, value objects, servicios y puertos (sin deps externas)
│   ├── application/       # Casos de uso (orquestan dominio + puertos)
│   ├── infrastructure/    # Adaptadores: PostgreSQL, auth, web (Express)
│   ├── config/            # Configuracion desde variables de entorno
│   ├── app.js             # Raiz de composicion (inversion de dependencias)
│   └── index.js           # Punto de entrada
├── public/                # Frontend estatico multi-pagina (sin framework)
│   ├── js/
│   │   ├── ui.js          # Toasts, escape HTML, fechas, carga, paginacion
│   │   ├── api.js         # Cliente fetch + formatMoney
│   │   ├── common.js      # Nav, sesion, errores de formulario
│   │   └── components/    # Componentes reutilizables (tabla)
│   ├── css/               # Estilos (incluye reglas de impresion del ticket)
│   └── *.html             # Una pagina por pantalla
├── test/
│   ├── domain/            # Reglas de negocio puras
│   ├── application/       # Casos de uso con repositorios fake en memoria
│   ├── integration/       # API y transacciones contra PostgreSQL real
│   └── helpers/           # Dobles de prueba
├── docs/                  # Arquitectura, modelo de datos, justificacion, pruebas
├── scripts/               # Utilidades (poblacion historica de demostracion)
├── Dockerfile
└── docker-compose.yml
```


## Limitaciones y evolucion a produccion

- Autenticacion por token de sesion simple (sin refresh tokens ni bloqueo de intentos).
- Sin HTTPS (se resuelve con un proxy inverso / la plataforma de despliegue).
- PostgreSQL es cliente-servidor: exige un motor corriendo (aqui, un contenedor) incluso para un unico punto de venta.
- La recomendacion es una SMA; se podria evolucionar a un modelo de series temporales.

## Operacion sin internet o con el servicio caido

El prototipo esta disenado para operar **en el local**, sin depender de un
servicio externo en tiempo real. Comportamiento documentado y verificado:

- **Sin internet (solo la app)**: el navegador carga los archivos estaticos y
  la API desde el mismo host; el flujo de cobro, inventario y tablero sigue
  funcionando. Solo hace falta internet para descargar las imagenes de Docker
  la primera vez.
- **Cliente sin conexion al servidor**: el cliente (`public/js/api.js`)
  reintenta una vez las lecturas (GET) y muestra «Sin conexion con el
  servidor» si no responde. Las escrituras (POST) **no** se reintentan solas
  para no duplicar una venta o un movimiento de inventario; el usuario decide
  reenviar.
- **Base de datos caida**: `buildApp` rechaza el arranque (no deja un servidor
  semi-funcional con el pool roto). En Docker, `app` espera a que el
  healthcheck de `db` lo marque sano antes de levantar. Si la BD se cae con la
  app corriendo, cada request responde `500` con mensaje generico y el proceso
  sigue vivo para la siguiente peticion (no se reinicia ni fuga detalles
  internos). Verificado por I-05 y M-02.
- **Recuperacion**: al restaurar la BD, las peticiones vuelven a responder sin
  reiniciar la aplicacion.

## Guion de demostracion (10 minutos)

Escenario completo: ingreso de datos → procesamiento → decision → acción →
retroalimentacion.

1. **Ingreso (1 min)** — Login como `admin`. Ir a **Ventas → Cobrar** y
   registrar una venta de 2 quesillos sencillos a un cliente. Ver el toast de
   confirmacion y el **ticket imprimible**.
2. **Procesamiento (1 min)** — Abrir **Inventario → Estado**: el stock del
   queso bajo y el insumo quedo en nivel WARNING. Cambiar a **Movimientos** y
   ver el registro `CONSUMO` con usuario, fecha y motivo (`Venta #N`).
3. **Decision (2 min)** — Abrir el **Tablero**: el selector de periodo en
   **Hoy / 7 dias / 30 dias** recalcula KPIs, variacion vs. periodo anterior,
   margen bruto por producto y dias de inventario restante. Explicar el limite
   de cada metrica (costo actual, SMA sin estacionalidad).
4. **Accion (1 min)** — En **Inventario**, registrar una **entrada de stock**
   desde la accion de la fila del insumo. Volver al tablero y ver el inventario
   recalculado.
5. **Retroalimentacion (1 min)** — Abrir **Alertas**, ver el resumen de
   severidad y **resolver** la alerta. Consultar **Auditoria** (`/api/audit`) y
   mostrar la trazabilidad: usuario, fecha, accion y resultado de cada paso.
6. **Limitaciones (1 min)** — Explicar por que el prototipo no es produccion
   aun: sin HTTPS, autenticacion simple, SMA sin tendencia, costo no historico.

> El resto del tiempo (3 min) se usa para preguntas y respuestas.

## Licencia y atribucion de terceros

Codigo propio bajo licencia **MIT** (ver `LICENSE`).

Depencias de terceros (licencias de sus autores originales; no se redistribuye
codigo fuente de estas):

| Paquete | Uso | Licencia |
| --- | --- | --- |
| [`express`](https://www.npmjs.com/package/express) | Framework web (rutas y middleware) | MIT |
| [`pg`](https://www.npmjs.com/package/pg) | Cliente de PostgreSQL | MIT |

Las imagenes base (`node:22-alpine`, `postgres:16-alpine`) se obtienen de
Docker Hub y se usan tal cual; sus licencias aplican por separado.
