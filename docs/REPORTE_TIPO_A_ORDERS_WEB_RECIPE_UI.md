# Reporte Tipo A — PR `feat/orders-web-recipe-ui`

**Fecha:** 2026-06-02  
**Alcance:** UI de receta de pedidos + descuento/reversión de stock + pre-cierre Mes 1  
**Estado:** Listo para merge (validación técnica completa)

---

## Resumen ejecutivo

Se implementó la UI de receta en detalle de pedido, conectada al backend ya existente. Se ejecutó validación manual guiada en local (seeders) y smoke en producción. El Mes 1 queda **técnicamente completo**; el cierre formal depende de la UAT firmada por el dueño.

---

## Entregables del PR

| Ítem | Estado |
|------|--------|
| Tabla editable de receta (solo `DRAFT`) | ✅ |
| Cálculo en vivo de consumo proyectado | ✅ |
| Transición a `IN_PRODUCTION` con modal `STOCK_INSUFICIENTE` | ✅ |
| Doble confirmación en "Forzar igual" (`force: true`) | ✅ |
| Banner persistente `RECETA_VACIA` en `IN_PRODUCTION` sin materiales | ✅ |
| Invalidación React Query (pedido + materiales tras transición) | ✅ |
| Servicios/hooks CRUD receta (`/orders/:id/materials`) | ✅ |
| Mapeo contrato API inglés en `order-service` | ✅ |

---

## Validación técnica (Artefacto 1)

### Local — seeders (`docs/VALIDACION_TECNICA_MES1_RECETA.md`)

- **Entorno:** `http://localhost:3333` tras `migration:fresh` + seeders admin/supplier.
- **Resultado:** **20/20 pasos OK**
- **Script:** `scripts/validate-mes1-smoke.mjs --mode=local`

Casos cubiertos:

1. Login y health.
2. Crear cliente + 2 materiales + ajuste de stock.
3. Pedido con receta de 2 ítems.
4. Ciclo `DRAFT → CONFIRMED → IN_PRODUCTION → DELIVERED`.
5. Verificación de descuento de stock (500 → 490 en material A, pedido qty 5 × 2).
6. `409 STOCK_INSUFICIENTE` sin `force`.
7. Transición forzada con `force: true`.
8. Cancelación en producción con reversión de stock (175 → 195).
9. Gasto de máquina + dashboard summary.

### Tests funcionales API

- `order_recipe_stock.spec.ts`: **8/8 passed** (~53s)

### Producción — smoke corto (`docs/VALIDACION_SMOKE_PRODUCCION.md`)

- **Entorno:** `https://nega-pos-api-production.up.railway.app`
- **Resultado:** **10/10 pasos OK**
- **Limpieza:** pedido borrador, material y cliente de prueba eliminados al finalizar.

> **Nota:** No había datos reales del dueño accesibles; validación local con seeders + smoke producción autorizado.

---

## Entregable UAT dueño (Artefacto 2)

- **Archivo:** [docs/UAT_CHECKLIST_MES_01.md](UAT_CHECKLIST_MES_01.md)
- **Formato:** 15 pasos, lenguaje no técnico, checkboxes OK/No OK, firma y observaciones.
- **Listo para sesión** con dueño (30–45 min estimados).

---

## Implementación previa no reportada (higiene de proyecto)

El backend de receta + descuento de stock **ya estaba implementado** antes de este PR:

- Endpoints `POST/PUT/DELETE /orders/:id/materials` y `POST /orders/:id/transition`.
- Lógica en `order_service.ts` (`procesarTransicionAProduccion`, reversión en cancelación).
- Tests: `order_recipe_stock.spec.ts`, `order_stock.spec.ts`, `order_state_machine.spec.ts`.

Este PR cerró únicamente la brecha de **UI frontend**; no hubo cambios de backend en el alcance de receta.

---

## Estado de PRs

| PR / bloque | Estado recomendado |
|-------------|-------------------|
| `feat/orders-web-recipe-ui` | **Mergear** tras este reporte |
| PR consolidación pre-cierre (copy ES + máquinas web + fixes) | Renombrar/descripción **“consolidación pre-cierre”** — merge cuando esté limpio |
| Cierre formal Mes 1 | **Después** de UAT firmada por dueño |

---

## Próximos pasos (Project Lead)

1. Mergear PR de receta UI.
2. Agendar sesión UAT con dueño usando `UAT_CHECKLIST_MES_01.md`.
3. Mensaje sugerido al dueño: *"Terminamos todo lo del Mes 1. Tengo lista una guía de prueba corta (~30–45 min). ¿Cuándo podés esta semana o la próxima para correrla juntos y firmar el cierre?"*
4. Tras firma UAT → acta de aceptación + cierre contractual Mes 1.

---

## Riesgos / observaciones

- Validación local usó seeders, no inventario real del dueño (no disponible).
- Smoke producción creó y eliminó datos de prueba; no quedaron residuos.
- Rotar contraseña admin post-UAT sigue recomendado.
