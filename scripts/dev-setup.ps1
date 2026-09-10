# Setup local de Nega POS (MySQL Docker + migraciones + admin)
# Uso desde la raíz del repo: .\scripts\dev-setup.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host '==> Levantando MySQL (Docker)...' -ForegroundColor Cyan
docker compose up -d mysql

Write-Host '==> Esperando MySQL (healthcheck)...' -ForegroundColor Cyan
$maxWait = 60
$waited = 0
while ($waited -lt $maxWait) {
  $status = docker inspect -f '{{.State.Health.Status}}' nega-pos-mysql 2>$null
  if ($status -eq 'healthy') { break }
  Start-Sleep -Seconds 2
  $waited += 2
}
if ($waited -ge $maxWait) {
  Write-Warning 'MySQL no reporto healthy a tiempo. Revisa: docker compose logs mysql'
}

if (-not (Test-Path 'apps\api\.env')) {
  Write-Host '==> Creando apps\api\.env desde .env.example...' -ForegroundColor Cyan
  Copy-Item 'apps\api\.env.example' 'apps\api\.env'
  Write-Warning 'Genera APP_KEY: cd apps\api; node ace generate:key'
}

if (-not (Test-Path 'apps\web\.env')) {
  Write-Host '==> Creando apps\web\.env desde .env.example...' -ForegroundColor Cyan
  Copy-Item 'apps\web\.env.example' 'apps\web\.env'
} else {
  $webEnvRaw = Get-Content 'apps\web\.env' -Raw
  if ($webEnvRaw -match 'railway\.app|nega-pos-api-production') {
    Write-Warning 'apps/web/.env apuntaba a Railway/producción — forzando http://localhost:3333'
    Set-Content -Path 'apps\web\.env' -Value "VITE_API_URL=http://localhost:3333`n" -NoNewline
  }
}

Set-Location 'apps\api'

if (-not (Select-String -Path '.env' -Pattern '^APP_KEY=.+$' -Quiet)) {
  Write-Warning 'APP_KEY vacia en apps/api/.env — ejecuta: node ace generate:key'
}

Write-Host '==> Codegen Adonis...' -ForegroundColor Cyan
node ace build --ignore-ts-errors

Write-Host '==> Migraciones...' -ForegroundColor Cyan
node ace migration:run --force

Write-Host '==> Base de datos de tests (nega_pos_test)...' -ForegroundColor Cyan
docker exec nega-pos-mysql mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS nega_pos_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL PRIVILEGES ON nega_pos_test.* TO 'nega_pos'@'%'; FLUSH PRIVILEGES;" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Warning 'No se pudo crear nega_pos_test via Docker. Ejecuta scripts/setup-mysql-local.sql como root si fallan los tests.'
}

Write-Host '==> Seed (monedas, métodos de pago, categorías, admin)...' -ForegroundColor Cyan
node ace db:seed

Set-Location $Root
Write-Host ''
Write-Host 'Listo. En terminales separadas:' -ForegroundColor Green
Write-Host '  npm run dev:api'
Write-Host '  npm run dev:web'
Write-Host ''
Write-Host 'Login local: admin@negapos.local / (ADMIN_PASSWORD en apps/api/.env)' -ForegroundColor Green
