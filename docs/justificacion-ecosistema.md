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

## Enfoque en analitica y apoyo a la decision

La practica se centro en **analitica de datos y arquitectura de la informacion**
en lugar de en tecnologias habilitadoras adicionales (nube, IoT, IA). La
justificacion es doble: (1) la naturaleza del negocio es un mostrador local con
conexion intermittente, donde una dependencia de un servicio externo agregaria
riesgo sin resolver un problema real del proceso; (2) el objetivo declarado fue
**sacar mas partido a los datos que el negocio ya genera** antes de anadir
fuentes nuevas.

### Analitica implementada (sin dependencias externas)

| Capacidad | Descripcion | Limite declarado |
| --- | --- | --- |
| Ventana de analisis | KPIs para 1, 7 o 30 dias, con variacion contra el periodo anterior equivalente | Ventanas fijas; base cero → sin porcentaje (evita un numero ficticio) |
| Margen bruto por producto | Ingreso − costo de insumos de la receta | Costo **actual**, no historico; sin costo registrado → sin margen |
| Dias de inventario | `stock / consumo_prom_diario` por insumo | Sin consumo no estima; la fraccion de dia es una aproximacion |
| Recomendacion de produccion | Media movil simple (SMA) sobre ventas diarias | No modela estacionalidad, feriados ni tendencia |

### Por que no se incorporaron las demas habilitadoras

- **Nube**: el punto de venta opera en el local; una dependencia de un servicio
  externo agregaria costo y falla sin resolver un problema del proceso.
- **IoT**: el proceso no usa sensores. Se propone como evolucion (sensor de
  temperatura para la cadena de frio del queso/crema), documentado en el README.
- **IA**: no se justifica para el volumen y el tipo de decision del negocio.
  La recomendacion de produccion es una SMA, que se documenta y prueba como
  **analitica predictiva simple**, no como modelo de IA.
