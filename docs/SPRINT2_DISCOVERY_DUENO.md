# Sprint 2 — Cuestionario con el dueño (inventario)

Documento de descubrimiento para **Materiales**, **Proveedores** y **Compras**.  
Síntesis técnica: [`SPRINT2_DECISIONES_MODELO.md`](./SPRINT2_DECISIONES_MODELO.md) · Cotejo vs alcance: [`SPRINT2_COTEJO.md`](./SPRINT2_COTEJO.md).

**Leyenda:** ✅ respondido · ⚠️ respondido con impacto en alcance · ⏳ pendiente

**Última revisión:** 2026-05-29

---

## 1. Materiales — identificación y catálogo

| #   | Pregunta                                       | Estado | Respuesta del dueño                                                                              |
| --- | ---------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| 1.1 | ¿Código interno, código de proveedor, o ambos? | ✅     | **Código interno obligatorio.** Además, **código del proveedor** para buscar o cargar mercancía. |
| 1.2 | ¿Quién asigna el código y formato?             | ✅     | UI con **dos modos**: (A) código del taller, (B) búsqueda/alta por código del proveedor.         |
| 1.3 | ¿Nombre único?                                 | ✅     | **No.** Varios materiales con nombre parecido; se diferencian por código y atributos.            |
| 1.4 | Materiales de ejemplo                          | ✅     | [Anexo A](#anexo-a--materiales-de-ejemplo-del-dueño)                                             |
| 1.5 | ¿Categorías?                                   | ✅     | Ver [taxonomía del dueño](#taxonomía-de-categorías-del-dueño-2026-05-29). **Sprint 2 (inventario):** enum corto en `Material.categoria` para **materia prima**; el resto (insumos operativos, herramientas, infra, mobiliario) queda fuera de la entidad Material → módulos/backlog. |
| 1.6 | Unidades                                       | ✅     | Tela por **metro**; hilos/botones por **unidad**.                                                |
| 1.7 | ¿Decimales?                                    | ✅     | **Sí** (ej. 5,5 m).                                                                              |
| 1.8 | ¿Ubicación física?                             | ✅     | **No obligatoria.**                                                                              |
| 1.9 | Nombre + color                                 | ✅     | **Nombre y color por separado.**                                                                 |

**Requisitos adicionales (1.1):**

- Registrar **fecha de llegada** de la mercancía → campo `fecha_recepcion` en compra (opcional; ver 4.5).
- **Historial** por material: cantidad comprada y proveedor → PR compras / historial-precios.

### Taxonomía de categorías del dueño (2026-05-29)

**Materia prima** (inventario Sprint 2 — mapeo al enum `Material`):

| Dueño | Enum Sprint 2 |
| ----- | ------------- |
| Telas, forros, mallas | `TELA` |
| Hilos | `HILO` |
| Botones | `BOTON` |
| Elásticas | `ELASTICO` |
| Etiquetas | `ETIQUETA` |
| Envolturas | `BOLSA` |
| Cierres, broches, encajes, rellenos acolchados | `OTRO` _(ampliar enum en ciclo posterior si hace falta)_ |

**Fuera de `Material` en Sprint 2** (no se cargan como ítem de inventario textil):

- **Insumos:** luz, aseo, papelería, talonarios, lapiceros, gas, teléfono/internet, tizas…
- **Herramientas:** tijeras, pinzas, pica ojales, reglas, patrones, destornilladores…
- **Maquinarias / repuestos:** máquinas (tabla `maquinas`), agujas, bobinas…
- **Infraestructura / mobiliario:** locales, mesas, sillas…

---

## 2. Stock mínimo y alertas

| #   | Pregunta                           | Estado | Respuesta del dueño                                                                                                                                                                                                                          |
| --- | ---------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | ¿Cómo saben que hay que recomprar? | ⚠️     | **Centro de notificaciones** en la app con alerta interna cuando un producto tiene poca existencia. _(Ver cotejo: Sprint 2 = alerta simple; centro completo = backlog.)_                                                                     |
| 2.2 | Mínimo para **tela**               | ✅     | **1 metro** por tela. _(Antes se había anotado 2 m; prevalece esta respuesta.)_                                                                                                                                                              |
| 2.3 | Mínimo hilo / botones / elástico   | ✅     | **1 unidad.**                                                                                                                                                                                                                                |
| 2.4 | Alertas en dashboard               | ⚠️     | **Centro de notificaciones** con categorías (ej. Inventario → “Producto con bajo stock” con código, descripción, cantidad; Pedido → pendientes, etc.). _(Sprint 2: lista bajo stock en dashboard; centro categorizado = fases posteriores.)_ |
| 2.5 | Desfase sistema vs estante         | ✅     | **Ajustes manuales** cuando no cuadra.                                                                                                                                                                                                       |

---

## 3. Proveedores

| #   | Pregunta                      | Estado | Respuesta del dueño                                                                                   |
| --- | ----------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| 3.1 | Proveedores principales       | ✅     | **El Castillo** (con RIF).                                                                            |
| 3.2 | ¿Un proveedor vende todo?     | ✅     | **Sí**, puede concentrar toda la mercancía.                                                           |
| 3.3 | Teléfono / email obligatorios | ✅     | **No** obligatorios.                                                                                  |
| 3.4 | Formato de teléfono           | ✅     | Ejemplo: `+584128332238` → guardar en **E.164** (Venezuela +58).                                      |
| 3.5 | Archivar vs borrar            | ⚠️     | Pidió **borrar**. _(Mes 1: borrar solo si no tiene compras; si tiene, archivar — explicar al dueño.)_ |
| 3.6 | Proveedor habitual            | ✅     | **Sí**, “guardar en favoritos” = proveedor habitual del material.                                     |

---

## 4. Compras y facturas

| #    | Pregunta                        | Estado | Respuesta del dueño                                                                                                                                          |
| ---- | ------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4.1  | ¿Cómo registran hoy?            | ✅     | Compran, **guardan factura**, **anotan monto total**.                                                                                                        |
| 4.2  | ¿Borrador y confirmar?          | ✅     | **Sí**, borrador y luego confirmar.                                                                                                                          |
| 4.3  | ¿Número de factura obligatorio? | ✅     | **Sí**, obligatorio.                                                                                                                                         |
| 4.4  | ¿Adjuntar foto/PDF?             | ✅     | **Opcional.**                                                                                                                                                |
| 4.5  | Fecha factura vs llegada        | ✅     | **`fecha`** = fecha **impresa en la factura** del proveedor (registro oficial de la compra). **`fecha_recepcion`** opcional cuando la mercancía llega otro día. No usar la hora de carga en el sistema como fecha de la compra. |
| 4.6  | Varios ítems por factura        | ✅     | **Sí.**                                                                                                                                                      |
| 4.7  | Moneda                          | ✅     | **Bolívares (Bs)** + referencia USD. Tasa diaria automática → **backlog #003**.                                                                              |
| 4.8  | Precio última compra            | ✅     | **Sí**, costo según última compra.                                                                                                                           |
| 4.9  | ¿Compras históricas?            | ✅     | No entendió la pregunta → **solo compras nuevas desde que use el sistema** (no cargar meses pasados salvo sesión manual puntual).                            |
| 4.10 | Error en compra confirmada      | ⚠️     | Quiere **devoluciones** con reglas fuertes (no devolver si el material ya se usó en un pedido). _(Fuera de Mes 1; Sprint 2 = ajuste manual — backlog #006.)_ |

---

## 5. Ajustes de inventario

| #   | Pregunta               | Estado | Respuesta del dueño                                       |
| --- | ---------------------- | ------ | --------------------------------------------------------- |
| 5.1 | ¿Cuándo conteo físico? | ✅     | **Cada mes.**                                             |
| 5.2 | ¿Quién ajusta?         | ✅     | Mes 1: **solo admin** (único usuario operativo este mes). |
| 5.3 | ¿Nota obligatoria?     | ✅     | **Opcional.**                                             |

---

## 6. Máquinas (Sprint 2 = tablas; UI según plan Mes 1)

| #   | Pregunta                      | Estado | Respuesta del dueño                                                                                                         |
| --- | ----------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| 6.1 | Listado de máquinas           | ⚠️     | Quiere **CRUD operacional** con detalles. _(UI completa: Sprint 3–4 según `MES_01`; en Sprint 2 solo migraciones/modelos.)_ |
| 6.2 | Tipo de máquina               | ✅     | **Sí** guardar tipo.                                                                                                        |
| 6.3 | Marca / modelo                | ✅     | **Sí.**                                                                                                                     |
| 6.4 | Estado operativa / reparación | ✅     | **Sí.**                                                                                                                     |

---

## 7. Operación y dispositivos

| #   | Pregunta            | Estado | Respuesta del dueño                                                                                 |
| --- | ------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| 7.1 | ¿Celular o PC?      | ✅     | **Desktop primero**; después pasar a móvil.                                                         |
| 7.2 | ¿WiFi en taller?    | ✅     | **Sí** tiene WiFi.                                                                                  |
| 7.3 | ¿Más de un usuario? | ⚠️     | **Tantos usuarios como quieran agregar.** _(Mes 1: un solo admin — multi-usuario en backlog #007.)_ |

---

## Anexo A — Materiales de ejemplo del dueño

| Nombre / descripción     | Color  | Cantidad (ej.) | Unidad | Código | Costo (Bs) | Ref. USD (ej.) |
| ------------------------ | ------ | -------------- | ------ | ------ | ---------- | -------------- |
| Atlética                 | Negro  | 9              | MTS    | 5810   | 808,30     | 1,56           |
| Microdurazno heavy       | Negro  | 1,5            | MTS    | 3039   | 1212,47    | 2,00           |
| Atlética                 | Blanco | 2,6            | MTS    | 2919   | 1212,47    | 1,56           |
| Novak quatro stretch     | Negro  | 1,3            | MTS    | 5813   | 853,20     | 1,56           |
| Hilo negro               | Negro  | 5              | und    | 5236   | 2023       | 3,00           |
| Botón con forma de plato | Negro  | 50             | und    | 2023   | 2021       | 3,00           |

---

## Pendientes mínimos

~~1. **1.5** — Lista de categorías~~ ✅ Cerrado 2026-05-29 (taxonomía + mapeo Sprint 2 arriba).

~~2. **4.5** — Fecha factura~~ ✅ Cerrado: `fecha` = factura impresa; `fecha_recepcion` opcional.

## Próximo paso (desarrollo)

1. Implementar **materiales-web** (PR #5) y luego compras (#6–#8).
2. Ampliar enum de categorías cuando el dueño pida granularidad (cierres, broches, etc.) sin bloquear Sprint 2.
