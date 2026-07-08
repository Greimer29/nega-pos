# Backlog del proyecto Nega POS

> Registro central de toda solicitud, idea o feature que aparezca durante el proyecto y que no esté en el ciclo activo. **Toda solicitud nueva del dueño se anota aquí antes de decidir su destino.**

## Proceso

Cada solicitud nueva pasa por estos pasos:

1. **Registrar** aquí con fecha, descripción y origen.
2. **Evaluar** con 3 preguntas:
   - ¿Es urgente? (¿bloquea operación, hay riesgo real?)
   - ¿Cuánto cuesta meterla en el ciclo activo vs diferirla?
   - ¿Justifica el riesgo de scope creep sobre el ciclo activo?
3. **Decidir destino**:
   - `EN_CICLO_ACTIVO` — se incorpora ahora (raro, solo si urgente o muy pequeño)
   - `PROXIMO_CICLO` — entra en el ciclo siguiente
   - `MINI_BLOQUE` — se planifica como hito propio entre ciclos
   - `BACKLOG_LARGO` — se hace eventualmente, no comprometido
   - `DESCARTADO` — no se hace (con justificación)
4. **Comunicar al dueño** la decisión y el porqué.

## Items registrados

### 001 — Módulo de máquinas y gastos

- **Fecha:** [completar al registrar]
- **Origen:** dueño
- **Descripción:** Registro de las máquinas del taller y sus gastos asociados (reparaciones, insumos, mantenimientos).
- **Evaluación:** alcance acotado (2 tablas, CRUD), coherente con el dolor de "no saber costos reales", no bloquea pero suma valor real desde el día 1.
- **Decisión:** `EN_CICLO_ACTIVO` (Mes 1) con alcance mínimo recortado.
- **Estado:** En el plan del Mes 1. Ver `MES_01_APP_GESTION.md`.
- **Recortes acordados:**
  - Sin mantenimiento preventivo / recordatorios.
  - Sin depreciación ni costo por hora.
  - Sin asignación de gastos a pedidos.
  - Sin reportes comparativos avanzados.

### 002 — Endurecer validación de receta vacía

- **Fecha:** [registrar al cierre del Mes 1]
- **Origen:** decisión de planificación (Claude + dev humano)
- **Descripción:** Hoy, cuando un pedido pasa a `EN_PRODUCCION` sin receta de materiales (cero `PedidoMaterial`), la transición procede con `warnings: [{ code: "RECETA_VACIA" }]` y sin descuento de stock. Política intencionalmente permisiva para no frustrar al dueño en adopción temprana (evita el patrón "recetas falsas para saltar validación").
- **Evaluación:** evaluar tras 2-3 meses de uso real:
  - ¿Cuántos pedidos terminan en producción con receta vacía? Si es bajo (<5%) y crece la cultura de receta, endurecer.
  - ¿Hay casos donde el banner no sea suficiente y el dueño no se entera del impacto en stock? Si sí, endurecer.
  - Si se endurece: cambiar a HTTP 422 con código `RECETA_REQUERIDA` o similar. Documentar migración para pedidos legados existentes.
- **Decisión:** `BACKLOG_LARGO`. Revisar en cierre de Mes 2 o cuando el dueño reporte un problema relacionado.
- **Estado:** Pendiente.

### 003 — Alta rápida de material desde flujo de compra

- **Fecha:** 2026-05-24
- **Origen:** dueño (sesión demo Sprint 2)
- **Descripción:** Al registrar una compra, poder crear un material nuevo sin salir del formulario (modal o inline), en lugar de ir primero a Materiales.
- **Evaluación:** mejora UX clara, alcance acotado (reutilizar API materiales + selector compra). No bloquea operación actual pero reduce fricción diaria.
- **Decisión:** `MINI_BLOQUE` — **entre Sprint 3 y Sprint 4** (no antes, no mezclado con pedidos).
- **Justificación de la decisión:** Sprint 3 prioriza pedidos; la fricción se validará mejor en sesión de carga real con el dueño. Timing explícito evita que quede en el limbo.
- **Estado:** Pendiente (planificado post-Sprint 3, pre-Sprint 4).

### 004 — Rediseño visual UI (post carga de datos)

- **Fecha:** 2026-05-24
- **Origen:** dueño (sesión demo Sprint 2)
- **Descripción:** Mejorar apariencia general de la web (tipografía, espaciado, densidad, componentes). UI actual “muy pobre” pero aceptada hasta tener datos reales.
- **Evaluación:** alto impacto percepción, bajo impacto operación. Costoso si se hace antes de estabilizar pantallas Sprint 3.
- **Decisión:** `BACKLOG_LARGO` — después de carga de datos reales del taller.
- **Justificación de la decisión:** acordado con dueño en demo; evitar rediseñar pantallas que aún cambiarán.
- **Estado:** Pendiente.

### 005 — BD de test separada para tests funcionales

