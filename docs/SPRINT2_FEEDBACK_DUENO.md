# Feedback del dueño — Sprint 2 (sesión demo)

> **Fecha de la sesión:** 2026-05-24 (aprox.)  
> **Contexto:** demo local del módulo de inventario (proveedores, materiales, compras, dashboard) tras merge de PRs #1–#9 en `main`.  
> **Estado UI:** aceptada como provisional hasta cerrar carga de datos reales; rediseño visual diferido.

---

## Resumen ejecutivo

El dueño validó que el **flujo operativo core funciona** (materiales, compras confirmadas, stock, dashboard). La UI es funcional pero “muy pobre” — acordado posponer rediseño hasta tener datos reales cargados. Se detectaron fricciones de UX y datos de test mezclados en la BD local.

---

## Dashboard

| Aspecto | Reacción | Notas |
| -------- | -------- | ----- |
| Materiales bajo stock | OK | La información es útil. |
| Compras del mes (Bs + cantidad) | OK | Ej.: 10.000,50 Bs / 3 compras — **correcto** para mayo 2026 (8000 + 500 + 1500,50). La compra `F-VIEJA` (15/01/2020) no entra en el mes actual. |
| Redundancia UI | Mejorar | Tarjeta contador + tabla de bajo stock repetían la misma info. **Patch:** unificar en una sola sección con contador en el título. |
| Datos `F-100`, `F-101`, `F-VIEJA` | Contaminación | Proceden de `dashboard.spec.ts` si los tests funcionales corrieron contra la BD de dev. **Limpieza:** `scripts/cleanup-test-dashboard-data.ps1`. |

---

## Compras

| Aspecto | Reacción | Acción |
| -------- | -------- | ------ |
| Flujo BORRADOR → CONFIRMADA | OK | — |
| Alta de material previa | Fricción | Hay que crear el material **antes** de armar la compra. El dueño quiere **alta rápida de material desde el flujo de compra**. → Backlog `PROXIMO_CICLO` o mini-bloque post-Sprint 3. |

---

## Materiales

| Aspecto | Reacción | Acción |
| -------- | -------- | ------ |
| CRUD y ajustes de stock | OK | — |
| Labels de categoría largos | Mejorar | Ej. “Telas (forros, mallas)” → **Patch:** labels cortos en `CATEGORIA_LABELS`. |
| Cantidad “fijada” a unidad | Observación | El dueño notó que en algunos contextos la unidad parece fija. Revisar en Sprint 3 si persiste al cargar datos reales; no bloqueante. |

---

## Proveedores

Sin observaciones negativas en esta sesión.

---

## Acciones tomadas tras el feedback

1. **Limpieza BD local:** script `scripts/cleanup-test-dashboard-data.ps1` (compras `F-100`, `F-101`, `F-VIEJA` + ítems y movimientos relacionados).
2. **Patch UI:** dashboard sin tarjeta duplicada de stock bajo; categorías con labels cortos.
3. **Backlog:** ítems 003–006 en `docs/BACKLOG.md`.
4. **Reporte de cierre:** `docs/REPORTE_CIERRE_SPRINT2.md` (Template A).

---

## Pendiente explícito del dueño

- Cargar **materiales y proveedores reales** cuando el sistema esté estable en producción o staging.
- Rediseño visual **después** de la carga de datos (no en Sprint 2).

---

## Referencias

- Descubrimiento previo: `docs/SPRINT2_DISCOVERY_DUENO.md`
- Decisiones de modelo: `docs/SPRINT2_DECISIONES_MODELO.md`
- Tests origen datos fantasma: `apps/api/tests/functional/dashboard.spec.ts`
