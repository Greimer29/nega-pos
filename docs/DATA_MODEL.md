# Modelo de Datos — Mes 1

> Este documento define las entidades, atributos y relaciones del Mes 1. **Cualquier cambio requiere aprobación explícita.** Si el agente identifica que algo le falta, debe proponerlo como cambio antes de implementarlo.

## Diagrama de entidades (alto nivel)

```
┌─────────────┐         ┌─────────────┐         ┌─────────────────────┐
│   Cliente   │────1:N──│   Pedido    │────1:N──│  PedidoMaterial     │
└─────────────┘         └─────────────┘         │  (receta del pedido)│
                              │                  └─────────────────────┘
                              │                            │
                              │                            │ N:1
                              │                            ▼
                              │                  ┌─────────────────────┐
                              │                  │     Material        │
                              │                  └─────────────────────┘
                              │                            │
                              │                            │ 1:N
                              │                            ▼
                              │                  ┌─────────────────────┐
                              │                  │ MovimientoInventario│
                              │                  └─────────────────────┘
                              │                            ▲
                              │                            │ N:1 (opcional)
                              ▼                            │
                       ┌─────────────┐                     │
                       │   Compra    │────1:N──┐           │
                       └─────────────┘         │           │
                              │                ▼           │
                              │ N:1     ┌─────────────────┐│
                              ▼         │  CompraItem     ├┘
                       ┌─────────────┐  └─────────────────┘
                       │ Proveedor   │
                       └─────────────┘
                              ▲
                              │ N:1 (opcional)
                              │
                       ┌─────────────────┐         ┌─────────────┐
                       │  GastoMaquina   │────N:1──│   Maquina   │
                       └─────────────────┘         └─────────────┘
                              │
                              │ N:1 (opcional)
                              ▼
                       ┌─────────────┐
                       │   Cuenta    │
                       └─────────────┘
                              ▲
                              │ N:1 (opcional)
              ┌───────────────┼───────────────┐
              │               │               │
       ┌─────────────┐ ┌───────────┐ ┌─────────────────┐
       │   Compra    │ │  Gasto    │ │  GastoMaquina   │
       └─────────────┘ │ (empresa) │ └─────────────────┘
                       └───────────┘
```

**Nota:** `GastoMaquina` referencia opcionalmente a `Proveedor`, pero **no toca inventario** ni se conecta a `Pedido`, `Compra` ni `Material`. Es un flujo financiero independiente.

`Cuenta` agrupa movimientos financieros (compras confirmadas, gastos de empresa y gastos de máquina) para filtrado y reportes. La asignación es opcional (`account_id` nullable).

## Reglas de dominio (críticas)

1. **El stock de un material es la suma de sus `MovimientoInventario`.** No se guarda como columna calculada en `Material`. Se calcula on-demand (vista o query). Esto evita inconsistencias.
2. **Una `Compra` aprobada genera automáticamente `MovimientoInventario` de tipo `ENTRADA_COMPRA`** por cada `CompraItem`.
3. **Un `Pedido` al pasar a estado `EN_PRODUCCION` genera `MovimientoInventario` de tipo `SALIDA_PEDIDO`** por cada `PedidoMaterial`.
4. **Si al pasar un pedido a `EN_PRODUCCION` no hay stock suficiente**, la operación se **bloquea por defecto** con HTTP 409 y detalle por material faltante. El dueño puede repetir la transición pasando `forzar=true` para proceder igual (caso "tengo stock que no registré"). Cuando se fuerza, los `MovimientoInventario` generados deben llevar en `nota` el texto `"FORZADO_SIN_STOCK_SUFICIENTE"` para trazabilidad. El stock puede quedar negativo en ese caso, y eso es aceptable y visible en la UI.
5. **Los movimientos de inventario son inmutables.** Para corregir, se crea un movimiento de ajuste, no se edita el anterior.
6. **Borrar un pedido en estado distinto de `BORRADOR` no está permitido.** Solo cancelar (estado `CANCELADO`), que revierte los movimientos de inventario asociados creando movimientos de tipo `AJUSTE_REVERSION`.
7. **Los gastos de máquinas NO afectan el inventario.** Aunque un "insumo" suene parecido a un "material", los gastos de máquina (aceite, agujas, repuestos) se registran como `GastoMaquina` y NO generan `MovimientoInventario`. Son flujos financieros distintos y separados.
8. **El `estado` de una `Maquina` no cambia automáticamente al registrar gastos.** Es un campo informativo que el dueño actualiza manualmente cuando lo considera necesario.
9. **Receta vacía al transicionar a `EN_PRODUCCION`:** si un pedido no tiene ningún `PedidoMaterial` cargado al pasar de `CONFIRMADO` a `EN_PRODUCCION`, la transición es **válida y procede normalmente** (HTTP 200, NO 422). No se generan movimientos de inventario (consistente con la regla 3: "movimientos por cada `PedidoMaterial`"; con cero materiales, cero movimientos). La respuesta exitosa incluye `warnings: [{ code: "RECETA_VACIA", message: "..." }]` y la UI muestra un banner persistente mientras el pedido siga en ese estado. Esta política es intencionalmente permisiva en Mes 1; endurecerla a 422 queda evaluado en ciclos futuros (ver `BACKLOG.md` item 002).