- **Fecha:** 2026-05-24
- **Origen:** agente (incidente datos test F-100/F-101/F-VIEJA en dev)
- **Descripción:** Japa usa `nega_pos_test`; dev queda en `nega_pos`.
- **Evaluación:** bajo esfuerzo, previene confusión en demos y métricas del dashboard.
- **Decisión:** `EN_CICLO_ACTIVO` — primer PR chore Sprint 3 (`chore/japa-separate-test-db`).
- **Justificación de la decisión:** mitigación de riesgo recurrente; ya generó confusión real en demo con el dueño.
- **Estado:** Implementado (merge en `main`).

### 006 — Revisar percepción de unidad fija en materiales

- **Fecha:** 2026-05-24
- **Origen:** dueño (observación en demo)
- **Descripción:** El dueño notó que la cantidad/unidad parece “fijada” en algunos contextos de materiales. Verificar si es bug de UI o expectativa vs. modelo (unidad por material).
- **Evaluación:** puede ser solo UX del formulario; confirmar con datos reales.
- **Decisión:** `BACKLOG_LARGO` — revisar al cargar inventario real o si el dueño lo reporta de nuevo.
- **Estado:** Pendiente.

### 007 — Storage persistente para facturas en Railway

- **Fecha:** 2026-05-24
- **Origen:** Project Lead + agente (riesgo deploy Railway)
- **Descripción:** Volume Railway en `/data/uploads` + `STORAGE_LOCAL_PATH` para que adjuntos de factura sobrevivan redeploys.
- **Evaluación:** no bloquea Sprint 3 si aún no cargan facturas reales en prod; **sí bloquea** uso serio de adjuntos en staging/producción.
- **Decisión:** `MINI_BLOQUE` — resolver con **Volume Railway ANTES de la sesión de carga real con el dueño**. Migración a S3/R2 evaluada para Mes 2 de consolidación.
- **Justificación de la decisión:** documentado en `RAILWAY_DEPLOY.md`; Volume `nega-pos-api-volume` activo en producción.
- **Estado:** Implementado (merge en `main`).

### 009 — Módulo de Compras Mes 2 (USD, hub 3 cards, devoluciones)

- **Fecha:** 2026-06-02
- **Origen:** dueño (post-UAT Mes 1 firmado)
- **Descripción:** Rediseño del módulo de Compras: moneda principal USD, hub con 3 cards (Compras realizadas, Gastos empresa, Tasa global), detalle unificado con ítems en estado local hasta confirmar en batch, gastos de empresa con margen semanal, devolución total de compras confirmadas (status VOIDED).
- **Evaluación:** orden directa del dueño tras UAT Mes 1; alcance acotado al módulo de compras sin rediseño global de la app.
- **Decisión:** `EN_CICLO_ACTIVO` — Mes 2.
- **Justificación de la decisión:** observaciones críticas de UX en UAT Mes 1; prioridad explícita del dueño sobre moneda USD y flujo de compra.
- **Estado:** Implementado (pendiente UAT Mes 2 con dueño — ver `UAT_CHECKLIST_MES_02_COMPRAS.md`).

### 008 — Normalización definitiva de tablas ES -> EN en Railway

- **Fecha:** 2026-05-31
- **Origen:** dueño + agente (post-refactor full stack)
- **Descripción:** En producción coexistían tablas legacy en español y tablas nuevas en inglés (`usuarios` + `users`, etc.). Se requería purga total para dejar un único esquema estándar.
- **Evaluación:** crítico para consistencia operativa y evitar lecturas/escrituras en tablas equivocadas.
- **Decisión:** `EN_CICLO_ACTIVO` — ejecutar inmediatamente con `migration:fresh --force` + seed admin.
- **Justificación de la decisión:** el dueño aceptó explícitamente estrategia con pérdida de datos para estandarizar naming.
- **Estado:** Implementado (producción saneada; ver `RAILWAY_DEPLOY.md`, sección "Normalización de tablas ES -> EN").

### 009 — Facturas unificadas en `sales` (módulo Ventas)

- **Fecha:** 2026-07-04
- **Origen:** dueño (decisión explícita fuera de alcance MES_01)
- **Descripción:** Migrar el flujo de ventas de `orders` (PED-…) a `sales` como factura principal: correlativo global de 10 dígitos, modo Rápido por defecto, modo Pedido con estados simplificados, pago contado/crédito, stock al confirmar, devoluciones, dashboard y reportes desde `sales`. Tablas/endpoints `orders` legacy quedan solo lectura.
- **Evaluación:** cambio transversal (API, dashboard, reportes, crédito, frontend ventas); no estaba en `MES_01_APP_GESTION.md` pero fue aprobado explícitamente por el dueño.
- **Decisión:** `EN_CICLO_ACTIVO` — implementación inmediata por orden directa del dueño.
- **Justificación de la decisión:** la UI de ventas ya operaba pero persistía en pedidos; unificar en facturas elimina inconsistencias de numeración, KPIs y crédito.
- **Estado:** Implementado.

### 010 — Impresión térmica Fase 1 (HTML + Electron)

