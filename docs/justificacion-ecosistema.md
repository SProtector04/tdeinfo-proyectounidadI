# Justificacion del ecosistema tecnologico

## Alternativas consideradas

| Criterio | Web + PostgreSQL + Node (elegida) | Movil nativa | Escritorio |
| --- | --- | --- | --- |
| Usuarios | Cajeros y gerente en el local (PC/tablet) | Necesita dispositivos por empleado | Una sola PC fija |
| Conectividad | Solo local (LAN), bajo costo | Depende de tiendas/app stores | Instalacion manual |
| Costo | Bajo (open source, sin licencias) | Mayor (SDKs, stores) | Bajo |
| Escalabilidad | Buena (crece a mas sucursales) | Buena | Limitada |
| Tiempo de desarrollo | Corto (ideal para el prototipo) | Largo | Medio |

**Seleccion**: aplicacion **web** con `Node.js + Express` y `PostgreSQL`,
desplegada con **Docker Compose**.

## Por que web

- Los usuarios ya tienen navegadores; no requiere instalacion por puesto.
- Permite separar claramente API (negocio) de interfaz (presentacion).
- Facil de probar, versionar y desplegar de forma reproducible (Docker).

## Por que PostgreSQL

- Base de datos relacional **cliente-servidor**, estandar y con SQL completo,
  adecuada para crecer a multiples puntos de venta o sucursales.
- Transacciones ACID, integridad referencial y concurrencia (varios cajeros
  escribiendo a la vez) sin los bloqueos de un archivo compartido.
- Se despliega facilmente con la imagen oficial (`postgres:16-alpine`); el
  puerto `Repository` aísla la app del motor concreto, facilitando el reemplazo.

## Por que Node.js

- Mismo lenguaje en todo el stack (JSON nativo, ecosistema maduro).
- Imagenes oficiales pequenas en Docker Hub (`node:22-alpine`).
- Permite modularizar en capas limpias con ESM.

## Tecnologias habilitadoras (se requieren al menos dos)

1. **Analitica de datos** -> tablero con agregaciones (ventas, ingresos, top productos, consumo promedio).
2. **IA (prediccion simple)** -> recomendacion de produccion por media movil simple.
3. **Nube (empacado)** -> imagenes de Docker Hub listas para desplegar en cualquier proveedor.

**IoT descartado**: el proceso no usa sensores hoy. Se propone como evolucion
(sensor de temperatura para la cadena de frio del queso/crema), documentado en
`README.md` (seccion 8).