## Entidades

### Cliente

| Campo      | Tipo         | Constraints                 | Notas                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id         | bigint       | PK, auto-increment          |                                                                                                                                                                                                                                                                                                                                                                 |
| nombre     | varchar(150) | NOT NULL                    |                                                                                                                                                                                                                                                                                                                                                                 |
| telefono   | varchar(20)  | NULL, unique cuando no null | Formato E.164 normalizado (`+57300...`)                                                                                                                                                                                                                                                                                                                         |
| email      | varchar(150) | NULL, unique cuando no null |                                                                                                                                                                                                                                                                                                                                                                 |
| tipo       | enum         | NOT NULL                    | `WHITE_LABEL`, `CORPORATIVO`, `OTRO`. **Informativo:** indica el tipo habitual del cliente. Cada `Pedido` tiene su propia `modalidad` independiente; un cliente "CORPORATIVO" puede tener un pedido `WHITE_LABEL` si así lo decide la operación. La UI puede pre-llenar `Pedido.modalidad` con `Cliente.tipo` por conveniencia pero el usuario puede cambiarla. |
| documento  | varchar(30)  | NULL                        | Cédula/NIT/etc., libre                                                                                                                                                                                                                                                                                                                                          |
| direccion  | varchar(255) | NULL                        |                                                                                                                                                                                                                                                                                                                                                                 |
| notas      | text         | NULL                        |                                                                                                                                                                                                                                                                                                                                                                 |
| activo     | boolean      | NOT NULL, default true      | Soft "archivado"                                                                                                                                                                                                                                                                                                                                                |
| created_at | timestamp    | NOT NULL                    |                                                                                                                                                                                                                                                                                                                                                                 |
| updated_at | timestamp    | NOT NULL                    |                                                                                                                                                                                                                                                                                                                                                                 |

**Índices:** `(nombre)`, `(telefono)`, `(tipo)`.

**Validaciones:**

- `telefono`: si se provee, debe normalizarse a E.164 antes de guardar. **País por defecto: Colombia (`CO`, +57)**. Si el número viene con `+` se respeta tal cual; si viene sin `+`, se asume CO y se normaliza. Implementación con `libphonenumber-js`. Si el número no es válido en CO ni en ningún país detectable: 422.
- `email`: si se provee, validar formato.

### Proveedor

| Campo      | Tipo         | Constraints            | Notas |
| ---------- | ------------ | ---------------------- | ----- |
| id         | bigint       | PK                     |       |
| nombre     | varchar(150) | NOT NULL               |       |
| telefono   | varchar(20)  | NULL                   |       |
| email      | varchar(150) | NULL                   |       |
| notas      | text         | NULL                   |       |
| activo     | boolean      | NOT NULL, default true |       |
| created_at | timestamp    | NOT NULL               |       |
| updated_at | timestamp    | NOT NULL               |       |

### Material