- **Fecha:** 2026-07-05
- **Origen:** dueño (extensión del módulo Ventas)
- **Descripción:** Impresión silenciosa de factura/recibo y nota de despacho en app Electron: plantillas HTML 80mm, configuración local de impresoras Windows (`print-config.json`), impresión al confirmar venta y reimpresión desde detalle. En navegador web la UI de configuración informa que la impresión requiere la app de escritorio; el flujo de ventas no falla.
- **Evaluación:** feature transversal desktop + web; fuera de `MES_01_APP_GESTION.md` pero aprobada como extensión del módulo Ventas (item 009).
- **Decisión:** `EN_CICLO_ACTIVO` — Fase 1 implementada (sin editor visual, ESC/POS raw ni sync multi-caja).
- **Justificación de la decisión:** operación diaria en caja con Xprinter 80mm; Fase 1 cubre confirmación, reimpresión y configuración local.
- **Estado:** Implementado (Fase 1).

### 011 — Hub Configuración + despacho por categoría

- **Fecha:** 2026-07-06
- **Origen:** dueño (extensión del módulo impresión #010)
- **Descripción:** Hub **Configuración** con tabs animados (Formatos · Ventas / Compras). Migración de tasa, margen, categorías de producto y cuentas desde Compras. Enrutamiento de nota de despacho por categoría de producto con impresión separada por impresora (`categoryRouting` en `print-config.json`).
- **Evaluación:** extensión aprobada de impresión térmica; fuera de `MES_01_APP_GESTION.md`.
- **Decisión:** `EN_CICLO_ACTIVO` — implementado en esta fase.
- **Justificación de la decisión:** operación en caja con productos de distintas áreas (cocina, bodega) que requieren tickets en impresoras distintas.
- **Estado:** Implementado.

### 012 — CRUD de formatos de impresión

- **Fecha:** 2026-07-07
- **Origen:** dueño (extensión impresión #010 / hub #011)
- **Descripción:** CRUD de plantillas de ticket en pestaña **Formatos**: crear, editar, duplicar y eliminar formatos personalizados; formatos de sistema editables pero no eliminables; asignación de formato activo por documento; plantillas HTML con placeholders en `print-config.json`.
- **Evaluación:** extensión aprobada; fuera de `MES_01_APP_GESTION.md`.
- **Decisión:** `EN_CICLO_ACTIVO` — implementado (editor HTML con placeholders, sin WYSIWYG drag-and-drop).
- **Estado:** Implementado.

### 013 — Métodos de pago configurables + cierre diario

- **Fecha:** 2026-07-07
- **Origen:** dueño / planificación Mes 1
- **Descripción:** CRUD de métodos de pago vinculados a moneda/tasa en Settings → Ventas; flujo de venta contado con diálogo de método antes de confirmar (descuento de stock al confirmar); crédito sin método; reporte de cierre diario en dashboard con selector de fecha (`/dashboard/cierre-diario`).
- **Evaluación:** expansión operativa del Mes 1 (pagos configurables + reporte de caja); solicitada explícitamente.
- **Decisión:** `EN_CICLO_ACTIVO` — implementado fuera del texto original de `MES_01_APP_GESTION.md`.
- **Estado:** Implementado.

### 014 — Panel General en Configuración

- **Fecha:** 2026-07-07
- **Origen:** dueño
- **Descripción:** Nueva pestaña **General** en Configuración: presentación del negocio, datos fiscales para factura, logo, paleta de 3 colores (tema por defecto o personalizado). Fuente de verdad en API (`app_settings.business_profile`); sincronización con impresión térmica y placeholders `{{business.*}}` en plantillas.
- **Evaluación:** fuera del texto original de `MES_01_APP_GESTION.md`; mejora branding y datos de ticket centralizados.
- **Decisión:** `EN_CICLO_ACTIVO` — implementado por solicitud explícita del dueño.
- **Estado:** Implementado.

### 015 — Impresión nota/comanda sin precios + fórmula

- **Fecha:** 2026-07-08
- **Origen:** dueño
- **Descripción:** Mejoras de impresión térmica para **Nota de despacho** y **Comandas**: sin precios, con código de producto de 7 dígitos, y opción en comanda para imprimir la **fórmula** (materiales ordenados por nombre, o fallback `Producto sin formula`). Además, ajuste UI del formulario de fórmulas para que la cantidad respete `material.unit` (decimales correctos) mostrando helper/unidad.
- **Evaluación:** alcance acotado al módulo de impresión y al form de edición de fórmulas; mejora legibilidad y reduce confusión operativa en cocina/despacho.
- **Decisión:** `EN_CICLO_ACTIVO` — implementado según planificación del ciclo.
- **Estado:** Implementado.

---

## Plantilla para nuevos items

```markdown
### NNN — [Título corto]

- **Fecha:**
- **Origen:** (dueño / desarrollador / agente / observación)
- **Descripción:**
- **Evaluación:**
- **Decisión:** EN_CICLO_ACTIVO / PROXIMO_CICLO / MINI_BLOQUE / BACKLOG_LARGO / DESCARTADO
- **Justificación de la decisión:**
- **Estado:** (Pendiente / Planificado / Implementado / Descartado)
```
