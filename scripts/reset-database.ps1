# Reset completo de base de datos (después del squash de migraciones)
#
# Uso desde la raíz del repo:
#   .\scripts\reset-database.ps1
#
# Requiere MySQL Docker (nega-pos-mysql) o MySQL local con credenciales de apps/api/.env

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host '==> Levantando MySQL...' -ForegroundColor Cyan
docker compose up -d mysql 2>$null
Start-Sleep -Seconds 3

Write-Host '==> Recreando bases nega_pos, nega_pos_test y central...' -ForegroundColor Cyan
docker exec nega-pos-mysql mysql -uroot -proot -e @"
DROP DATABASE IF EXISTS nega_pos;
DROP DATABASE IF EXISTS nega_pos_test;
DROP DATABASE IF EXISTS nega_pos_central;
DROP DATABASE IF EXISTS nega_pos_central_test;
CREATE DATABASE nega_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE nega_pos_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE nega_pos_central CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE nega_pos_central_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON nega_pos.* TO 'nega_pos'@'%';
GRANT ALL PRIVILEGES ON nega_pos_test.* TO 'nega_pos'@'%';
GRANT ALL PRIVILEGES ON nega_pos_central.* TO 'nega_pos'@'%';
GRANT ALL PRIVILEGES ON nega_pos_central_test.* TO 'nega_pos'@'%';
GRANT CREATE ON *.* TO 'nega_pos'@'%';
FLUSH PRIVILEGES;
"@

if ($LASTEXITCODE -ne 0) {
  Write-Warning 'Docker no disponible. Ejecutá manualmente scripts/setup-mysql-local.sql y DROP/CREATE de nega_pos.'
}

Set-Location 'apps\api'

if (-not (Test-Path '.env')) {
  Copy-Item '.env.example' '.env'
  Write-Warning 'Generá APP_KEY: node ace generate:key'
}

Write-Host '==> Generando codegen Adonis (requerido antes de migrar)...' -ForegroundColor Cyan
node ace build --ignore-ts-errors

Write-Host '==> Migraciones tenant + central...' -ForegroundColor Cyan
node ace migration:fresh --force
node ace migration:run --connection=central --force
if ($env:MULTI_TENANT_ENABLED -eq 'true') {
  node ace db:bootstrap
} else {
  node ace db:seed --files="./database/seeders/main/index_seeder.ts"
}

Set-Location $Root
Write-Host ''
Write-Host 'Bases limpias. Multi-tenant: platform login /platform/login' -ForegroundColor Green
Write-Host 'Legacy: admin@negapos.local (si MULTI_TENANT_ENABLED=false)' -ForegroundColor Green