| Campo                 | Tipo          | Constraints                                | Notas                                                            |
| --------------------- | ------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| id                    | bigint        | PK                                         |                                                                  |
| codigo                | varchar(30)   | NULL, unique cuando no null                | Código interno opcional                                          |
| nombre                | varchar(150)  | NOT NULL                                   |                                                                  |
| descripcion           | text          | NULL                                       |                                                                  |
| categoria             | enum          | NOT NULL                                   | `TELA`, `HILO`, `BOTON`, `ELASTICO`, `ETIQUETA`, `BOLSA`, `OTRO` |
| unidad                | enum          | NOT NULL                                   | `METRO`, `KILO`, `UNIDAD`, `ROLLO`, `LITRO`                      |
| stock_minimo          | decimal(12,3) | NOT NULL, default 0                        | Para alertas                                                     |
| ubicacion             | varchar(100)  | NULL                                       | "Estante A2", etc.                                               |
| proveedor_habitual_id | bigint        | NULL, FK→proveedores.id ON DELETE SET NULL |                                                                  |
| precio_ultima_compra  | decimal(12,2) | NULL                                       | Cacheado, se actualiza al crear `CompraItem`                     |
| activo                | boolean       | NOT NULL, default true                     |                                                                  |
| created_at            | timestamp     | NOT NULL                                   |                                                                  |
| updated_at            | timestamp     | NOT NULL                                   |                                                                  |

**Índices:** `(nombre)`, `(categoria)`, `(proveedor_habitual_id)`.

**Stock actual** (calculado, NO almacenado): `SUM(movimientos_inventario.cantidad WHERE material_id = ?)`. Los movimientos de entrada tienen cantidad positiva, los de salida negativa.

### MovimientoInventario

| Campo          | Tipo          | Constraints                                   | Notas                                                                  |
| -------------- | ------------- | --------------------------------------------- | ---------------------------------------------------------------------- |
| id             | bigint        | PK                                            |                                                                        |
| material_id    | bigint        | NOT NULL, FK→materiales.id ON DELETE RESTRICT |                                                                        |
| tipo           | enum          | NOT NULL                                      | `ENTRADA_COMPRA`, `SALIDA_PEDIDO`, `AJUSTE_MANUAL`, `AJUSTE_REVERSION` |
| cantidad       | decimal(12,3) | NOT NULL                                      | Positiva = entrada, negativa = salida. Validar coherencia con `tipo`   |
| compra_item_id | bigint        | NULL, FK→compra_items.id ON DELETE RESTRICT   | Set cuando tipo=ENTRADA_COMPRA                                         |
| pedido_id      | bigint        | NULL, FK→pedidos.id ON DELETE RESTRICT        | Set cuando tipo es relacionado a pedido                                |
| nota           | varchar(255)  | NULL                                          | Razón del ajuste manual, por ejemplo                                   |
| created_at     | timestamp     | NOT NULL                                      |                                                                        |

**Índices:** `(material_id, created_at)`, `(pedido_id)`, `(compra_item_id)`.

**Inmutable:** no hay `updated_at`. No se permite UPDATE ni DELETE vía API.

### Compra

| Campo           | Tipo          | Constraints                                    | Notas                                    |
| --------------- | ------------- | ---------------------------------------------- | ---------------------------------------- |
| id              | bigint        | PK                                             |                                          |
| proveedor_id    | bigint        | NOT NULL, FK→proveedores.id ON DELETE RESTRICT |                                          |
| fecha           | date          | NOT NULL                                       | Fecha real de la compra                  |
| numero_factura  | varchar(50)   | NULL                                           |                                          |
| archivo_factura | varchar(255)  | NULL                                           | Path en storage                          |
| total           | decimal(12,2) | NOT NULL                                       | Suma de items, calculado al crear/editar |
| estado          | enum          | NOT NULL, default 'BORRADOR'                   | `BORRADOR`, `CONFIRMADA`                 |
| notas           | text          | NULL                                           |                                          |
| created_at      | timestamp     | NOT NULL                                       |                                          |
| updated_at      | timestamp     | NOT NULL                                       |                                          |

**Reglas:**

