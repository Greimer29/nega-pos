# Limpia datos smoke/test en Railway (proveedores, materiales, compras).
# La compra CONFIRMADA no se puede borrar por API — requiere SQL.
#
# Opción A (recomendada): Railway → MySQL → Data → Query
#   Pegar contenido de scripts/cleanup-railway-smoke.sql y ejecutar.
#
# Opción B: SSH en contenedor API (desde repo root, con Railway CLI):
#   railway link   # servicio nega-pos-api
#   railway ssh
#   cd /app && node /path/to/cleanup-railway-smoke.cjs
#   (copiar scripts/cleanup-railway-smoke.cjs al contenedor o usar SQL en MySQL)
#
# Opción C: Borrar solo borradores por API (no borra confirmadas):
#   DELETE /api/v1/compras/:id  (estado BORRADOR)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$sqlPath = Join-Path $Root 'scripts\cleanup-railway-smoke.sql'

Write-Host '=== Limpieza Railway — instrucciones ===' -ForegroundColor Cyan
Write-Host ''
Write-Host '1. Abri Railway → proyecto calm-embrace → MySQL → pestaña Data → Query'
Write-Host '2. Pega y ejecuta el SQL de:' -ForegroundColor Yellow
Write-Host "   $sqlPath"
Write-Host ''
Write-Host 'SQL a pegar:' -ForegroundColor Gray
Get-Content $sqlPath
Write-Host ''
Write-Host '3. Verifica en la API:' -ForegroundColor Cyan
Write-Host '   GET /api/v1/proveedores → []'
Write-Host '   GET /api/v1/compras → []'
Write-Host '   GET /api/v1/dashboard/resumen → comprasMes cantidad 0'
