# Matriz de pruebas

Ejecucion: `npm test` (runner `node:test`).

| ID | Requisito | Tipo | Datos | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| T-01 | Calcular consumo de insumos | Positiva | Venta 2x (queso 0.12, tortilla 1) | consumo queso 0.24, tortilla 2 | consumo queso 0.24, tortilla 2 | OK |
| T-02 | Detectar stock insuficiente | Negativa | Venta de 100 tortillas (hay 5) | `InsufficientStockError` | `InsufficientStockError` | OK |
| T-03 | Detectar insumo inexistente | Negativa | Receta con `ingredientId` 99 | falta reportada | falta reportada | OK |
| T-04 | Alertas solo bajo minimo | Positiva | stock 10 > minimo 3 | 0 alertas | 0 alertas | OK |
| T-05 | Alerta WARNING | Positiva | stock 3 <= minimo 3 | 1 alerta `WARNING` | 1 alerta `WARNING` | OK |
| T-06 | Alerta CRITICAL | Positiva | stock 0 | 1 alerta `CRITICAL` | 1 alerta `CRITICAL` | OK |
| T-07 | Media movil simple | Positiva | [10,20,30] ventana 3 | promedio 20 | 20 | OK |
| T-08 | Recomendacion redondeada | Positiva | media 1.5 | recomendado 2 | 2 | OK |
| T-09 | Venta integra (descuento + movimiento + auditoria) | Positiva | Venta 2x quesillo | stock queso 9.76, 2 movimientos, 1 auditoria | coinciden | OK |
| T-10 | Venta integra genera alerta | Positiva | minimo tortilla 4, vender 2 | 1 alerta `LOW_STOCK` | 1 alerta `LOW_STOCK` | OK |

## Pruebas adicionales (manuales / API)

| ID | Requisito | Tipo | Accion | Esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| T-11 | Autenticacion | Negativa | Login con clave erronea | 401 `Credenciales invalidas` | OK |
| T-12 | Autorizacion por rol | Seguridad | Cajero accede a `/api/users` | 403 `Sin permisos` | OK |
| T-13 | Acceso sin sesion | Seguridad | `GET /api/sales` sin token | 401 `No autenticado` | OK |
| T-14 | Validacion de entrada | Negativa | Venta sin items | 400 | OK |

> Los casos T-11..T-14 se validan contra la API corriendo (`docker compose up`)
> con un cliente HTTP.