- En estado `BORRADOR`: editable, no genera movimientos de inventario.
- Al pasar a `CONFIRMADA`: genera `MovimientoInventario` ENTRADA_COMPRA por cada item. Una vez confirmada, NO se puede volver a borrador. Para corregir, ajustes manuales.

### CompraItem

| Campo           | Tipo          | Constraints                                   | Notas                                                                                               |
| --------------- | ------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| id              | bigint        | PK                                            |                                                                                                     |
| compra_id       | bigint        | NOT NULL, FK→compras.id ON DELETE CASCADE     | Cascade solo válido si compra está en BORRADOR; en confirmada el RESTRICT del movimiento lo bloquea |
| material_id     | bigint        | NOT NULL, FK→materiales.id ON DELETE RESTRICT |                                                                                                     |
| cantidad        | decimal(12,3) | NOT NULL, > 0                                 |                                                                                                     |
| precio_unitario | decimal(12,2) | NOT NULL, >= 0                                |                                                                                                     |
| subtotal        | decimal(12,2) | NOT NULL                                      | Calculado: cantidad \* precio_unitario                                                              |
| created_at      | timestamp     | NOT NULL                                      |                                                                                                     |
| updated_at      | timestamp     | NOT NULL                                      |                                                                                                     |

### Pedido

| Campo                  | Tipo          | Constraints                                 | Notas                                                                     |
| ---------------------- | ------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| id                     | bigint        | PK                                          |                                                                           |
| codigo                 | varchar(20)   | NOT NULL, unique                            | Generado: `PED-YYYYMM-NNNN`. Ver sección "Generación de código de pedido" |
| cliente_id             | bigint        | NOT NULL, FK→clientes.id ON DELETE RESTRICT |                                                                           |
| modalidad              | enum          | NOT NULL                                    | `WHITE_LABEL`, `CORPORATIVO`                                              |
| descripcion            | text          | NOT NULL                                    | Qué producir, libre, sin tabla de productos aún                           |
| cantidad_total         | int           | NOT NULL, >= 1                              | Cantidad de prendas                                                       |
| fecha_pedido           | date          | NOT NULL                                    |                                                                           |
| fecha_entrega_estimada | date          | NULL                                        |                                                                           |
| estado                 | enum          | NOT NULL, default 'BORRADOR'                | Ver máquina de estados abajo                                              |
| precio_total           | decimal(12,2) | NULL                                        | Acordado con el cliente                                                   |
| notas                  | text          | NULL                                        |                                                                           |
| archivo_referencia     | varchar(255)  | NULL                                        | Imagen/PDF de muestra                                                     |
| created_at             | timestamp     | NOT NULL                                    |                                                                           |
| updated_at             | timestamp     | NOT NULL                                    |                                                                           |

**Máquina de estados:**

```
BORRADOR ──▶ CONFIRMADO ──▶ EN_PRODUCCION ──▶ ENTREGADO
   │              │                │
   └──▶ CANCELADO ◀────────────────┘
```

- `BORRADOR → CONFIRMADO`: el pedido queda comprometido con el cliente. Se valida que tenga cliente, descripción, cantidad_total > 0. **NO toca stock**. No es reversible: si el dueño se equivocó, debe cancelar y crear pedido nuevo (esto evita editar pedidos ya comprometidos con un cliente).
- `CONFIRMADO → EN_PRODUCCION`: **descuenta stock** generando movimientos SALIDA_PEDIDO por cada material de la receta. Aplica la política de stock insuficiente de la regla 4 (bloqueo 409 salvo `forzar=true`). **Si la receta está vacía** (cero `PedidoMaterial`): transición válida, cero movimientos, respuesta con `warnings: [{ code: "RECETA_VACIA" }]` (ver regla 9).
- `EN_PRODUCCION → ENTREGADO`: cierre del pedido. No toca stock.
- `BORRADOR → CANCELADO`: simple, no había movimientos.
- `CONFIRMADO → CANCELADO`: simple, no había movimientos.
- `EN_PRODUCCION → CANCELADO`: reversa los movimientos SALIDA_PEDIDO generando AJUSTE_REVERSION con cantidad opuesta.
- **No se puede cancelar un pedido `ENTREGADO`.** Si hay devolución del cliente, ese es otro flujo que vendrá en módulos futuros.
- Todas las transiciones que tocan stock se ejecutan en transacción de DB.

