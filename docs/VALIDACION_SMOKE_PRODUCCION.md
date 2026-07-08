# Validación técnica — Smoke producción

- **Fecha:** 2026-06-02T04:13:47.289Z
- **Entorno:** https://nega-pos-api-production.up.railway.app
- **Modo:** prod
- **Resultado:** PASS (10/10 pasos OK)

## Pasos

| Paso | Resultado | Detalle |
|------|-----------|---------|
| Entorno | OK | prod @ https://nega-pos-api-production.up.railway.app |
| Health check | OK | status 200 |
| Login | OK | admin@negapos.local |
| Crear cliente de prueba | OK | id 2 |
| Crear pedido borrador | OK | id 4 |
| Crear material de prueba | OK | id 3 |
| Agregar material a receta | OK |  |
| Eliminar pedido borrador (limpieza) | OK | status 200 |
| Eliminar material de prueba | OK | status 200 |
| Eliminar cliente de prueba | OK | status 200 |
