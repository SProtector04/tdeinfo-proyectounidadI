# Modelo de datos

```mermaid
erDiagram
  USERS ||--o{ SALES : "registra"
  USERS ||--o{ INVENTORY_MOVEMENTS : "realiza"
  USERS ||--o{ AUDIT_LOGS : "genera"
  USERS ||--o{ SESSIONS : "posee"
  SALES ||--|{ SALE_ITEMS : "contiene"
  PRODUCTS ||--o{ SALE_ITEMS : ""
  PRODUCTS ||--o{ PRODUCT_INGREDIENTS : "receta"
  INGREDIENTS ||--o{ PRODUCT_INGREDIENTS : ""
  INGREDIENTS ||--o{ INVENTORY_MOVEMENTS : ""

  USERS {
    int id PK
    text name
    text username UK
    text password_hash
    text role
    int active
    timestamp created_at
  }
  SESSIONS {
    text token_hash PK
    int user_id FK
    timestamp expires_at
  }
  PRODUCTS {
    int id PK
    text name
    text category
    int price_cents
    int active
  }
  INGREDIENTS {
    int id PK
    text name
    text unit
    double_precision stock
    double_precision min_stock
    int cost_cents
    int active
  }
  PRODUCT_INGREDIENTS {
    int product_id PK,FK
    int ingredient_id PK,FK
    double_precision quantity
  }
  SALES {
    int id PK
    int user_id FK
    text customer_name
    int total_cents
    text status
    timestamp created_at
  }
  SALE_ITEMS {
    int id PK
    int sale_id FK
    int product_id FK
    double_precision quantity
    int unit_price_cents
    int subtotal_cents
  }
  INVENTORY_MOVEMENTS {
    int id PK
    int ingredient_id FK
    text type
    double_precision quantity
    text reason
    int user_id FK
    timestamp created_at
  }
  ALERTS {
    int id PK
    text type
    text severity
    text message
    text status
    timestamp created_at
    timestamp resolved_at
  }
  AUDIT_LOGS {
    int id PK
    int user_id FK
    text action
    text entity
    int entity_id
    text result
    timestamp created_at
  }
```

## Decisiones de diseno

- **Dinero en centavos enteros** (`*_cents`) para evitar errores de punto flotante.
- **Cantidades DOUBLE PRECISION redondeadas a 3 decimales** (kg, litro) en la capa de dominio.
- **Recetas** en `product_ingredients`: al vender un producto se descuenta
  automaticamente el insumo correspondiente.
- **Movimientos de inventario** tipados (`ENTRADA`, `SALIDA`, `AJUSTE`,
  `CONSUMO`) como fuente de trazabilidad y de la metrica de consumo promedio.
- **Sesiones** guardan el hash del token, nunca el token en claro.
- **`audit_logs`** implementa la trazabilidad minima (usuario, accion, entidad,
  resultado, fecha).