### PedidoMaterial (receta del pedido)

| Campo               | Tipo          | Constraints                                   | Notas                                                                           |
| ------------------- | ------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| id                  | bigint        | PK                                            |                                                                                 |
| pedido_id           | bigint        | NOT NULL, FK→pedidos.id ON DELETE CASCADE     | Solo si pedido en BORRADOR                                                      |
| material_id         | bigint        | NOT NULL, FK→materiales.id ON DELETE RESTRICT |                                                                                 |
| cantidad_por_prenda | decimal(12,3) | NOT NULL, > 0                                 | **Cantidad de material por UNA prenda producida.** Ej. 2 m de tela por camiseta |
| notas               | varchar(255)  | NULL                                          |                                                                                 |
| created_at          | timestamp     | NOT NULL                                      |                                                                                 |
| updated_at          | timestamp     | NOT NULL                                      |                                                                                 |

**Único:** `(pedido_id, material_id)`.

**Cálculo del consumo total** (NO almacenado, se calcula on-demand):

```
consumo_total_proyectado = cantidad_por_prenda × pedido.cantidad_total
```

Ejemplo: pedido de 100 camisetas, receta dice 2 m de tela por prenda → consumo total proyectado = 200 m.

**Al transicionar el pedido a `EN_PRODUCCION`**, el `MovimientoInventario` generado para cada `PedidoMaterial` tiene `cantidad = -(cantidad_por_prenda × pedido.cantidad_total)`. Esta es la cifra que descuenta del stock.

**La UI debe mostrar siempre los dos números** al editar la receta:

- "Cantidad por prenda: 2 m" (input editable)
- "Consumo total proyectado: 200 m" (label calculado en vivo a partir de `pedido.cantidad_total`)

Esto previene errores de interpretación.

### Contador (secuencias)

Tabla auxiliar para generar secuencias monotónicas por scope. En Mes 1 se usa solo para códigos de pedido.

| Campo      | Tipo         | Constraints         | Notas                                               |
| ---------- | ------------ | ------------------- | --------------------------------------------------- |
| scope      | varchar(50)  | PK                  | Ej. `pedido_202601` (un scope por mes para pedidos) |
| valor      | int unsigned | NOT NULL, default 0 | Última secuencia entregada                          |
| updated_at | timestamp    | NOT NULL            |                                                     |

**Generación del código de pedido:**

El código tiene formato `PED-YYYYMM-NNNN` (ej. `PED-202601-0001`). El contador **se reinicia cada mes**.

Algoritmo (debe ejecutarse dentro de la transacción que crea el pedido):

1. Calcular `scope = "pedido_" + fecha_pedido_yyyymm`.
2. `INSERT INTO contadores (scope, valor) VALUES (?, 1) ON DUPLICATE KEY UPDATE valor = valor + 1` (MySQL atomic).
3. `SELECT valor FROM contadores WHERE scope = ?` (en la misma transacción).
4. Formatear: `PED-{yyyymm}-{valor.toString().padStart(4, '0')}`.
5. Insertar el pedido con ese código.

**Por qué este enfoque:**

- No usa `MAX(codigo) + 1` (frágil bajo concurrencia).
- No usa secuencias nativas (MySQL no las tiene como Postgres).
- El `ON DUPLICATE KEY UPDATE` es atómico a nivel de fila en InnoDB.
- Reinicio mensual implícito porque el scope cambia.

Si `NNNN` excede 9999 en un mes (improbable en Nega POS), el sistema debe lanzar excepción explícita — NO truncar ni reusar números.

### Usuario (auth)

