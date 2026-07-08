# REPORTE DE CIERRE — Sprint 2 (Inventario)

> Generado según `docs/TEMPLATES_REPORTE.md` (Template A).  
> **Estado:** Sprint 2 cerrado técnicamente; **Sprint 3 bloqueado** hasta confirmación del Project Lead.

---

## Qué se entregó

- **Proveedores:** CRUD API + UI (listado, alta/edición, soft delete).
- **Materiales:** CRUD API + UI con código interno, color, proveedor habitual, stock on-demand, ajustes manuales, filtro bajo stock, historial de precios por compra confirmada.
- **Compras:** CRUD borrador, ítems, confirmación con validaciones (factura obligatoria, tasa USD si aplica), snapshots bimonetarios inmutables, upload factura (disco local), movimientos `ENTRADA_COMPRA`.
- **Dashboard:** `GET /api/v1/dashboard/resumen` + UI — compras confirmadas del mes en Bs, listado de materiales bajo stock (post-patch: sin tarjeta redundante).
- **Infra:** migraciones Sprint 2, seed admin, docs local/Railway, fix deploy Railway (`DRIVE_DISK` / `STORAGE_LOCAL_PATH` con defaults).
- **Tests funcionales API:** auth, proveedores, materiales, compras (borrador + confirmar), dashboard.
- **Documentación:** discovery dueño, decisiones modelo, cotejo alcance, feedback post-demo (`SPRINT2_FEEDBACK_DUENO.md`), script limpieza datos test.

**PRs mergeados en `main`:** #1–#4 (inventario base, proveedores, materiales API), #6–#7 (compras API), #8 (compras + materiales web), #9 (dashboard), fix Railway env defaults. *(#5 materiales-web entró vía #8.)*

---

## Decisiones tomadas durante la implementación

- Snapshots USD inmutables al confirmar compra (ADR 001 / `SPRINT2_DECISIONES_MODELO.md`).
- Stock actual calculado on-demand desde movimientos, no columna persistida.
- Compras en `BORRADOR` editables; confirmación irreversible desde API.
- Drive local por defecto en dev y Railway si vars ausentes (fix post-deploy).
- UI mínima shadcn — rediseño visual **explícitamente diferido** tras feedback del dueño.
- Patch post-demo: labels cortos de categoría y dashboard sin duplicar contador de bajo stock.

---

## Métricas

- **Tiempo invertido:** no registrado formalmente en repo (sesión agente + revisiones humanas Sprint 2).
- **PRs creados:** ~9 mergeados + 1 fix Railway (+ este patch de cierre pendiente de merge).
- **Tests escritos:** 6 archivos functional en `apps/api/tests/functional/` (auth, proveedores, materiales, compras ×2, dashboard); cobertura acotada a endpoints Sprint 2, sin E2E web.
- **Bugs encontrados y resueltos:** Railway `EnvValidationException` (vars Drive); login local sin usuario admin (seed); datos test en BD dev (documentado + script limpieza).

---

## Qué quedó abierto

- **Alta rápida de material desde flujo de compra** — backlog, no Sprint 2.
- **Rediseño UI/UX** — backlog largo, después de carga de datos reales.
- **Pedidos activos en dashboard** — placeholder “Sprint 3”.
- **Módulo máquinas/gastos** — planificado Mes 1, no implementado aún.
- **Carga de datos reales del taller** — pendiente sesión con dueño en prod/staging.
- **E2E web / tests visuales** — no iniciados.

---

## Dudas pendientes para Project Lead

1. ¿Confirmamos **inicio Sprint 3** (clientes + pedidos + máquinas API) con el plan de PRs #10–#14 propuesto?
2. ¿La **alta de material en compra** entra como mini-bloque antes de Sprint 3, dentro de Sprint 3, o queda para después de pedidos?
3. ¿Próxima demo con dueño en **Railway/staging** o seguimos en local hasta fin de Mes 1?
4. ¿Endurecer aislamiento de tests (BD `nega_pos_test` separada) para evitar contaminación de dev?

---

## Riesgos detectados

- Tests funcionales pueden escribir en la misma BD que dev si no hay DB de test separada → datos fantasma (mitigado con script + doc).
- UI provisional puede generar percepción de “producto incompleto” — comunicar al dueño que es intencional hasta carga de datos.
- Railway: storage local en disco efímero — facturas subidas se pierden en redeploy (aceptable dev/staging; producción requerirá S3 o volumen persistente).
- Deuda: sin paginación en listados grandes; sin búsqueda avanzada materiales.

---

## Validación con el dueño

- **Sesión demo realizada** (≈ 2026-05-24): flujo inventario validado operativamente.
- **Reacción general:** funcionalidad OK; UI aceptable temporalmente; fricción en orden material→compra; categorías largas en UI.
- **Detalle:** ver `docs/SPRINT2_FEEDBACK_DUENO.md`.
- **Patch aplicado** tras feedback: categorías cortas, dashboard unificado, limpieza datos test documentada.

---

## Próximo paso (agente)

**Sprint 3 confirmado** (clientes + pedidos CRUD sin receta + máquinas API). Decisiones Project Lead 2026-05-24.

- **PR chore #1:** BD test separada (backlog #005).
- **Patch cierre Sprint 2:** mergear en `main` antes de demo Railway.
- **Demo próximos sprints:** Railway/staging, no local.
- **Si Sprint 3 termina antes:** mejorar UI/tests/docs; no expandir alcance a Sprint 4.
