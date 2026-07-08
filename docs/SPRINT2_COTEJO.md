# Sprint 2 — Cotejo de respuestas del dueño vs alcance Mes 1

> Fecha: 2026-05-24 · Fuente: `SPRINT2_DISCOVERY_DUENO.md`

## Resumen

| Métrica                      | Cantidad                                                             |
| ---------------------------- | -------------------------------------------------------------------- |
| Preguntas totales (aprox.)   | 35                                                                   |
| ✅ Cerradas para Sprint 2    | **30** (28 del dueño + 2 cerradas por Project Lead con autorización) |
| ⏳ Pendientes                | **0**                                                                |
| ⚠️ Fuera de Sprint 2 / Mes 1 | 5 temas → backlog                                                    |

> **Actualización 2026-05-29:** el dueño cerró **1.5 categorías** (taxonomía completa + mapeo Sprint 2) y **4.5 fecha factura** (`fecha` = impresa en factura). Ver `SPRINT2_DISCOVERY_DUENO.md`.

---

## ✅ Alineado con Sprint 2 (implementar)

| Tema                 | Decisión del dueño                                     | Acción técnica                                     |
| -------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| Códigos              | Interno obligatorio + proveedor opcional, dos modos UI | Campos `codigo`, `codigo_proveedor`; búsqueda dual |
| Material             | Nombre + color, no unique en nombre                    | Campos `nombre`, `color`; unique en `codigo`       |
| Unidades / decimales | Metro y unidad; decimales sí                           | Enums + `decimal(12,3)`                            |
| Stock mínimo         | 1 m tela, 1 und resto                                  | Defaults al crear material                         |
| Desfase stock        | Ajuste manual                                          | `POST /materiales/:id/ajuste`                      |
| Proveedor            | El Castillo, RIF, tel opcional +58                     | Campo `rif`; validación E.164 si hay tel           |
| Favoritos            | Proveedor habitual por material                        | `proveedor_habitual_id`                            |
| Compras              | Borrador → confirmar                                   | Estados existentes                                 |
| Factura              | Número obligatorio; archivo opcional                   | Validación Vine + upload opcional                  |
| Ítems                | Varios por factura                                     | `CompraItem`                                       |
| Precio               | Bs; actualizar última compra                           | `precio_ultima_compra` al confirmar                |
| Histórico compras    | Por material                                           | Detalle material + movimientos                     |
| Conteo               | Mensual (operativo)                                    | Solo guía UX; ajuste manual                        |
| Nota ajuste          | Opcional                                               | Campo `nota` nullable                              |
| Go-live datos        | No backfill automático de compras viejas               | Solo registros nuevos                              |
| Desktop primero      | Sí                                                     | UI web responsive, prioridad escritorio            |
| WiFi                 | Sí                                                     | Upload facturas viable                             |

---

## ⚠️ Pedido del dueño vs plan Mes 1 (comunicar y registrar)

| #         | Lo que pidió                                                         | Plan Mes 1 / Sprint 2                                                                                | Destino                                     |
| --------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 2.1 / 2.4 | **Centro de notificaciones** categorizado (Inventario, Pedido, etc.) | Sprint 2: **lista “bajo stock”** en dashboard + badge simple. Sin centro de notificaciones completo. | `BACKLOG.md` **#005**                       |
| 3.5       | **Borrar** proveedor                                                 | Borrar solo sin compras vinculadas; si tiene compras → **archivar** (`activo=false`)                 | Explicar al dueño; implementar regla en API |
| 4.10      | **Devoluciones** de compra con bloqueo si ya usado en pedido         | Mes 1: corrección vía **ajuste manual** de stock                                                     | `BACKLOG.md` **#006**                       |
| 6.1–6.4   | **CRUD máquinas** ya operativo                                       | Sprint 2: **solo tablas/modelos**; CRUD UI Sprint 3–4                                                | Mantener `MES_01`; mostrar en roadmap       |
| 7.3       | **Multi-usuario** ilimitado                                          | Mes 1: **un admin**; columna `rol` sin UI usuarios                                                   | `BACKLOG.md` **#007**                       |
| 4.7 (USD) | Tasa dólar diaria automática                                         | Sprint 2: solo **Bs**                                                                                | `BACKLOG.md` **#003** (ya registrado)       |

---

## ✅ Pendientes cerrados (autorización del dueño)

| #   | Pregunta                 | Decisión final                                                                                                    | Justificación                                                                                            |
| --- | ------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1.5 | Categorías de material   | Enum: `TELA, HILO, BOTON, ELASTICO, ETIQUETA, BOLSA, OTRO`                                                        | Cubre los 6 materiales de ejemplo del dueño. Ampliable agregando valores al enum sin migración compleja. |
| 4.5 | Fecha factura vs llegada | **Dos campos:** `fecha` (factura, obligatoria) + `fecha_recepcion` (opcional). Si NULL, se asume igual a `fecha`. | Cero costo si el dueño no la usa; preserva trazabilidad cuando las fechas difieren.                      |

## Decisión técnica adicional (bimonetario Bs/USD)

| Tema                                      | Decisión                                                             |
| ----------------------------------------- | -------------------------------------------------------------------- |
| Moneda base                               | **Bs** en todos los precios almacenados                              |
| `Compra.tasa_usd`                         | Opcional, llenada manualmente                                        |
| `CompraItem.precio_unitario_usd_snapshot` | Calculado al confirmar y persistido como snapshot **inmutable**      |
| `Material.precio_ultima_compra_usd`       | Caché del último snapshot USD confirmado                             |
| Conversión post-confirmación              | No permitida en Sprint 2; snapshots inmutables protegen el histórico |
| Tasa USD automática diaria                | `BACKLOG.md` #003                                                    |

Justificación detallada: regla de dominio 10 en `DATA_MODEL.md` y resumen en `SPRINT2_DECISIONES_MODELO.md`.

---

## Cambios respecto a anotaciones anteriores

| Ítem                  | Antes                  | Ahora (dueño)                                  |
| --------------------- | ---------------------- | ---------------------------------------------- |
| 2.2 Stock mínimo tela | 2 metros               | **1 metro**                                    |
| 3.5 Proveedor         | (pendiente / archivar) | **Borrar** → regla técnica arriba              |
| 4.2–4.4, 4.6, 4.8     | Pendientes             | **Confirmados**                                |
| 4.9 Histórico         | Pendiente              | **Solo desde go-live** (explicada la pregunta) |

---

## Mensaje sugerido al dueño (WhatsApp)

> Gracias por las respuestas. Para Sprint 2 vamos a dejar listo: materiales con código y color, proveedores, compras con borrador y factura, stock que sube al confirmar la compra y aviso cuando quede poco material (en el panel principal).
>
> Para después dejamos anotado: centro de notificaciones completo, devoluciones de compras con reglas, y varios usuarios con permisos.
>
> Nos faltan dos cosas cortas: (1) la lista exacta de categorías de material, (2) si la fecha de la factura y la fecha en que llega la mercancía son la misma o van por separado.

---

## Checklist desarrollo (post-cotejo)

- [x] Actualizar `SPRINT2_DECISIONES_MODELO.md`
- [x] Registrar backlog #005, #006, #007
- [x] Dueño completa categorías (1.5) — **cerrado por Project Lead con autorización**
- [x] Dueño confirma dos fechas (4.5) — **cerrado por Project Lead con autorización**
- [x] Decisión bimonetaria Bs/USD documentada (regla 10)
- [x] Actualizar `DATA_MODEL.md`
- [ ] Abrir rama `feat/inventario-sprint2`
