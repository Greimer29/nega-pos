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

Write-Host '==> Recreando bases nega_pos y nega_pos_test...' -ForegroundColor Cyan
docker exec nega-pos-mysql mysql -uroot -proot -e @"
DROP DATABASE IF EXISTS nega_pos;
DROP DATABASE IF EXISTS nega_pos_test;
CREATE DATABASE nega_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE nega_pos_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON nega_pos.* TO 'nega_pos'@'%';
GRANT ALL PRIVILEGES ON nega_pos_test.* TO 'nega_pos'@'%';
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

Write-Host '==> Migraciones (13 archivos consolidados)...' -ForegroundColor Cyan
node ace migration:fresh --force --seed

Set-Location $Root
Write-Host ''
Write-Host 'Base de datos limpia. Login: admin@negapos.local' -ForegroundColor Green
