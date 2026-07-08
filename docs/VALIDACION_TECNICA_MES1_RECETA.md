# Validación técnica — Mes 1 receta + stock

- **Fecha:** 2026-06-02T04:12:40.928Z
- **Entorno:** http://localhost:3333
- **Modo:** local
- **Resultado:** PASS (20/20 pasos OK)

## Pasos

| Paso | Resultado | Detalle |
|------|-----------|---------|
| Entorno | OK | local @ http://localhost:3333 |
| Health check | OK | status 200 |
| Login | OK | admin@negapos.local |
| Listar proveedores (seeder) | OK |  |
| Crear cliente | OK | id 1 |
| Crear 2 materiales | OK |  |
| Ajustar stock inicial | OK |  |
| Crear pedido | OK | id 1 |
| Agregar receta (2 materiales) | OK |  |
| Detalle pedido incluye receta | OK | items 2 |
| Transición a CONFIRMED | OK |  |
| Transición a IN_PRODUCTION | OK |  |
| Stock bajó al producir | OK | 500 -> 490 (esperado -10 en tela A) |
| Transición a DELIVERED | OK |  |
| Stock insuficiente devuelve 409 | OK | status 409 |
| Forzar producción sin stock | OK |  |
| Cancelación revierte stock | OK | 175 -> 195 |
| Crear máquina | OK | id 1 |
| Registrar gasto de máquina | OK |  |
| Dashboard resumen | OK | status 200 |
