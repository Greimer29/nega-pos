# Sprint 2 — Decisiones de modelo (consolidadas)

> Basado en `SPRINT2_DISCOVERY_DUENO.md` (cotejo 2026-05-24) + decisiones del Project Lead autorizadas por el dueño cuando estuvo incomunicado.  
> Cotejo vs alcance: [`SPRINT2_COTEJO.md`](./SPRINT2_COTEJO.md).  
> **Estado: cerrado para implementación.** El modelo congelado está en [`DATA_MODEL.md`](./DATA_MODEL.md).

## Resumen ejecutivo

Taller con **código interno obligatorio**, **código de proveedor** opcional, **nombre + color**, precios en **Bs con snapshot opcional a USD** (manejo bimonetario para inflación), compras en **borrador → confirmada**, **número de factura obligatorio al confirmar**, adjunto opcional, **proveedor habitual (favoritos)**, stock mínimo **1** para todas las categorías, alertas de bajo stock en **dashboard** (no centro de notificaciones completo aún). Teléfono en formato **+58…** si se carga.

---

## Decisiones autorizadas con dueño incomunicado

El dueño autorizó al Project Lead a tomar decisiones óptimas en su ausencia. Las preguntas 1.5 y 4.5 quedaron **cerradas por el dueño el 2026-05-29** (ver `SPRINT2_DISCOVERY_DUENO.md`).

| #   | Pregunta                 | Decisión (actualizada)                                                                                                                                                                                                                                                       |
| --- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.5 | Categorías               | Taxonomía amplia documentada (materia prima, insumos, herramientas, etc.). **Sprint 2:** enum `Material.categoria` = `TELA, HILO, BOTON, ELASTICO, ETIQUETA, BOLSA, OTRO` solo para **materia prima** en inventario. Insumos/herramientas/infra/mobiliario → fuera de `Material`. |
| 4.5 | Fecha factura vs llegada | **`fecha`** = fecha impresa en la **factura del proveedor** (obligatoria). **`fecha_recepcion`** = llegada física, **opcional**. Si NULL, se asume igual a `fecha`.                                                                                                        |

Adicionalmente, se confirmó la **estrategia bimonetaria** descrita abajo (decisión técnica derivada del contexto inflacionario de Venezuela).

---

## Cambios al modelo `Material`

| Campo                      | Decisión Sprint 2                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `codigo`                   | **NOT NULL, UNIQUE** (era NULL en plan anterior)                                             |
| `codigo_proveedor`         | `varchar(50) NULL`, indexado                                                                 |
| `nombre`                   | NOT NULL, sin unique global                                                                  |
| `color`                    | `varchar(50) NULL`                                                                           |
| `descripcion`              | Opcional                                                                                     |
| `categoria`                | Enum: `TELA, HILO, BOTON, ELASTICO, ETIQUETA, BOLSA, OTRO`                                   |
| `unidad`                   | Enum completo: `METRO, KILO, UNIDAD, ROLLO, LITRO`                                           |
| `stock_minimo`             | Default: **1** para todas las categorías                                                     |
| `ubicacion`                | Opcional, no requerido en UI                                                                 |
| `proveedor_habitual_id`    | FK opcional — "favoritos"                                                                    |
| `precio_ultima_compra`     | `decimal(15,2) NULL`. **Bs.** Caché del último `CompraItem.precio_unitario_bs` confirmado    |
| `precio_ultima_compra_usd` | `decimal(15,4) NULL`. **USD.** Snapshot del último `CompraItem.precio_unitario_usd_snapshot` |
| `fecha_ultima_compra`      | `date NULL`. Para detectar precios desactualizados en alta inflación                         |

**UI:** modo A = código interno; modo B = código proveedor (búsqueda dual).

---

## `Compra` / `CompraItem` — manejo bimonetario

### `Compra`

