# Centro del Quesillo

Aplicacion web para la transformacion digital del proceso de venta y control
de inventario de un negocio real de quesillos.

La aplicacion captura datos (ventas, insumos, movimientos), los almacena en
SQLite, los procesa con reglas de negocio y presenta informacion util para que
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

### Datos de prueba

Al primer arranque se siembran (idempotente):

- **Usuarios**: `admin / admin123` (ADMIN) y `cajero / cajero123` (CAJERO).
- **Insumos** (queso, tortilla, crema, cebolla, vinagre, chile, tiste, cacao) con stock y minimo.
- **Productos** (quesillo sencillo/con crema/doble, tiste, cacao, fresco) con sus recetas.


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
├── public/                # Frontend estatico (HTML/CSS/JS)
├── test/                  # Pruebas unitarias e integracion
├── docs/                  # Arquitectura, modelo de datos, justificacion, pruebas
├── Dockerfile
└── docker-compose.yml
```


## Limitaciones y evolucion a produccion

- Autenticacion por token de sesion simple (sin refresh tokens ni bloqueo de intentos).
- Sin HTTPS (se resuelve con un proxy inverso / la plataforma de despliegue).
- PostgreSQL es cliente-servidor: exige un motor corriendo (aqui, un contenedor) incluso para un unico punto de venta.
- La recomendacion es una SMA; se podria evolucionar a un modelo de series temporales.

## Licencia

MIT. Ver `LICENSE`.