| Campo      | Tipo         | Constraints                  | Notas                    |
| ---------- | ------------ | ---------------------------- | ------------------------ |
| id         | bigint       | PK                           |                          |
| email      | varchar(150) | NOT NULL, unique             |                          |
| password   | varchar(255) | NOT NULL                     | Hash (scrypt vía Adonis) |
| nombre     | varchar(100) | NOT NULL                     |                          |
| rol        | enum         | NOT NULL, default 'OPERADOR' | `OPERADOR`, `ADMIN`      |
| activo     | boolean      | NOT NULL, default true       |                          |
| created_at | timestamp    | NOT NULL                     |                          |
| updated_at | timestamp    | NOT NULL                     |                          |

**Mes 1:** solo se crea 1 usuario manualmente (el dueño). UI de gestión de usuarios queda para más adelante.

### Maquina

| Campo             | Tipo          | Constraints                   | Notas                                                                                          |
| ----------------- | ------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| id                | bigint        | PK                            |                                                                                                |
| nombre            | varchar(100)  | NOT NULL                      | Ej. "Recta 1", "Fileteadora Singer"                                                            |
| tipo              | enum          | NOT NULL                      | `RECTA`, `FILETEADORA`, `COLLARETERA`, `CORTADORA`, `BORDADORA`, `OTRO`                        |
| marca             | varchar(80)   | NULL                          |                                                                                                |
| modelo            | varchar(80)   | NULL                          |                                                                                                |
| serie             | varchar(80)   | NULL                          | Número de serie                                                                                |
| fecha_adquisicion | date          | NULL                          |                                                                                                |
| costo_adquisicion | decimal(12,2) | NULL                          | Informativo, NO se usa en cálculos en Mes 1                                                    |
| estado            | enum          | NOT NULL, default `OPERATIVA` | `OPERATIVA`, `EN_REPARACION`, `FUERA_DE_SERVICIO`. Solo informativo, no cambia automáticamente |
| ubicacion         | varchar(100)  | NULL                          | "Zona corte", "Línea 2", etc.                                                                  |
| notas             | text          | NULL                          |                                                                                                |
| activa            | boolean       | NOT NULL, default true        | Soft archive                                                                                   |
| created_at        | timestamp     | NOT NULL                      |                                                                                                |
| updated_at        | timestamp     | NOT NULL                      |                                                                                                |

**Índices:** `(nombre)`, `(tipo)`, `(estado)`.

### GastoMaquina

| Campo               | Tipo          | Constraints                                 | Notas                                                                                     |
| ------------------- | ------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| id                  | bigint        | PK                                          |                                                                                           |
| maquina_id          | bigint        | NOT NULL, FK→maquinas.id ON DELETE RESTRICT | No se puede borrar una máquina con gastos                                                 |
| fecha               | date          | NOT NULL                                    | Fecha del gasto                                                                           |
| categoria           | enum          | NOT NULL                                    | `REPARACION`, `INSUMO`, `MANTENIMIENTO`, `OTRO`                                           |
| descripcion         | varchar(255)  | NOT NULL                                    | "Cambio de aguja", "Aceite lubricante", "Servicio técnico anual"                          |
| monto               | decimal(12,2) | NOT NULL, > 0                               | Validar > 0 a nivel de aplicación; en DB usar CHECK si MySQL/InnoDB lo soporta en versión |
| proveedor_id        | bigint        | NULL, FK→proveedores.id ON DELETE SET NULL  | Reutiliza tabla `proveedores`. Opcional                                                   |
| archivo_comprobante | varchar(255)  | NULL                                        | Path en storage. Reglas de upload en `PROJECT_CONTEXT.md`                                 |
| notas               | text          | NULL                                        |                                                                                           |
| created_at          | timestamp     | NOT NULL                                    |                                                                                           |
| updated_at          | timestamp     | NOT NULL                                    |                                                                                           |

**Índices:** `(maquina_id, fecha)`, `(categoria)`, `(fecha)`, `(proveedor_id)`.

**Decisiones de diseño:**

- Se reutiliza la tabla `proveedores` para los proveedores de servicios/insumos de máquinas. No se crea una entidad separada "taller de reparaciones".
- Los gastos de máquina NO tocan inventario (regla de dominio 7).
- Las relaciones se declaran en Lucid:
  - `Maquina hasMany GastoMaquina`
  - `GastoMaquina belongsTo Maquina`
  - `GastoMaquina belongsTo Proveedor` (opcional)

