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
| Base de datos | SQLite (via `better-sqlite3`) | `nouchka/sqlite3` (contenedor CLI/admin) |
| Orquestacion | Docker Compose | - |
| Pruebas | `node:test` (nativo) | - |

> Nota sobre SQLite: es una base de datos **embebida** (un archivo). La
> aplicacion Node lee/escribe el archivo sobre un volumen compartido `db-data`.
> El contenedor `db` (imagen `nouchka/sqlite3`) mantiene vivo el CLI `sqlite3`
> para consultas, auditorias y respaldos: `docker compose exec db sqlite3
> /data/cdq.db`.

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

```bash
npm install
npm start
```

### Datos de prueba

Al primer arranque se siembran (idempotente):

- **Usuarios**: `admin / admin123` (ADMIN) y `cajero / cajero123` (CAJERO).
- **Insumos** (queso, tortilla, crema, cebolla, vinagre, chile, tiste, cacao) con stock y minimo.
- **Productos** (quesillo sencillo/con crema/doble, tiste, cacao, fresco) con sus recetas.


## 11. Estructura del proyecto

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


## 12. Limitaciones y evolucion a produccion

- Autenticacion por token de sesion simple (sin refresh tokens ni bloqueo de intentos).
- Sin HTTPS (se resuelve con un proxy inverso / la plataforma de despliegue).
- SQLite es adecuado para un solo negocio; a escala multi-sucursal se migraria a PostgreSQL.
- La recomendacion es una SMA; se podria evolucionar a un modelo de series temporales.

## 13. Licencia

MIT. Ver `LICENSE`.
