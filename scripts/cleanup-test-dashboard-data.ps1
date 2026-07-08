# Elimina compras de prueba del dashboard (F-100, F-101, F-VIEJA) y datos relacionados.
# Origen: apps/api/tests/functional/dashboard.spec.ts — pueden quedar en BD dev si los tests
# corrieron contra la misma base que el entorno local.
#
# Uso (desde la raíz del repo):
#   .\scripts\cleanup-test-dashboard-data.ps1

$ErrorActionPreference = 'Stop'

$sql = @"
DELETE mi FROM movimientos_inventario mi
INNER JOIN compra_items ci ON ci.id = mi.compra_item_id
INNER JOIN compras c ON c.id = ci.compra_id
WHERE c.numero_factura IN ('F-100', 'F-101', 'F-VIEJA');

DELETE ci FROM compra_items ci
INNER JOIN compras c ON c.id = ci.compra_id
WHERE c.numero_factura IN ('F-100', 'F-101', 'F-VIEJA');

DELETE FROM compras
WHERE numero_factura IN ('F-100', 'F-101', 'F-VIEJA');

SELECT ROW_COUNT() AS compras_eliminadas;
"@

Write-Host 'Limpiando compras de prueba del dashboard (F-100, F-101, F-VIEJA)...' -ForegroundColor Cyan

docker exec -i nega-pos-mysql mysql -unega_pos -pnega_pos nega_pos -e $sql

if ($LASTEXITCODE -ne 0) {
  Write-Error 'Falló la limpieza. ¿Está corriendo MySQL? (docker compose up -d mysql)'
}

Write-Host 'Listo. Revisá el dashboard: compras del mes ya no deberían incluir datos de test.' -ForegroundColor Green