### Cuenta

| Campo        | Tipo         | Constraints                  | Notas                                      |
| ------------ | ------------ | ---------------------------- | ------------------------------------------ |
| id           | bigint       | PK                           |                                            |
| name         | varchar(150) | NOT NULL, UNIQUE             | Ej. "Gastos Operativos"                    |
| description  | varchar(255) | NULL                         |                                            |
| is_active    | boolean      | NOT NULL, default true       | Soft archive si tiene movimientos asociados |
| created_at   | timestamp    | NOT NULL                     |                                            |
| updated_at   | timestamp    | NOT NULL                     |                                            |

**FKs opcionales:** `purchases.account_id`, `expenses.account_id`, `machine_expenses.account_id` → `accounts.id ON DELETE SET NULL`.

**Eliminación:** si la cuenta tiene compras, gastos de empresa o gastos de máquina vinculados → `is_active = false` (soft). Si no tiene referencias → borrado físico.

### Cálculo de total gastado por máquina

Calculado on-demand, NO almacenado. Query:

```sql
SELECT SUM(monto) FROM gastos_maquina WHERE maquina_id = ?
```

Se expone en `MaquinaService.calcularTotalGastado(maquinaId)` y se incluye en la respuesta de `GET /maquinas/:id`.

## Vistas / queries útiles que el agente debe implementar

### `v_stock_actual`

Vista (o query parametrizada en servicio) que devuelve por cada material activo:

- material_id, nombre, categoria, unidad, stock_actual, stock_minimo, esta_bajo (boolean)

### Stock disponible para un pedido

Dado un pedido en BORRADOR o CONFIRMADO, query que devuelve para cada `PedidoMaterial` si hay stock suficiente para el consumo total proyectado (`cantidad_por_prenda × pedido.cantidad_total`). Detalle por material: stock actual, consumo proyectado, faltante.

### Total gastado por máquina

Ya descrito arriba en la sección de `GastoMaquina`. Se calcula on-demand vía `SUM(monto)`.

### Gastos de máquinas del mes (dashboard)

Query para el dashboard:

```sql
SELECT COUNT(*) as count, SUM(monto) as total
FROM gastos_maquina
WHERE fecha >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
  AND fecha < DATE_FORMAT(CURDATE() + INTERVAL 1 MONTH, '%Y-%m-01')
```

## Seeders mínimos

- 1 usuario admin (`admin@negapos.local` / password configurable por env).
- 5 materiales de ejemplo (1 tela, 2 hilos, 1 botón, 1 etiqueta).
- 2 proveedores.
- 1 cliente de prueba.
- 2 máquinas de ejemplo (1 recta, 1 fileteadora).
- 2 gastos de máquina de ejemplo (1 reparación, 1 insumo).

(En producción real, el dueño cargará sus datos; los seeders son para desarrollo.)

## Producto de catálogo (`CatalogProduct`) — stock

### Sin fórmula (`formula_id` NULL)

- El stock se almacena en `stock_quantity` y se actualiza con `product_inventory_movements`:
  - Entradas: `PURCHASE_IN` (compra confirmada), `MANUAL_CARGO`, `MANUAL_ADJUSTMENT` (positivo).
  - Salidas: `SALE_OUT` (venta o pedido confirmado), `MANUAL_DESCARGO`, `MANUAL_ADJUSTMENT` (negativo).
- No se puede vender sin existencia suficiente.

### Con fórmula (`formula_id` NOT NULL)

- `stock_quantity` en BD se mantiene en `0`; el stock **mostrado** se calcula:
  - Por cada material de la fórmula: `floor((stock_físico_material - comprometido) / cantidad_por_unidad_producto)`.
  - El stock del producto = **mínimo** de esas cantidades.
- No admite compra de producto terminado, cargo ni ajuste manual de stock.
- La venta o confirmación de pedido valida contra ese stock calculado.
- El consumo de materiales ocurre al pasar el pedido a `IN_PRODUCTION` o en venta walk-in (descuento directo de materiales).