| Aspecto                                 | Decisión                                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Flujo                                   | **BORRADOR** → **CONFIRMADA**                                                                                        |
| `numero_factura`                        | **Obligatorio al confirmar** (NULL en borrador, NOT NULL al confirmar; validar a nivel app)                          |
| `archivo_factura`                       | **Opcional**                                                                                                         |
| `fecha`                                 | **Fecha impresa en la factura del proveedor** (obligatoria). Es la fecha oficial del registro de compra |
| `fecha_recepcion`                       | Fecha de **llegada física** de la mercancía, **opcional**. Si NULL, se asume igual a `fecha`          |
| `tasa_usd`                              | `decimal(15,4) NULL`. **Tasa Bs/USD del día de la factura.** Llenada manualmente. Es la clave del manejo bimonetario |
| `total_bs`                              | `decimal(15,2)`. Suma de `subtotal_bs` de items                                                                      |
| `total_usd_snapshot`                    | `decimal(15,4) NULL`. Suma de `subtotal_usd_snapshot` al confirmar                                                   |
| Ítems                                   | Múltiples por compra                                                                                                 |
| Moneda base                             | **Bs** (todos los precios se almacenan en Bs)                                                                        |
| Corrección errores                      | **Ajuste manual** (devoluciones → backlog #006)                                                                      |
| Histórico                               | Solo compras **desde go-live**                                                                                       |
| Edición de `tasa_usd` post-confirmación | **No permitida en Sprint 2.** Snapshots inmutables. Si se cargó mal, usar ajustes manuales y dejar nota              |

### `CompraItem`

| Campo                          | Decisión                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `precio_unitario_bs`           | `decimal(15,2) NOT NULL`. Editable en BORRADOR. Inmutable tras CONFIRMADA                                           |
| `precio_unitario_usd_snapshot` | `decimal(15,4) NULL`. Calculado al confirmar si `tasa_usd` presente: `precio_unitario_bs / tasa_usd`. **Inmutable** |
| `subtotal_bs`                  | `decimal(15,2)`. Calculado: `cantidad * precio_unitario_bs`                                                         |
| `subtotal_usd_snapshot`        | `decimal(15,4) NULL`. Calculado al confirmar: `cantidad * precio_unitario_usd_snapshot`. **Inmutable**              |

### Conversión USD ↔ Bs (regla)

- Para precios anclados a una compra (histórico, detalle de item): usar **siempre el snapshot** persistido. Si está NULL (compra sin tasa), mostrar `—`.
- Para datos no anclados a una compra (ej. dashboard con totales del mes en USD): usar la tasa más reciente conocida o devolver `null` con warning `TASA_NO_DISPONIBLE` en la respuesta.
- **Nunca inventar conversiones.**

### Justificación de los snapshots inmutables

En contexto de inflación alta (Venezuela), una corrección de tasa después de confirmar la compra rompería el historial:

- Sin snapshot: un material que costó 10 USD hace 3 meses puede mostrar 4 USD si la tasa se "corrige" hoy.
- Con snapshot: el valor histórico es estable y refleja lo que realmente se pagó en USD en el momento.

El costo es que si se cargó la tasa mal, no se puede corregir trivialmente. Aceptable: las tasas suelen tener referencia pública (BCV) y se conocen al día de la factura.

---

## `Proveedor`

| Campo      | Decisión                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| `nombre`   | NOT NULL                                                                                                                  |
| `rif`      | `varchar(20) NULL`, unique cuando no es null. Normalizar a mayúsculas y sin espacios                                      |
| `telefono` | Opcional; si existe, normalizar **E.164** con default Venezuela (`+58`)                                                   |
| `email`    | Opcional                                                                                                                  |
| Eliminar   | **Soft delete** (`activo=false`) si tiene compras **o** gastos de máquina asociados. Hard delete solo si no tiene ninguno |

---

## Alertas de stock (Sprint 2)

- Endpoint/listado **materiales bajo stock** (`stock_actual < stock_minimo`).
- Dashboard: tarjeta o lista con código, nombre, color, cantidad actual, unidad.
- **No** centro de notificaciones multi-módulo (Inventario + Pedido) → backlog #005.

---

## Endpoints adicionales relacionados al manejo bimonetario

A documentar en `MES_01_APP_GESTION.md` (resumen aquí):

- `GET /materiales/:id/historial-precios` — lista de `CompraItem` confirmados del material, con Bs y USD snapshot. Ya descrito en `DATA_MODEL.md` (Historial de precios por material).
- En `POST /compras` y `PUT /compras/:id`: aceptar `tasa_usd` (opcional, decimal positivo).
- En `POST /compras/:id/confirmar`:
  - Validar `numero_factura` presente → si no, 422 `NUMERO_FACTURA_REQUERIDO`.
  - Si `tasa_usd` presente, calcular y persistir snapshots USD en ítems y total.
  - Si `tasa_usd` NULL, dejar snapshots NULL.
  - Actualizar cachés del material (`precio_ultima_compra`, `precio_ultima_compra_usd`, `fecha_ultima_compra`).

---

## Fuera de Sprint 2

| Tema                                                              | Backlog                                       |
| ----------------------------------------------------------------- | --------------------------------------------- |
| Tasa USD diaria automática (consulta a fuente externa, ej. BCV)   | #003                                          |
| Centro de notificaciones                                          | #005                                          |
| Devoluciones de compra                                            | #006                                          |
| Multi-usuario                                                     | #007                                          |
| CRUD máquinas (UI)                                                | Sprint 3–4 (`MES_01`)                         |
| Endpoint de "recálculo de tasa" para corregir compras confirmadas | Evaluar tras Sprint 2 si aparece la necesidad |

---

## Checklist antes de migraciones

- [x] Dueño autorizó cierre de las 2 preguntas pendientes (categorías y fecha doble)
- [x] Decisión bimonetaria documentada (regla 10 en `DATA_MODEL.md`)
- [x] `DATA_MODEL.md` actualizado: `Material`, `Compra`, `CompraItem`, `Proveedor`, regla 10
- [x] `SPRINT2_COTEJO.md` actualizado con cierre de pendientes
- [x] Backlog #003, #005, #006, #007 registrados
- [ ] Abrir rama `feat/inventario-sprint2`
- [ ] Generar primera migración: `proveedores` (con `rif`)
- [ ] Siguiente migración: `materiales` (con todos los campos nuevos)
- [ ] Siguiente migración: `compras` y `compra_items` (con campos USD)
